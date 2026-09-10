-- ==============================================================
-- BRYM · Migration 0012 — Comissões (persistidas) + apuração
-- Fase 2d. Aplicar depois da 0011, no SQL Editor.
--
-- A comissão vira REGISTRO no momento em que a comanda é fechada
-- (uma linha por comanda). status: a_pagar | pago. Reabrir/excluir
-- comanda só desfaz comissão AINDA a_pagar — a que já foi paga fica
-- intacta (histórico; correção é manual).
-- ==============================================================

-- --------------------------------------------------------------
-- 1. Tabela
-- --------------------------------------------------------------

create table if not exists public.comissoes (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,
  -- vira null quando a comanda é apagada; os snapshots abaixo preservam o histórico
  comanda_id        uuid references public.comandas (id) on delete set null,
  professional_id   uuid references public.professionals (id) on delete set null,
  profissional_nome text not null,
  base_servicos     numeric(10,2) not null check (base_servicos >= 0),
  percentual        numeric(5,2) not null check (percentual >= 0 and percentual <= 100),
  valor             numeric(10,2) not null check (valor >= 0),
  status            text not null default 'a_pagar' check (status in ('a_pagar','pago')),
  fechada_em        timestamptz not null,
  pago_em           timestamptz,
  criado_em         timestamptz not null default now()
);

-- uma comissão por comanda enquanto a comanda existir
create unique index if not exists comissoes_comanda_key
  on public.comissoes (comanda_id) where comanda_id is not null;

create index if not exists comissoes_tenant_idx on public.comissoes (tenant_id, fechada_em);
create index if not exists comissoes_prof_status_idx on public.comissoes (professional_id, status);

-- --------------------------------------------------------------
-- 2. RLS
-- --------------------------------------------------------------

alter table public.comissoes enable row level security;

drop policy if exists "comissoes: gestão financeiro" on public.comissoes;
create policy "comissoes: gestão financeiro"
  on public.comissoes for all
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_section('financeiro'))
  with check (tenant_id = public.current_tenant_id() and public.has_section('financeiro'));

drop policy if exists "comissoes: ver as próprias" on public.comissoes;
create policy "comissoes: ver as próprias"
  on public.comissoes for select
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and professional_id is not null
    and professional_id = public.my_professional_id()
  );

-- --------------------------------------------------------------
-- 3. fechar_comanda — agora também gera a comissão
-- --------------------------------------------------------------

