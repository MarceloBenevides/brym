-- ==============================================================
-- BRYM · Migration 0020 — Foto do profissional
-- Ajuste pós-Fase 4. Aplicar depois da 0019, no SQL Editor.
--
-- Primeiro uso de Supabase Storage no projeto: bucket público
-- "fotos-profissionais". Caminho do objeto = "<tenant_id>/<professional_id>"
-- (sem extensão — o Content-Type já vem do upload). O bucket é público pra
-- leitura (serve a URL pública sem checar RLS), mas a escrita ainda passa
-- pelo client autenticado normal, então precisa de política em
-- storage.objects restringindo upload/troca/remoção ao dono do tenant dono
-- daquele caminho.
-- ==============================================================

alter table public.professionals add column if not exists foto_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-profissionais',
  'fotos-profissionais',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "fotos-profissionais: leitura publica" on storage.objects;
create policy "fotos-profissionais: leitura publica"
  on storage.objects for select
  using (bucket_id = 'fotos-profissionais');

drop policy if exists "fotos-profissionais: dono gerencia" on storage.objects;
create policy "fotos-profissionais: dono gerencia"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'fotos-profissionais'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.is_owner()
  )
  with check (
    bucket_id = 'fotos-profissionais'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.is_owner()
  );

-- agendar_catalogo (0018) passa a incluir a foto de cada profissional
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
  select id, nome into v_tenant from public.tenants where slug = p_slug;
  if not found then
    return jsonb_build_object('encontrado', false);
  end if;

  select jsonb_build_object(
    'encontrado', true,
    'negocio_nome', v_tenant.nome,
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
