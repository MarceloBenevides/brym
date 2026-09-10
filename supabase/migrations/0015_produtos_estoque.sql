-- ==============================================================
-- BRYM · Migration 0015 — Produtos + controle de estoque
-- Fase 3b. Aplicar depois da 0014, no SQL Editor.
--
-- Estoque segue o item da comanda: adicionar produto tira do estoque
-- (bloqueia se faltar), remover/excluir a comanda devolve. Reabrir não
-- mexe. Todo movimento fica registrado em estoque_movimentos.
-- Produto NÃO gera comissão (fechar_comanda já só olha tipo='servico').
-- ==============================================================

-- --------------------------------------------------------------
-- 1. Tabelas
-- --------------------------------------------------------------

create table if not exists public.product_categories (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  nome       text not null,
  criado_em  timestamptz not null default now(),
  unique (tenant_id, nome)
);

create index if not exists product_categories_tenant_idx
  on public.product_categories (tenant_id);

create table if not exists public.products (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,
  category_id         uuid references public.product_categories (id) on delete set null,
  nome                text not null,
  marca               text,
  codigo              text,
  preco               numeric(10,2) not null default 0 check (preco >= 0),
  controla_estoque    boolean not null default true,
  estoque_min         integer not null default 0 check (estoque_min >= 0),
  estoque_atual       integer not null default 0,
  comissao_percentual numeric(5,2) not null default 0
                        check (comissao_percentual >= 0 and comissao_percentual <= 100),
  ativo               boolean not null default true,
  criado_em           timestamptz not null default now()
);

create index if not exists products_tenant_idx on public.products (tenant_id, ativo);
create index if not exists products_category_idx on public.products (category_id);

create table if not exists public.estoque_movimentos (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  tipo        text not null
                check (tipo in ('entrada','saida','venda','devolucao','ajuste')),
  quantidade  integer not null check (quantidade > 0),
  saldo_apos  integer,
  motivo      text,
  comanda_id  uuid references public.comandas (id) on delete set null,
  criado_por  uuid references public.profiles (id) on delete set null,
  criado_em   timestamptz not null default now()
);

create index if not exists estoque_movimentos_produto_idx
  on public.estoque_movimentos (tenant_id, product_id, criado_em desc);

-- --------------------------------------------------------------
-- 2. comanda_items ganha product_id
-- --------------------------------------------------------------

alter table public.comanda_items
  add column if not exists product_id uuid references public.products (id) on delete set null;

-- --------------------------------------------------------------
-- 3. RLS (mesmo padrão de services / service_categories)
-- --------------------------------------------------------------

alter table public.product_categories  enable row level security;
alter table public.products            enable row level security;
alter table public.estoque_movimentos  enable row level security;

drop policy if exists "product_categories: ver do tenant" on public.product_categories;
create policy "product_categories: ver do tenant"
  on public.product_categories for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists "product_categories: gerenciar com permissão" on public.product_categories;
create policy "product_categories: gerenciar com permissão"
  on public.product_categories for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_section('produtos'))
  with check (tenant_id = public.current_tenant_id() and public.has_section('produtos'));

drop policy if exists "products: ver do tenant" on public.products;
create policy "products: ver do tenant"
  on public.products for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists "products: gerenciar com permissão" on public.products;
create policy "products: gerenciar com permissão"
  on public.products for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_section('produtos'))
  with check (tenant_id = public.current_tenant_id() and public.has_section('produtos'));

drop policy if exists "estoque_movimentos: ver com permissão" on public.estoque_movimentos;
create policy "estoque_movimentos: ver com permissão"
  on public.estoque_movimentos for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_section('produtos'));
-- inserção só via trigger / RPC (SECURITY DEFINER)

-- --------------------------------------------------------------
-- 4. Triggers de estoque em comanda_items
-- --------------------------------------------------------------

create or replace function public.comanda_items_estoque_antes_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant   uuid;
  v_nome     text;
  v_controla boolean;
  v_atual    integer;
