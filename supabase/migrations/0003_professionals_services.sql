-- ==============================================================
-- BRYM · Migration 0003 — Profissionais e Serviços
-- Fase 1b-i. Aplicar depois da 0002, no SQL Editor.
-- ==============================================================

-- --------------------------------------------------------------
-- 1. Helper: o usuário logado pode gerenciar a seção?
--    (dono sempre pode; funcionário só se tiver a permissão)
-- --------------------------------------------------------------

create or replace function public.has_section(p_secao text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_owner() or exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and p_secao = any(permissoes)
  )
$$;

revoke all on function public.has_section(text) from public;
grant execute on function public.has_section(text) to authenticated;

-- --------------------------------------------------------------
-- 2. Profissionais
-- --------------------------------------------------------------

create table if not exists public.professionals (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references public.tenants (id) on delete cascade,
  user_id                uuid references public.profiles (id) on delete set null,
  nome                   text not null,
  telefone               text,
  cargo                  text,
  recebe_comissao        boolean not null default false,
  percentual_comissao    numeric(5,2) not null default 0
                           check (percentual_comissao >= 0 and percentual_comissao <= 100),
  mostrar_no_link_online boolean not null default true,
  ativo                  boolean not null default true,
  criado_em              timestamptz not null default now()
);

create index if not exists professionals_tenant_id_idx on public.professionals (tenant_id);

alter table public.professionals enable row level security;

drop policy if exists "professionals: ver do tenant" on public.professionals;
create policy "professionals: ver do tenant"
  on public.professionals for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists "professionals: dono gerencia" on public.professionals;
create policy "professionals: dono gerencia"
  on public.professionals for all
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_owner())
  with check (tenant_id = public.current_tenant_id() and public.is_owner());

-- --------------------------------------------------------------
-- 3. Serviços
-- --------------------------------------------------------------

create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  category_id  uuid references public.service_categories (id) on delete set null,
  nome         text not null,
  duracao_min  integer not null check (duracao_min > 0 and duracao_min <= 1440),
  preco        numeric(10,2) not null default 0 check (preco >= 0),
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now()
);

create index if not exists services_tenant_id_idx on public.services (tenant_id);
create index if not exists services_category_id_idx on public.services (category_id);

alter table public.services enable row level security;

drop policy if exists "services: ver do tenant" on public.services;
create policy "services: ver do tenant"
  on public.services for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists "services: gerenciar com permissão" on public.services;
create policy "services: gerenciar com permissão"
  on public.services for all
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_section('servicos'))
  with check (tenant_id = public.current_tenant_id() and public.has_section('servicos'));

-- --------------------------------------------------------------
-- 4. service_categories — escrita passa a exigir a permissão 'servicos'
--    (leitura continua para qualquer membro do tenant)
-- --------------------------------------------------------------

drop policy if exists "service_categories: do tenant" on public.service_categories;

drop policy if exists "service_categories: ver do tenant" on public.service_categories;
create policy "service_categories: ver do tenant"
  on public.service_categories for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists "service_categories: gerenciar com permissão" on public.service_categories;
create policy "service_categories: gerenciar com permissão"
  on public.service_categories for all
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_section('servicos'))
  with check (tenant_id = public.current_tenant_id() and public.has_section('servicos'));