create or replace function public.fechar_comanda(p_comanda_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ap      uuid;
  v_total   numeric(10,2);
  v_pago    numeric(10,2);
  v_base    numeric(10,2);
  v_pnome   text;
  v_recebe  boolean;
  v_perc    numeric(5,2);
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

  -- comissão do profissional vinculado à comanda (só serviços)
  select coalesce(sum(quantidade * valor_unitario), 0) into v_base
  from public.comanda_items
  where comanda_id = p_comanda_id and tipo = 'servico';

  select pr.nome, pr.recebe_comissao, pr.percentual_comissao
    into v_pnome, v_recebe, v_perc
  from public.comandas c
  join public.professionals pr on pr.id = c.professional_id
  where c.id = p_comanda_id;

  if coalesce(v_recebe, false) and coalesce(v_base, 0) > 0 and coalesce(v_perc, 0) > 0 then
    insert into public.comissoes
      (tenant_id, comanda_id, professional_id, profissional_nome,
       base_servicos, percentual, valor, fechada_em)
    select c.tenant_id, c.id, c.professional_id, v_pnome,
           v_base, v_perc, round(v_base * v_perc / 100, 2), now()
    from public.comandas c
    where c.id = p_comanda_id
    on conflict (comanda_id) where comanda_id is not null
      do update set base_servicos = excluded.base_servicos,
                    percentual    = excluded.percentual,
                    valor         = excluded.valor,
                    fechada_em    = excluded.fechada_em
      where public.comissoes.status = 'a_pagar';
  end if;
end;
$$;

-- --------------------------------------------------------------
-- 4. reabrir_comanda — desfaz só comissão a_pagar
-- --------------------------------------------------------------

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

  delete from public.comissoes
  where comanda_id = p_comanda_id and status = 'a_pagar';

  update public.comandas set status = 'aberta', fechada_em = null where id = p_comanda_id;
  update public.appointments set status = 'confirmado'
  where id = v_ap and status = 'concluido';
end;
$$;

-- --------------------------------------------------------------
-- 5. Excluir comanda — some a comissão a_pagar; a paga vira histórico
-- --------------------------------------------------------------

create or replace function public.comandas_antes_de_excluir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.comissoes
  where comanda_id = old.id and status = 'a_pagar';

  update public.appointments
    set status = 'confirmado'
  where id = old.appointment_id and status = 'concluido';
  return old;
end;
$$;

-- (trigger comandas_before_delete já existe da 0010, aponta para esta função)

-- --------------------------------------------------------------
-- 6. Backfill idempotente das comandas já fechadas
-- --------------------------------------------------------------

insert into public.comissoes
  (tenant_id, comanda_id, professional_id, profissional_nome,
   base_servicos, percentual, valor, fechada_em)
select c.tenant_id, c.id, c.professional_id, pr.nome,
       s.base, pr.percentual_comissao,
       round(s.base * pr.percentual_comissao / 100, 2), c.fechada_em
from public.comandas c
join public.professionals pr
  on pr.id = c.professional_id and pr.recebe_comissao and pr.percentual_comissao > 0
join lateral (
  select coalesce(sum(quantidade * valor_unitario), 0) as base
  from public.comanda_items i
  where i.comanda_id = c.id and i.tipo = 'servico'
) s on s.base > 0
where c.status = 'fechada' and c.fechada_em is not null
on conflict (comanda_id) where comanda_id is not null do nothing;

-- --------------------------------------------------------------
-- 7. RPC de apuração
-- --------------------------------------------------------------

create or replace function public.comissoes_periodo(
  p_de              date,
  p_ate             date,
  p_professional_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_result jsonb;
begin
  if not public.has_section('financeiro') then
    if public.my_professional_id() is null
       or p_professional_id is null
       or p_professional_id <> public.my_professional_id() then
      raise exception 'Sem permissão para ver comissões.' using errcode = '42501';
    end if;
  end if;

  with base as (
    select k.id as comissao_id,
           k.professional_id,
           k.profissional_nome,
           k.percentual,
           k.base_servicos,
           k.valor,
           k.status,
           k.fechada_em,
           cl.nome as cliente_nome
    from public.comissoes k
    left join public.comandas c on c.id = k.comanda_id
    left join public.clients cl on cl.id = c.client_id
    where k.tenant_id = v_tenant
      and k.fechada_em::date between p_de and p_ate
      and (p_professional_id is null or k.professional_id = p_professional_id)
  ),
  linhas as (
    select professional_id,
           max(profissional_nome) as nome,
           max(percentual) as percentual,
           sum(base_servicos)::numeric(12,2) as faturamento,
           sum(valor)::numeric(12,2) as total,
           sum(valor) filter (where status = 'pago')::numeric(12,2) as pago,
           sum(valor) filter (where status = 'a_pagar')::numeric(12,2) as a_pagar,
           coalesce(jsonb_agg(
             jsonb_build_object(
               'comissao_id', comissao_id,
               'fechada_em', fechada_em,
               'cliente_nome', cliente_nome,
               'valor', valor,
               'status', status
             ) order by fechada_em desc
           ), '[]'::jsonb) as comandas
    from base
    group by professional_id
  )
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'professional_id', professional_id,
             'nome', nome,
             'percentual', percentual,
             'faturamento', faturamento,
             'total', total,
             'pago', coalesce(pago, 0),
             'a_pagar', coalesce(a_pagar, 0),
             'comandas', comandas
           ) order by coalesce(a_pagar, 0) desc, total desc
         ), '[]'::jsonb)
  into v_result
  from linhas;

  return v_result;
end;
$$;

revoke all on function public.comissoes_periodo(date, date, uuid) from public;
grant execute on function public.comissoes_periodo(date, date, uuid) to authenticated;

-- --------------------------------------------------------------
-- 8. RPC: marcar comissões de um profissional como pagas
-- --------------------------------------------------------------

create or replace function public.marcar_comissoes_pagas(
  p_professional_id uuid,
  p_de              date,
  p_ate             date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  if not public.has_section('financeiro') then
    raise exception 'Sem permissão para dar baixa em comissões.' using errcode = '42501';
  end if;

  update public.comissoes
  set status = 'pago', pago_em = now()
  where tenant_id = public.current_tenant_id()
    and professional_id = p_professional_id
    and status = 'a_pagar'
    and fechada_em::date between p_de and p_ate;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.marcar_comissoes_pagas(uuid, date, date) from public;
grant execute on function public.marcar_comissoes_pagas(uuid, date, date) to authenticated;
