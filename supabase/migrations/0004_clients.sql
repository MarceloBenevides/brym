-- ==============================================================
-- BRYM · Migration 0004 — Clientes
-- Fase 1b-ii. Aplicar depois da 0003, no SQL Editor.
-- ==============================================================

create table if not exists public.clients (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  nome           text not null,
  telefone       text,
  email          text,
  aniversario_dia   smallint check (aniversario_dia between 1 and 31),
  aniversario_mes   smallint check (aniversario_mes between 1 and 12),
  observacoes    text,
  saldo_credito  numeric(10,2) not null default 0,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now()
);

create index if not exists clients_tenant_id_idx on public.clients (tenant_id);
create index if not exists clients_nome_idx on public.clients (tenant_id, lower(nome));
create index if not exists clients_telefone_idx
  on public.clients (tenant_id, telefone) where telefone is not null;

-- --------------------------------------------------------------
-- Telefone único por tenant — respeitando a config do negócio
-- --------------------------------------------------------------

create or replace function public.clients_check_telefone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_permite boolean;
begin
  if new.telefone is null or btrim(new.telefone) = '' then
    return new;
  end if;

  select coalesce(permitir_cliente_mesmo_telefone, false)
    into v_permite
  from public.tenant_settings
  where tenant_id = new.tenant_id;

  if v_permite then
    return new;
  end if;

  if exists (
    select 1 from public.clients c
    where c.tenant_id = new.tenant_id
      and c.id <> new.id
      and c.ativo
      and regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g')
          = regexp_replace(new.telefone, '\D', '', 'g')
  ) then
    raise exception 'Já existe um cliente com esse telefone.'
      using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists clients_telefone_unico on public.clients;
create trigger clients_telefone_unico
  before insert or update of telefone, tenant_id on public.clients
  for each row execute function public.clients_check_telefone();

-- --------------------------------------------------------------
-- RLS — leitura para qualquer membro do tenant (a agenda precisa);
--       escrita só para quem tem a seção 'clientes'.
-- --------------------------------------------------------------

alter table public.clients enable row level security;

drop policy if exists "clients: ver do tenant" on public.clients;
create policy "clients: ver do tenant"
  on public.clients for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists "clients: gerenciar com permissão" on public.clients;
create policy "clients: gerenciar com permissão"
  on public.clients for all
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_section('clientes'))
  with check (tenant_id = public.current_tenant_id() and public.has_section('clientes'));
