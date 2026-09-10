-- ==============================================================
-- BRYM · Migration 0006 — Vincular Profissional ↔ conta de acesso
-- Ajuste 1a-iii. Aplicar depois da 0005, no SQL Editor.
-- ==============================================================

-- --------------------------------------------------------------
-- 1. Um login → no máximo um profissional
-- --------------------------------------------------------------

create unique index if not exists professionals_user_id_key
  on public.professionals (user_id)
  where user_id is not null;

-- --------------------------------------------------------------
-- 2. Convite pode já pedir a criação do profissional vinculado
-- --------------------------------------------------------------

alter table public.invitations
  add column if not exists criar_profissional boolean not null default false;

-- --------------------------------------------------------------
-- 3. Profissional vinculado ao usuário logado
-- --------------------------------------------------------------

create or replace function public.my_professional_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.professionals where user_id = (select auth.uid())
$$;

revoke all on function public.my_professional_id() from public;
grant execute on function public.my_professional_id() to authenticated;

-- --------------------------------------------------------------
-- 4. accept_invitation — cria o profissional vinculado se pedido
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

  if inv.criar_profissional
     and not exists (select 1 from public.professionals where user_id = v_uid)
  then
    insert into public.professionals (tenant_id, user_id, nome)
    values (
      inv.tenant_id, v_uid,
      coalesce(nullif(btrim(inv.nome), ''), split_part(v_email, '@', 1))
    );
  end if;

  update public.invitations
    set status = 'aceito', aceito_em = now()
  where id = inv.id;

  return inv.tenant_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;

-- --------------------------------------------------------------
-- 5. Agenda — funcionário vinculado só edita os próprios atendimentos
--    (leitura continua para o tenant todo)
-- --------------------------------------------------------------

drop policy if exists "appointments: do tenant" on public.appointments;

drop policy if exists "appointments: ver do tenant" on public.appointments;
create policy "appointments: ver do tenant"
  on public.appointments for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists "appointments: gerenciar os próprios" on public.appointments;
create policy "appointments: gerenciar os próprios"
  on public.appointments for all
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.is_owner()
      or public.my_professional_id() is null
      or professional_id = public.my_professional_id()
    )
  )
  with check (
    tenant_id = public.current_tenant_id()
    and (
      public.is_owner()
      or public.my_professional_id() is null
      or professional_id = public.my_professional_id()
    )
  );

-- --------------------------------------------------------------
-- 6. Fechar escalonamento de permissões pelo próprio usuário
-- --------------------------------------------------------------

-- (a 0007 refina isto: `revoke update (col)` não basta quando o papel tem
--  UPDATE na tabela inteira — lá removemos o UPDATE da tabela e devolvemos só
--  as colunas seguras.)
revoke update on public.profiles from anon, authenticated;
grant  update (nome, telefone) on public.profiles to authenticated;

create or replace function public.set_employee_permissions(
  p_profile_id uuid,
  p_permissoes text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'Só o dono do negócio pode alterar permissões.'
      using errcode = '42501';
  end if;

  update public.profiles
    set permissoes = coalesce(p_permissoes, '{}')
  where id = p_profile_id
    and tenant_id = public.current_tenant_id()
    and papel = 'employee';

  if not found then
    raise exception 'Funcionário não encontrado neste negócio.'
      using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.set_employee_permissions(uuid, text[]) from public;
grant execute on function public.set_employee_permissions(uuid, text[]) to authenticated;