begin
  if new.tipo <> 'produto' or new.product_id is null then
    return new;
  end if;

  select tenant_id, nome, controla_estoque, estoque_atual
    into v_tenant, v_nome, v_controla, v_atual
  from public.products where id = new.product_id for update;

  if not found then
    raise exception 'Produto não encontrado.' using errcode = '22023';
  end if;

  if v_controla then
    if v_atual < new.quantidade then
      raise exception 'Estoque insuficiente de %: % em estoque.', v_nome, v_atual
        using errcode = '22023';
    end if;
    update public.products
      set estoque_atual = estoque_atual - new.quantidade
      where id = new.product_id;
    insert into public.estoque_movimentos
      (tenant_id, product_id, tipo, quantidade, saldo_apos, comanda_id, criado_por)
    values
      (v_tenant, new.product_id, 'venda', new.quantidade,
       v_atual - new.quantidade, new.comanda_id, (select auth.uid()));
  end if;

  return new;
end;
$$;

create or replace function public.comanda_items_estoque_apos_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant   uuid;
  v_controla boolean;
  v_atual    integer;
begin
  if old.tipo <> 'produto' or old.product_id is null then
    return old;
  end if;

  select tenant_id, controla_estoque, estoque_atual
    into v_tenant, v_controla, v_atual
  from public.products where id = old.product_id for update;

  if not found then
    return old; -- produto já apagado
  end if;

  if v_controla then
    update public.products
      set estoque_atual = estoque_atual + old.quantidade
      where id = old.product_id;
    insert into public.estoque_movimentos
      (tenant_id, product_id, tipo, quantidade, saldo_apos, comanda_id, criado_por)
    values
      (v_tenant, old.product_id, 'devolucao', old.quantidade,
       v_atual + old.quantidade,
       (select id from public.comandas where id = old.comanda_id),
       (select auth.uid()));
  end if;

  return old;
end;
$$;

drop trigger if exists comanda_items_estoque_bi on public.comanda_items;
create trigger comanda_items_estoque_bi
  before insert on public.comanda_items
  for each row execute function public.comanda_items_estoque_antes_insert();

drop trigger if exists comanda_items_estoque_ad on public.comanda_items;
create trigger comanda_items_estoque_ad
  after delete on public.comanda_items
  for each row execute function public.comanda_items_estoque_apos_delete();

-- --------------------------------------------------------------
-- 5. RPC: ajuste manual de estoque
-- --------------------------------------------------------------

