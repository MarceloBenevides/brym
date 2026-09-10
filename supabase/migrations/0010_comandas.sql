-- ==============================================================
-- BRYM · Migration 0010 — Comandas, itens e pagamentos
-- Fase 2b. Aplicar depois da 0009, no SQL Editor.
--
-- Uma comanda SEMPRE nasce de um agendamento (1:1). Itens = só serviços
-- por enquanto. Pagamento pode ter várias formas na mesma comanda.
-- ==============================================================

-- --------------------------------------------------------------
-- 1. Tabelas
-- --------------------------------------------------------------

create table if not exists public.comandas (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  appointment_id  uuid not null unique references public.appointments (id) on delete cascade,
  client_id       uuid references public.clients (id) on delete set null,
  professional_id uuid references public.professionals (id) on delete set null,
  status          text not null default 'aberta' check (status in ('aberta','fechada')),
  aberta_em       timestamptz not null default now(),
  fechada_em      timestamptz,
  criado_em       timestamptz not null default now()
);

create index if not exists comandas_tenant_idx on public.comandas (tenant_id, aberta_em);
create index if not exists comandas_professional_idx on public.comandas (professional_id);

create table if not exists public.comanda_items (
  id              uuid primary key default gen_random_uuid(),
  comanda_id      uuid not null references public.comandas (id) on delete cascade,
  tipo            text not null default 'servico' check (tipo in ('servico','produto','pacote')),
  service_id      uuid references public.services (id) on delete set null,
  descricao       text not null,
  quantidade      integer not null default 1 check (quantidade > 0),
  valor_unitario  numeric(10,2) not null check (valor_unitario >= 0),
  criado_em       timestamptz not null default now()
);

create index if not exists comanda_items_comanda_idx on public.comanda_items (comanda_id);

create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  comanda_id  uuid not null references public.comandas (id) on delete cascade,
  -- snapshot do cliente: usado para devolver saldo mesmo quando a comanda já
  -- foi apagada (o cascade remove a comanda antes de disparar este trigger).
  client_id   uuid references public.clients (id) on delete set null,
  forma       text not null check (forma in ('pix','debito','credito','dinheiro','saldo')),
  valor       numeric(10,2) not null check (valor > 0),
  criado_em   timestamptz not null default now()
);

alter table public.payments
  add column if not exists client_id uuid references public.clients (id) on delete set null;

create index if not exists payments_comanda_idx on public.payments (comanda_id);

-- --------------------------------------------------------------
-- 2. Helper de permissão
--    dono/financeiro gerenciam qualquer comanda; o profissional
--    vinculado gerencia as próprias.
-- --------------------------------------------------------------

create or replace function public.pode_gerenciar_comanda(p_comanda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.comandas c
    where c.id = p_comanda_id
      and c.tenant_id = public.current_tenant_id()
      and (
        public.has_section('financeiro')
        or c.professional_id = public.my_professional_id()
      )
  )
$$;

revoke all on function public.pode_gerenciar_comanda(uuid) from public;
grant execute on function public.pode_gerenciar_comanda(uuid) to authenticated;

-- --------------------------------------------------------------
-- 3. RLS
-- --------------------------------------------------------------

alter table public.comandas       enable row level security;
alter table public.comanda_items  enable row level security;
alter table public.payments       enable row level security;

drop policy if exists "comandas: financeiro ou próprio profissional" on public.comandas;
create policy "comandas: financeiro ou próprio profissional"
  on public.comandas for all
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.has_section('financeiro')
      or professional_id = public.my_professional_id()
    )
  )
  with check (
    tenant_id = public.current_tenant_id()
    and (
      public.has_section('financeiro')
      or professional_id = public.my_professional_id()
    )
  );

drop policy if exists "comanda_items: da comanda gerenciável" on public.comanda_items;
create policy "comanda_items: da comanda gerenciável"
  on public.comanda_items for all
  to authenticated
  using (public.pode_gerenciar_comanda(comanda_id))
  with check (public.pode_gerenciar_comanda(comanda_id));

drop policy if exists "payments: da comanda gerenciável" on public.payments;
create policy "payments: da comanda gerenciável"
  on public.payments for all
  to authenticated
  using (public.pode_gerenciar_comanda(comanda_id))
  with check (public.pode_gerenciar_comanda(comanda_id));

-- --------------------------------------------------------------
-- 4. Saldo na casa: pagamento com forma 'saldo' movimenta clients.saldo_credito
--    O client_id é gravado no próprio pagamento (BEFORE INSERT) para que a
--    devolução (AFTER DELETE) funcione mesmo com a comanda já apagada.
-- --------------------------------------------------------------

create or replace function public.payments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo numeric(10,2);
begin
  select client_id into new.client_id from public.comandas where id = new.comanda_id;

  if new.forma = 'saldo' then
    if new.client_id is null then
      raise exception 'Comanda sem cliente: não dá para pagar com saldo.'
        using errcode = '22023';
    end if;
    select saldo_credito into v_saldo from public.clients where id = new.client_id for update;
    if coalesce(v_saldo, 0) + 0.005 < new.valor then
      raise exception 'Saldo insuficiente na casa (disponível: %).', coalesce(v_saldo, 0)
        using errcode = '22023';
    end if;
    update public.clients set saldo_credito = saldo_credito - new.valor where id = new.client_id;
  end if;

  return new;
