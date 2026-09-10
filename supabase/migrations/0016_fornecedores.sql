-- ==============================================================
-- BRYM · Migration 0016 — Fornecedores
-- Fase 3c. Aplicar depois da 0015, no SQL Editor.
--
-- Cadastro de fornecedores + amarração leve com as entradas de
-- estoque: estoque_movimentos ganha supplier_id, preenchido só nas
-- entradas via ajustar_estoque(..., p_supplier_id).
-- ==============================================================

-- --------------------------------------------------------------
-- 1. Tabela
-- --------------------------------------------------------------

create table if not exists public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  nome        text not null,
  telefone    text,
  email       text,
  observacoes text,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create index if not exists suppliers_tenant_idx on public.suppliers (tenant_id, ativo);

-- --------------------------------------------------------------
-- 2. RLS (mesmo padrão de services)
-- --------------------------------------------------------------

alter table public.suppliers enable row level security;

drop policy if exists "suppliers: ver do tenant" on public.suppliers;
create policy "suppliers: ver do tenant"
  on public.suppliers for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists "suppliers: gerenciar com permissão" on public.suppliers;
create policy "suppliers: gerenciar com permissão"
  on public.suppliers for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_section('fornecedores'))
  with check (tenant_id = public.current_tenant_id() and public.has_section('fornecedores'));

-- --------------------------------------------------------------
-- 3. estoque_movimentos ganha supplier_id
-- --------------------------------------------------------------

alter table public.estoque_movimentos
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;

-- --------------------------------------------------------------
-- 4. ajustar_estoque — parâmetro p_supplier_id (só vale na entrada)
-- --------------------------------------------------------------

drop function if exists public.ajustar_estoque(uuid, text, integer, text);

create or replace function public.ajustar_estoque(
  p_product_id  uuid,
  p_tipo        text,
  p_quantidade  integer,
  p_motivo      text default null,
  p_supplier_id uuid default null
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

  if p_supplier_id is not null and not exists (
    select 1 from public.suppliers where id = p_supplier_id and tenant_id = v_tenant
  ) then
    raise exception 'Fornecedor não encontrado.' using errcode = '22023';
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
      return v_atual;
    end if;
  end if;

  update public.products set estoque_atual = v_novo where id = p_product_id;

  insert into public.estoque_movimentos
    (tenant_id, product_id, tipo, quantidade, saldo_apos, motivo, supplier_id, criado_por)
  values
    (v_tenant, p_product_id, v_tipo, v_delta, v_novo,
     nullif(btrim(coalesce(p_motivo, '')), ''),
     case when v_tipo = 'entrada' then p_supplier_id else null end,
     (select auth.uid()));

  return v_novo;
end;
$$;

revoke all on function public.ajustar_estoque(uuid, text, integer, text, uuid) from public;
grant execute on function public.ajustar_estoque(uuid, text, integer, text, uuid) to authenticated;
