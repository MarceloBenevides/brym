-- ==============================================================
-- BRYM · Migration 0001 — Núcleo multi-tenant + autenticação do dono
-- Fase 1a-i da especificação.
--
-- Como aplicar (projeto Supabase cloud):
--   1. Abra o SQL Editor do seu projeto.
--   2. Cole este arquivo inteiro e clique em "Run".
--   3. (Opcional, recomendado p/ dev) Authentication → Providers → Email:
--      desligue "Confirm email" enquanto estiver desenvolvendo.
--
-- Idempotente o suficiente para rodar de novo em um projeto limpo.
-- ==============================================================

-- --------------------------------------------------------------
-- 1. Tabelas
-- --------------------------------------------------------------

create table if not exists public.tenants (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  slug              text not null unique,
  segmento          text not null
                      check (segmento in ('barbearia','salao','clinica','estudio','outro')),
  telefone          text,
  endereco          text,
  plano_assinatura  text not null default 'trial',
  status_assinatura text not null default 'trial'
                      check (status_assinatura in ('trial','ativo','suspenso','cancelado')),
  trial_expira_em   timestamptz not null default (now() + interval '14 days'),
  criado_em         timestamptz not null default now()
);

-- Pessoas com acesso (dono/funcionário). Espelha auth.users.
-- Obs.: a spec chama esta tabela de "users"; aqui é "profiles" para
-- não colidir com o schema auth.users do Supabase.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  tenant_id  uuid references public.tenants (id) on delete cascade,
  nome       text not null default '',
  email      text,
  telefone   text,
  papel      text not null default 'owner'
               check (papel in ('owner','employee','client')),
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

create index if not exists profiles_tenant_id_idx on public.profiles (tenant_id);

create table if not exists public.tenant_settings (
  tenant_id                        uuid primary key
                                     references public.tenants (id) on delete cascade,
  permitir_cliente_mesmo_telefone  boolean not null default false,
  controlar_dinheiro_caixa         boolean not null default false,
  exibir_comandas_pendentes        boolean not null default true,
  habilitar_pacotes                boolean not null default true,
  habilitar_estoque                boolean not null default true,
  habilitar_fornecedores           boolean not null default true,
  intervalo_agendamento_min        integer not null default 30
                                     check (intervalo_agendamento_min between 5 and 240),
  mensagem_aniversario             text,
  mensagem_confirmacao             text
);

create table if not exists public.service_categories (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  nome       text not null,
  criado_em  timestamptz not null default now(),
  unique (tenant_id, nome)
);

create index if not exists service_categories_tenant_id_idx
  on public.service_categories (tenant_id);

-- --------------------------------------------------------------
-- 2. Helper: tenant do usuário logado
--    SECURITY DEFINER + owner = postgres  ->  não dispara RLS de profiles
--    (evita recursão infinita nas políticas).
-- --------------------------------------------------------------

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tenant_id
  from public.profiles
  where id = (select auth.uid())
$$;

revoke all on function public.current_tenant_id() from public;
grant execute on function public.current_tenant_id() to authenticated;

-- --------------------------------------------------------------
-- 3. Row Level Security
-- --------------------------------------------------------------

alter table public.tenants            enable row level security;
alter table public.profiles           enable row level security;
alter table public.tenant_settings    enable row level security;
alter table public.service_categories enable row level security;

-- profiles ----------------------------------------------------
drop policy if exists "profiles: ver o próprio" on public.profiles;
create policy "profiles: ver o próprio"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles: ver colegas do tenant" on public.profiles;
create policy "profiles: ver colegas do tenant"
  on public.profiles for select
  to authenticated
  using (tenant_id is not null and tenant_id = public.current_tenant_id());

drop policy if exists "profiles: editar o próprio" on public.profiles;
create policy "profiles: editar o próprio"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- tenants ---------------------------------------------------
drop policy if exists "tenants: ver o próprio" on public.tenants;
create policy "tenants: ver o próprio"
  on public.tenants for select
  to authenticated
  using (id = public.current_tenant_id());

drop policy if exists "tenants: dono edita" on public.tenants;
create policy "tenants: dono edita"
  on public.tenants for update
  to authenticated
  using (
    id = public.current_tenant_id()
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.papel = 'owner'
    )
  )
  with check (id = public.current_tenant_id());