create or replace function public.ajustar_estoque(
  p_product_id  uuid,
  p_tipo        text,
  p_quantidade  integer,
  p_motivo      text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant   uuid := public.current_tenant_id();
  v_controla boolean;
  v_atual    integer;
  v_novo     integer;
  v_delta    integer;
  v_tipo     text;
begin
  if not public.has_section('produtos') then
    raise exception 'Sem permissão para ajustar estoque.' using errcode = '42501';
  end if;
  if p_tipo not in ('entrada','saida','ajuste') then
    raise exception 'Tipo de movimento inválido.' using errcode = '22023';
  end if;
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade precisa ser maior que zero.' using errcode = '22023';
  end if;

  select controla_estoque, estoque_atual into v_controla, v_atual
  from public.products
  where id = p_product_id and tenant_id = v_tenant
  for update;

  if not found then
    raise exception 'Produto não encontrado.' using errcode = '22023';
  end if;
  if not v_controla then
    raise exception 'Este produto não controla estoque.' using errcode = '22023';
  end if;

  if p_tipo = 'entrada' then
    v_novo := v_atual + p_quantidade;
    v_delta := p_quantidade;
    v_tipo := 'entrada';
  elsif p_tipo = 'saida' then
    if v_atual < p_quantidade then
      raise exception 'Estoque insuficiente: % em estoque.', v_atual using errcode = '22023';
    end if;
    v_novo := v_atual - p_quantidade;
    v_delta := p_quantidade;
    v_tipo := 'saida';
  else -- ajuste: p_quantidade é o novo saldo absoluto
    v_novo := p_quantidade;
    v_delta := abs(p_quantidade - v_atual);
    v_tipo := 'ajuste';
    if v_delta = 0 then
      return v_atual; -- nada a fazer
    end if;
  end if;

  update public.products set estoque_atual = v_novo where id = p_product_id;

  insert into public.estoque_movimentos
    (tenant_id, product_id, tipo, quantidade, saldo_apos, motivo, criado_por)
  values
    (v_tenant, p_product_id, v_tipo, v_delta, v_novo,
     nullif(btrim(coalesce(p_motivo, '')), ''), (select auth.uid()));

  return v_novo;
end;
$$;

revoke all on function public.ajustar_estoque(uuid, text, integer, text) from public;
grant execute on function public.ajustar_estoque(uuid, text, integer, text) to authenticated;

-- --------------------------------------------------------------
-- 6. relatorio_vendas — separa serviço x produto
-- --------------------------------------------------------------

create or replace function public.relatorio_vendas(
  p_de              date,
  p_ate             date,
  p_service_id      uuid default null,
  p_professional_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_result jsonb;
begin
  if not public.has_section('financeiro') then
    if public.my_professional_id() is null
       or p_professional_id is null
       or p_professional_id <> public.my_professional_id() then
      raise exception 'Sem permissão para ver este relatório.' using errcode = '42501';
    end if;
  end if;

  with itens as (
    select c.id as comanda_id,
           c.client_id,
           c.fechada_em::date as dia,
           i.tipo,
           coalesce(s.nome, i.descricao) as item_nome,
           i.quantidade,
           i.valor_unitario
    from public.comandas c
    join public.comanda_items i on i.comanda_id = c.id
    left join public.services s on s.id = i.service_id
    where c.tenant_id = v_tenant
      and c.status = 'fechada'
      and c.fechada_em::date between p_de and p_ate
      and (p_professional_id is null or c.professional_id = p_professional_id)
      and (p_service_id is null or i.service_id = p_service_id)
  ),
  tot as (
    select coalesce(sum(quantidade * valor_unitario), 0)::numeric(12,2) as total,
           count(distinct comanda_id) as num,
           count(distinct client_id) filter (where client_id is not null) as num_clientes,
           coalesce(sum(quantidade) filter (where tipo = 'servico'), 0) as num_servicos,
           coalesce(sum(quantidade) filter (where tipo = 'produto'), 0) as num_produtos,
           coalesce(sum(quantidade * valor_unitario) filter (where tipo = 'produto'), 0)::numeric(12,2) as total_produtos
    from itens
  ),
  por_dia as (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.dia), '[]'::jsonb) as j
    from (
      select dia, sum(quantidade * valor_unitario)::numeric(12,2) as valor
      from itens group by dia
    ) x
  ),
  por_servico as (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.valor desc), '[]'::jsonb) as j
    from (
      select item_nome as nome,
             sum(quantidade) as qtd,
             sum(quantidade * valor_unitario)::numeric(12,2) as valor
      from itens where tipo = 'servico' group by item_nome
    ) x
  ),
  por_produto as (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.valor desc), '[]'::jsonb) as j
    from (
      select item_nome as nome,
             sum(quantidade) as qtd,
             sum(quantidade * valor_unitario)::numeric(12,2) as valor
      from itens where tipo = 'produto' group by item_nome
    ) x
  ),
  por_pagamento as (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.valor desc), '[]'::jsonb) as j
    from (
      select pm.forma, sum(pm.valor)::numeric(12,2) as valor
      from public.payments pm
      join public.comandas c on c.id = pm.comanda_id
      where p_service_id is null
        and c.tenant_id = v_tenant
        and c.status = 'fechada'
        and c.fechada_em::date between p_de and p_ate
        and (p_professional_id is null or c.professional_id = p_professional_id)
      group by pm.forma
    ) x
  )
  select jsonb_build_object(
    'total', tot.total,
    'num_comandas', tot.num,
    'num_clientes', tot.num_clientes,
    'num_servicos', tot.num_servicos,
    'num_produtos', tot.num_produtos,
    'total_produtos', tot.total_produtos,
    'ticket_medio', case when tot.num > 0 then round(tot.total / tot.num, 2) else 0 end,
    'por_dia', por_dia.j,
    'por_servico', por_servico.j,
    'por_produto', por_produto.j,
    'por_pagamento', por_pagamento.j
  )
  into v_result
  from tot, por_dia, por_servico, por_produto, por_pagamento;

  return v_result;
end;
$$;

revoke all on function public.relatorio_vendas(date, date, uuid, uuid) from public;
grant execute on function public.relatorio_vendas(date, date, uuid, uuid) to authenticated;
