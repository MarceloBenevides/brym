-- ==============================================================
-- BRYM · Migration 0009 — Despesas
-- Fase 2a. Aplicar depois da 0008, no SQL Editor.
-- ==============================================================

create table if not exists public.expenses (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  categoria  text not null,
  descricao  text,
  valor      numeric(10,2) not null check (valor >= 0),
  data       date not null default current_date,
  status     text not null default 'pendente'
               check (status in ('pago','pendente')),
  criado_em  timestamptz not null default now()
);

create index if not exists expenses_tenant_data_idx on public.expenses (tenant_id, data);

-- --------------------------------------------------------------
-- RLS — só quem tem a seção 'financeiro' (dono ou funcionário liberado)
-- --------------------------------------------------------------

alter table public.expenses enable row level security;

drop policy if exists "expenses: financeiro do tenant" on public.expenses;
create policy "expenses: financeiro do tenant"
  on public.expenses for all
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_section('financeiro'))
  with check (tenant_id = public.current_tenant_id() and public.has_section('financeiro'));