-- tenant_settings -----------------------------------------
drop policy if exists "tenant_settings: do tenant" on public.tenant_settings;
create policy "tenant_settings: do tenant"
  on public.tenant_settings for all
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- service_categories -------------------------------------
drop policy if exists "service_categories: do tenant" on public.service_categories;
create policy "service_categories: do tenant"
  on public.service_categories for all
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- --------------------------------------------------------------
-- 4. Categorias de serviço sugeridas por segmento
-- --------------------------------------------------------------

create or replace function public.suggested_service_categories(p_segmento text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_segmento
    when 'barbearia' then array['Cabelo','Barba','Combos','Sobrancelha','Química']
    when 'salao'     then array['Cabelo','Coloração','Manicure e pedicure','Estética facial','Depilação']
    when 'clinica'   then array['Avaliação','Procedimentos','Sessões','Retorno']
    when 'estudio'   then array['Sessão','Retoque','Consultoria','Cuidados']
    else                  array['Serviços','Avaliação','Retorno']
  end
$$;

-- --------------------------------------------------------------
-- 5. Onboarding: cria o tenant do dono no primeiro acesso
-- --------------------------------------------------------------

create or replace function public.create_tenant_for_current_user(
  p_nome     text,
  p_segmento text,
  p_telefone text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_email     text;
  v_nome_dono text;
  v_tenant_id uuid;
  v_slug      text;
  v_base_slug text;
begin
  if v_uid is null then
    raise exception 'Sem sessão: usuário não autenticado.'
      using errcode = '28000';
  end if;

  if coalesce(btrim(p_nome), '') = '' then
    raise exception 'Informe o nome do negócio.' using errcode = '22023';
  end if;

  if p_segmento not in ('barbearia','salao','clinica','estudio','outro') then
    raise exception 'Segmento inválido: %', p_segmento using errcode = '22023';
  end if;

  -- Já tem tenant? Não recria.
  if exists (
    select 1 from public.profiles
    where id = v_uid and tenant_id is not null
  ) then
    raise exception 'Este usuário já possui um negócio cadastrado.'
      using errcode = '23505';
  end if;

  select u.email,
         coalesce(nullif(btrim(u.raw_user_meta_data ->> 'nome'), ''), split_part(u.email, '@', 1))
    into v_email, v_nome_dono
  from auth.users u
  where u.id = v_uid;

  -- slug: nome "sluguificado" + sufixo aleatório curto (colisão desprezível)
  v_base_slug := lower(regexp_replace(p_nome, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := btrim(v_base_slug, '-');
  if v_base_slug = '' then
    v_base_slug := 'negocio';
  end if;
  v_slug := left(v_base_slug, 40) || '-' || substr(md5(gen_random_uuid()::text), 1, 6);

  insert into public.tenants (nome, slug, segmento, telefone)
  values (btrim(p_nome), v_slug, p_segmento, nullif(btrim(p_telefone), ''))
  returning id into v_tenant_id;

  -- perfil do dono (upsert: a row pode já existir via trigger de signup)
  insert into public.profiles (id, tenant_id, nome, email, papel, ativo)
  values (v_uid, v_tenant_id, coalesce(v_nome_dono, ''), v_email, 'owner', true)
  on conflict (id) do update
    set tenant_id = excluded.tenant_id,
        nome      = coalesce(nullif(public.profiles.nome, ''), excluded.nome),
        email     = excluded.email,
        papel     = 'owner',
        ativo     = true;

  insert into public.tenant_settings (
    tenant_id, mensagem_aniversario, mensagem_confirmacao
  )
  values (
    v_tenant_id,
    'Passe aqui para comemorar com a gente. Um mimo especial te espera. 🎁',
    'Seu horário está confirmado. Se precisar remarcar, é só responder esta mensagem.'
  )
  on conflict (tenant_id) do nothing;

  insert into public.service_categories (tenant_id, nome)
  select v_tenant_id, cat
  from unnest(public.suggested_service_categories(p_segmento)) as cat
  on conflict (tenant_id, nome) do nothing;

  return v_tenant_id;
end;
$$;

revoke all on function public.create_tenant_for_current_user(text, text, text) from public;
grant execute on function public.create_tenant_for_current_user(text, text, text) to authenticated;

-- --------------------------------------------------------------
-- 6. Trigger: cria um profile "vazio" assim que o usuário se registra
--    (o tenant vem depois, no onboarding)
-- --------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, email, papel)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    new.email,
    'owner'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
