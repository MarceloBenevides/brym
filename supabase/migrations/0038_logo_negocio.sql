alter table public.tenants add column if not exists logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos-negocios',
  'logos-negocios',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "logos-negocios: leitura publica" on storage.objects;
create policy "logos-negocios: leitura publica"
  on storage.objects for select
  using (bucket_id = 'logos-negocios');

drop policy if exists "logos-negocios: dono gerencia" on storage.objects;
create policy "logos-negocios: dono gerencia"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'logos-negocios'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.is_owner()
  )
  with check (
    bucket_id = 'logos-negocios'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.is_owner()
  );

create or replace function public.agendar_catalogo(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant record;
  v_result jsonb;
begin
  select id, nome, logo_url into v_tenant from public.tenants where slug = p_slug;
  if not found then
    return jsonb_build_object('encontrado', false);
  end if;

  select jsonb_build_object(
    'encontrado', true,
    'negocio_nome', v_tenant.nome,
    'negocio_logo_url', v_tenant.logo_url,
    'intervalo_min', coalesce(
      (select intervalo_agendamento_min from public.tenant_settings where tenant_id = v_tenant.id),
      30),
    'categorias', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome) order by c.nome)
      from public.service_categories c
      where c.tenant_id = v_tenant.id
        and exists (
          select 1 from public.services s
          where s.category_id = c.id and s.ativo
        )
    ), '[]'::jsonb),
    'servicos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'nome', s.nome, 'category_id', s.category_id,
        'duracao_min', s.duracao_min, 'preco', s.preco
      ) order by s.nome)
      from public.services s
      where s.tenant_id = v_tenant.id and s.ativo
    ), '[]'::jsonb),
    'profissionais', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id, 'nome', pr.nome, 'cargo', pr.cargo, 'foto_url', pr.foto_url,
        'servicos', coalesce((
          select jsonb_agg(ps.service_id)
          from public.professional_services ps
          join public.services s on s.id = ps.service_id
          where ps.professional_id = pr.id and s.ativo
        ), '[]'::jsonb)
      ) order by pr.nome)
      from public.professionals pr
      where pr.tenant_id = v_tenant.id and pr.ativo and pr.mostrar_no_link_online
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.agendar_catalogo(text) from public;
grant execute on function public.agendar_catalogo(text) to anon, authenticated;

drop function if exists public.portal_tenant_nome(text);

create or replace function public.portal_tenant_nome(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('nome', nome, 'logo_url', logo_url)
  from public.tenants
  where slug = p_slug
$$;

revoke all on function public.portal_tenant_nome(text) from public;
grant execute on function public.portal_tenant_nome(text) to anon, authenticated;