end;
$$;

create or replace function public.payments_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.forma = 'saldo' and old.client_id is not null then
    update public.clients set saldo_credito = saldo_credito + old.valor where id = old.client_id;
  end if;
  return old;
end;
$$;

drop trigger if exists payments_saldo_ins on public.payments;
drop trigger if exists payments_saldo_del on public.payments;

drop trigger if exists payments_bi on public.payments;
create trigger payments_bi
  before insert on public.payments
  for each row execute function public.payments_before_insert();

drop trigger if exists payments_ad on public.payments;
create trigger payments_ad
  after delete on public.payments
  for each row execute function public.payments_after_delete();

-- backfill (idempotente) para pagamentos criados antes desta coluna existir
update public.payments p
   set client_id = c.client_id
  from public.comandas c
 where c.id = p.comanda_id and p.client_id is null;

-- --------------------------------------------------------------
-- 5. Excluir comanda → agendamento volta a 'confirmado'
-- --------------------------------------------------------------

create or replace function public.comandas_antes_de_excluir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.appointments
    set status = 'confirmado'
  where id = old.appointment_id and status = 'concluido';
  return old;
end;
$$;

drop trigger if exists comandas_before_delete on public.comandas;
create trigger comandas_before_delete
  before delete on public.comandas
  for each row execute function public.comandas_antes_de_excluir();

-- --------------------------------------------------------------
-- 6. RPCs
-- --------------------------------------------------------------

create or replace function public.abrir_comanda(p_appointment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ap        record;
  v_comanda   uuid;
  v_serv      record;
begin
  select a.id, a.tenant_id, a.client_id, a.professional_id, a.service_id, a.status
    into v_ap
  from public.appointments a
  where a.id = p_appointment_id;

  if not found or v_ap.tenant_id <> public.current_tenant_id() then
    raise exception 'Agendamento não encontrado.' using errcode = '22023';
  end if;

  if not (
    public.has_section('financeiro')
    or (
      public.my_professional_id() is not null
      and v_ap.professional_id = public.my_professional_id()
    )
  ) then
    raise exception 'Sem permissão para abrir a comanda.' using errcode = '42501';
  end if;

  select id into v_comanda from public.comandas where appointment_id = p_appointment_id;
  if found then
    return v_comanda;
  end if;

  insert into public.comandas (tenant_id, appointment_id, client_id, professional_id)
  values (v_ap.tenant_id, v_ap.id, v_ap.client_id, v_ap.professional_id)
  returning id into v_comanda;

  if v_ap.service_id is not null then
    select nome, preco into v_serv from public.services where id = v_ap.service_id;
    if found then
      insert into public.comanda_items (comanda_id, tipo, service_id, descricao, quantidade, valor_unitario)
      values (v_comanda, 'servico', v_ap.service_id, v_serv.nome, 1, coalesce(v_serv.preco, 0));
    end if;
  end if;

  return v_comanda;
end;
$$;

revoke all on function public.abrir_comanda(uuid) from public;
grant execute on function public.abrir_comanda(uuid) to authenticated;

create or replace function public.fechar_comanda(p_comanda_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ap       uuid;
  v_total    numeric(10,2);
  v_pago     numeric(10,2);
begin
  if not public.pode_gerenciar_comanda(p_comanda_id) then
    raise exception 'Sem permissão para esta comanda.' using errcode = '42501';
  end if;

  select appointment_id into v_ap from public.comandas
  where id = p_comanda_id and status = 'aberta';
  if not found then
    raise exception 'Comanda não está aberta.' using errcode = '22023';
  end if;

  select coalesce(sum(quantidade * valor_unitario), 0) into v_total
  from public.comanda_items where comanda_id = p_comanda_id;
  select coalesce(sum(valor), 0) into v_pago
  from public.payments where comanda_id = p_comanda_id;

  if v_pago + 0.005 < v_total then
    raise exception 'Falta registrar pagamento (total %, pago %).', v_total, v_pago
      using errcode = '22023';
  end if;

  update public.comandas set status = 'fechada', fechada_em = now() where id = p_comanda_id;
  update public.appointments set status = 'concluido'
  where id = v_ap and status <> 'cancelado';
end;
$$;

revoke all on function public.fechar_comanda(uuid) from public;
grant execute on function public.fechar_comanda(uuid) to authenticated;

create or replace function public.reabrir_comanda(p_comanda_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ap uuid;
begin
  select appointment_id into v_ap from public.comandas
  where id = p_comanda_id and tenant_id = public.current_tenant_id() and status = 'fechada';
  if not found then
    raise exception 'Comanda fechada não encontrada.' using errcode = '22023';
  end if;

  if not public.has_section('financeiro') then
    raise exception 'Só o dono ou um funcionário com acesso ao Financeiro pode reabrir.'
      using errcode = '42501';
  end if;

  update public.comandas set status = 'aberta', fechada_em = null where id = p_comanda_id;
  update public.appointments set status = 'confirmado'
  where id = v_ap and status = 'concluido';
end;
$$;

revoke all on function public.reabrir_comanda(uuid) from public;
grant execute on function public.reabrir_comanda(uuid) to authenticated;
