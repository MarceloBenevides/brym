-- ==============================================================
-- BRYM · Migration 0017 — Aniversariantes
-- Fase 3e. Aplicar depois da 0016, no SQL Editor.
--
-- clients.aniversario_dia/mes (0004) e tenant_settings.mensagem_aniversario
-- (0001) já existem. Aqui: DDI configurável (pro link do WhatsApp) + rastreio
-- de quem já foi parabenizado no ano.
-- ==============================================================

-- --------------------------------------------------------------
-- 1. DDI do negócio (código do país p/ o link do WhatsApp)
-- --------------------------------------------------------------
alter table public.tenant_settings
  add column if not exists ddi text not null default '55';

-- --------------------------------------------------------------
-- 2. Rastreio de felicitações
-- --------------------------------------------------------------
create table if not exists public.felicitacoes (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  client_id  uuid not null references public.clients (id) on delete cascade,
  ano        integer not null,
  criado_por uuid references public.profiles (id) on delete set null,
  criado_em  timestamptz not null default now(),
  unique (client_id, ano)
);

create index if not exists felicitacoes_tenant_ano_idx
  on public.felicitacoes (tenant_id, ano);

alter table public.felicitacoes enable row level security;

drop policy if exists "felicitacoes: gerenciar com permissão" on public.felicitacoes;
create policy "felicitacoes: gerenciar com permissão"
  on public.felicitacoes for all
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_section('aniversarios'))
  with check (tenant_id = public.current_tenant_id() and public.has_section('aniversarios'));
