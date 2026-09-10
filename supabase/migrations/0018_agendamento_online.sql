-- ==============================================================
-- BRYM · Migration 0018 — Agendamento online (fluxo até o carrinho)
-- Fase 4a. Aplicar depois da 0017, no SQL Editor.
--
-- professional_services: quais serviços cada profissional faz (usado no
-- link público). RPCs SECURITY DEFINER expostas a anon, como o portal.
-- ==============================================================

-- --------------------------------------------------------------
-- 1. professional_services
-- --------------------------------------------------------------

create table if not exists public.professional_services (
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  service_id      uuid not null references public.services (id) on delete cascade,
  primary key (professional_id, service_id)
);

create index if not exists professional_services_tenant_idx
  on public.professional_services (tenant_id);
create index if not exists professional_services_service_idx
  on public.professional_services (service_id);

alter table public.professional_services enable row level security;

drop policy if exists "professional_services: ver do tenant" on public.professional_services;
create policy "professional_services: ver do tenant"
  on public.professional_services for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists "professional_services: dono gerencia" on public.professional_services;
create policy "professional_services: dono gerencia"
  on public.professional_services for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_owner())
  with check (tenant_id = public.current_tenant_id() and public.is_owner());

-- backfill: todo profissional faz todos os serviços ativos do tenant
insert into public.professional_services (tenant_id, professional_id, service_id)
select p.tenant_id, p.id, s.id
from public.professionals p
join public.services s on s.tenant_id = p.tenant_id and s.ativo
on conflict do nothing;

-- --------------------------------------------------------------
-- 2. RPC agendar_catalogo
-- --------------------------------------------------------------

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
        'id', pr.id, 'nome', pr.nome, 'cargo', pr.cargo,
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

-- --------------------------------------------------------------
-- 3. RPC agendar_disponibilidade
-- --------------------------------------------------------------

create or replace function public.agendar_disponibilidade(
  p_slug           text,
  p_professional_id uuid,
  p_data           date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
declare
  v_tenant_id uuid;
  v_ok        boolean;
  v_ocupados  jsonb;
begin
  select id into v_tenant_id from public.tenants where slug = p_slug;
  if not found then
    return jsonb_build_object('ok', false);
  end if;

  select true into v_ok
  from public.professionals
  where id = p_professional_id
    and tenant_id = v_tenant_id
    and ativo
    and mostrar_no_link_online;
  if not found then
    return jsonb_build_object('ok', false);
  end if;

  if p_data < current_date then
    return jsonb_build_object('ok', false);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'inicio', to_char(a.hora_inicio, 'HH24:MI'),
           'fim', to_char(a.hora_fim, 'HH24:MI')
         ) order by a.hora_inicio), '[]'::jsonb)
    into v_ocupados
  from public.appointments a
  where a.professional_id = p_professional_id
    and a.data = p_data
    and a.status <> 'cancelado';

  return jsonb_build_object(
    'ok', true,
    'intervalo_min', coalesce(
      (select intervalo_agendamento_min from public.tenant_settings where tenant_id = v_tenant_id),
      30),
    'hoje', to_char(current_date, 'YYYY-MM-DD'),
    'agora_min', extract(hour from localtime)::int * 60 + extract(minute from localtime)::int,
    'ocupados', v_ocupados
  );
end;
$$;

revoke all on function public.agendar_disponibilidade(text, uuid, date) from public;
grant execute on function public.agendar_disponibilidade(text, uuid, date) to anon, authenticated;
