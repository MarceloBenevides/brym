drop function if exists public.create_tenant_for_current_user(text, text, text);

create or replace function public.create_tenant_for_current_user(
  p_nome     text,
  p_segmento text,
  p_telefone text default null,
  p_ddi      text default null
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
  v_ddi       text := coalesce(nullif(regexp_replace(coalesce(p_ddi, ''), '\D', '', 'g'), ''), '55');
begin
  if v_uid is null then
    raise exception 'Sem sessao: usuario nao autenticado.'
      using errcode = '28000';
  end if;

  if coalesce(btrim(p_nome), '') = '' then
    raise exception 'Informe o nome do negocio.' using errcode = '22023';
  end if;

  if p_segmento not in ('barbearia','salao','clinica','estudio','outro') then
    raise exception 'Segmento invalido: %', p_segmento using errcode = '22023';
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_uid and tenant_id is not null
  ) then
    raise exception 'Este usuario ja possui um negocio cadastrado.'
      using errcode = '23505';
  end if;

  select u.email,
         coalesce(nullif(btrim(u.raw_user_meta_data ->> 'nome'), ''), split_part(u.email, '@', 1))
    into v_email, v_nome_dono
  from auth.users u
  where u.id = v_uid;

  v_base_slug := lower(regexp_replace(p_nome, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := btrim(v_base_slug, '-');
  if v_base_slug = '' then
    v_base_slug := 'negocio';
  end if;
  v_slug := left(v_base_slug, 40) || '-' || substr(md5(gen_random_uuid()::text), 1, 6);

  insert into public.tenants (nome, slug, segmento, telefone)
  values (btrim(p_nome), v_slug, p_segmento, nullif(btrim(p_telefone), ''))
  returning id into v_tenant_id;

  insert into public.profiles (id, tenant_id, nome, email, papel, ativo)
  values (v_uid, v_tenant_id, coalesce(v_nome_dono, ''), v_email, 'owner', true)
  on conflict (id) do update
    set tenant_id = excluded.tenant_id,
        nome      = coalesce(nullif(public.profiles.nome, ''), excluded.nome),
        email     = excluded.email,
        papel     = 'owner',
        ativo     = true;

  insert into public.tenant_settings (
    tenant_id, ddi, mensagem_aniversario, mensagem_confirmacao
  )
  values (
    v_tenant_id,
    v_ddi,
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

revoke all on function public.create_tenant_for_current_user(text, text, text, text) from public;
grant execute on function public.create_tenant_for_current_user(text, text, text, text) to authenticated;
