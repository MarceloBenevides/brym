-- ==============================================================
-- BRYM · Migration 0002 — Funcionários e convites
-- Fase 1a-ii da especificação.
--
-- Aplicar depois da 0001, no SQL Editor do projeto.
-- ==============================================================

-- --------------------------------------------------------------
-- 1. Permissões por seção no perfil do funcionário
--    (owner ignora — tem acesso a tudo)
-- --------------------------------------------------------------

alter table public.profiles
  add column if not exists permissoes text[] not null default '{}';

-- --------------------------------------------------------------
-- 2. Convites
-- --------------------------------------------------------------

create table if not exists public.invitations (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  email          text not null,
  nome           text not null default '',
  papel          text not null default 'employee' check (papel in ('employee')),
  permissoes     text[] not null default '{}',
  token          text not null unique
                   default translate(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status         text not null default 'pendente'
                   check (status in ('pendente','aceito','revogado')),
  convidado_por  uuid references auth.users (id) on delete set null,
  criado_em      timestamptz not null default now(),
  expira_em      timestamptz not null default (now() + interval '7 days'),
  aceito_em      timestamptz
);

create index if not exists invitations_tenant_id_idx on public.invitations (tenant_id);
create index if not exists invitations_token_idx on public.invitations (token);

-- um único convite pendente por (tenant, e-mail)
create unique index if not exists invitations_pendente_unico
  on public.invitations (tenant_id, lower(email))
  where status = 'pendente';

-- --------------------------------------------------------------
-- 3. Helper: o usuário logado é dono de um tenant?
-- --------------------------------------------------------------

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and papel = 'owner'
      and tenant_id is not null
  )
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

-- --------------------------------------------------------------
-- 4. RLS — só o dono do tenant mexe nos convites
-- --------------------------------------------------------------

alter table public.invitations enable row level security;

drop policy if exists "invitations: dono do tenant" on public.invitations;
create policy "invitations: dono do tenant"
  on public.invitations for all
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_owner())
  with check (tenant_id = public.current_tenant_id() and public.is_owner());

-- --------------------------------------------------------------
-- 5. Prévia pública do convite (pelo token, sem sessão)
-- --------------------------------------------------------------

create or replace function public.invitation_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  inv record;
begin
  select i.status, i.nome, i.email, i.papel, i.expira_em, t.nome as tenant_nome
    into inv
  from public.invitations i
  join public.tenants t on t.id = i.tenant_id
  where i.token = p_token;

  if not found then
    return jsonb_build_object('valido', false, 'motivo', 'nao_encontrado');
  end if;
  if inv.status = 'aceito' then
    return jsonb_build_object('valido', false, 'motivo', 'ja_aceito');
  end if;
  if inv.status = 'revogado' then
    return jsonb_build_object('valido', false, 'motivo', 'revogado');
  end if;
  if inv.expira_em < now() then
    return jsonb_build_object('valido', false, 'motivo', 'expirado');
  end if;

  return jsonb_build_object(
    'valido', true,
    'tenant_nome', inv.tenant_nome,
    'nome', inv.nome,
    'email', inv.email,
    'papel', inv.papel
  );
end;
$$;

revoke all on function public.invitation_preview(text) from public;
grant execute on function public.invitation_preview(text) to anon, authenticated;

-- --------------------------------------------------------------
-- 6. Convite pendente do próprio usuário (pelo e-mail da sessão)
-- --------------------------------------------------------------

create or replace function public.my_pending_invitation()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_token text;
begin
  select lower(email) into v_email from auth.users where id = (select auth.uid());
  if v_email is null then
    return null;
  end if;

  select token into v_token
  from public.invitations
  where lower(email) = v_email
    and status = 'pendente'
    and expira_em >= now()
  order by criado_em desc
  limit 1;

  return v_token;
end;
$$;

revoke all on function public.my_pending_invitation() from public;
grant execute on function public.my_pending_invitation() to authenticated;

-- --------------------------------------------------------------
-- 7. Aceitar convite — vincula a conta logada ao tenant
-- --------------------------------------------------------------

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_email text;
  inv     record;
begin
  if v_uid is null then
    raise exception 'Sem sessão: usuário não autenticado.' using errcode = '28000';
  end if;

  select lower(email) into v_email from auth.users where id = v_uid;

  select * into inv from public.invitations where token = p_token for update;

  if not found then
    raise exception 'Convite não encontrado.' using errcode = '22023';
  end if;
  if inv.status <> 'pendente' then
    raise exception 'Este convite não está mais disponível.' using errcode = '22023';
  end if;
  if inv.expira_em < now() then
    raise exception 'Este convite expirou.' using errcode = '22023';
  end if;
  if lower(inv.email) <> v_email then
    raise exception 'Este convite é para outro e-mail.' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.profiles
    where id = v_uid and tenant_id is not null and tenant_id <> inv.tenant_id
  ) then
    raise exception 'Sua conta já está vinculada a outro negócio.' using errcode = '23505';
  end if;

  insert into public.profiles (id, tenant_id, nome, email, papel, permissoes, ativo)
  values (
    v_uid, inv.tenant_id,
    coalesce(nullif(btrim(inv.nome), ''), split_part(v_email, '@', 1)),
    v_email, 'employee', inv.permissoes, true
  )
  on conflict (id) do update
    set tenant_id  = excluded.tenant_id,
        nome       = coalesce(nullif(btrim(public.profiles.nome), ''), excluded.nome),
        email      = excluded.email,
        papel      = 'employee',
        permissoes = excluded.permissoes,
        ativo      = true;

  update public.invitations
    set status = 'aceito', aceito_em = now()
  where id = inv.id;

  return inv.tenant_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;
