-- ==============================================================
-- BRYM · Migration 0026 — CRM: lista de clientes por status
-- Ajuste pós-Fase 4. Aplicar depois da 0025, no SQL Editor.
--
-- `crm_panorama(p_status)` ganha um parâmetro opcional: quando é um dos 5
-- status (novo/ativo/em_atencao/inativo/perdido), o retorno inclui `clientes`
-- = a lista completa daquele status (mesmo formato dos itens de `recuperar`,
-- com `contatado_em`). Sem parâmetro, o comportamento é o mesmo de antes.
-- ==============================================================

drop function if exists public.crm_panorama();

create or replace function public.crm_panorama(p_status text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
declare
  v_tenant    uuid := public.current_tenant_id();
  v_d_ativo   int;
  v_d_atencao int;
  v_d_inativo int;
  v_result    jsonb;
begin
  if not (public.is_owner() or public.has_section('crm')) then
    raise exception 'Sem permissão para ver o CRM.' using errcode = '42501';
  end if;

  select crm_dias_ativo, crm_dias_atencao, crm_dias_inativo
    into v_d_ativo, v_d_atencao, v_d_inativo
  from public.tenant_settings
  where tenant_id = v_tenant;

  v_d_ativo   := coalesce(v_d_ativo, 35);
  v_d_atencao := coalesce(v_d_atencao, 70);
  v_d_inativo := coalesce(v_d_inativo, 140);

  with visiveis as (
    select c.id
    from public.clients c
    where c.tenant_id = v_tenant
      and c.ativo
      and (
        public.is_owner()
        or public.my_professional_id() is null
        or exists (
          select 1 from public.appointments a
          where a.client_id = c.id
            and a.professional_id = public.my_professional_id()
        )
      )
  ),
  agg as (
    select v.id,
           cl.nome,
           cl.telefone,
           max(a.data) filter (where a.status = 'concluido') as ult,
           count(*)    filter (where a.status = 'concluido') as n
    from visiveis v
    join public.clients cl on cl.id = v.id
    left join public.appointments a on a.client_id = v.id
    group by v.id, cl.nome, cl.telefone
  ),
  classificado as (
    select id, nome, telefone, ult, n,
           case
             when ult is null then 'sem_visita'
             when (current_date - ult) <= v_d_ativo and n <= 1 then 'novo'
             when (current_date - ult) <= v_d_ativo   then 'ativo'
             when (current_date - ult) <= v_d_atencao then 'em_atencao'
             when (current_date - ult) <= v_d_inativo then 'inativo'
             else 'perdido'
           end as status
    from agg
  ),
  cont as (
    select client_id, max(criado_em) as contatado_em
    from public.crm_contatos
    where tenant_id = v_tenant
      and criado_em > now() - interval '30 days'
    group by client_id
  ),
  recuperar_rows as (
    select cl.id, cl.nome, cl.telefone, cl.ult, cl.n, cl.status, ct.contatado_em,
           row_number() over (
             order by (cl.status = 'em_atencao') desc, (current_date - cl.ult) asc
           ) as rn
    from classificado cl
    left join cont ct on ct.client_id = cl.id
    where cl.status in ('em_atencao', 'inativo')
    order by rn
    limit 200
  ),
  status_rows as (
    select cl.id, cl.nome, cl.telefone, cl.ult, cl.n, cl.status, ct.contatado_em,
           row_number() over (
             order by (current_date - cl.ult) desc, lower(cl.nome)
           ) as rn
    from classificado cl
    left join cont ct on ct.client_id = cl.id
    where p_status in ('novo', 'ativo', 'em_atencao', 'inativo', 'perdido')
      and cl.status = p_status
    order by rn
    limit 200
  )
  select jsonb_build_object(
    'contagem', (
      select jsonb_build_object(
        'novo',       count(*) filter (where status = 'novo'),
        'ativo',      count(*) filter (where status = 'ativo'),
        'em_atencao', count(*) filter (where status = 'em_atencao'),
        'inativo',    count(*) filter (where status = 'inativo'),
        'perdido',    count(*) filter (where status = 'perdido'),
        'sem_visita', count(*) filter (where status = 'sem_visita')
      )
      from classificado
    ),
    'recuperar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', r.id,
               'nome', r.nome,
               'telefone', r.telefone,
               'ultimo_atendimento', to_char(r.ult, 'YYYY-MM-DD'),
               'dias', (current_date - r.ult),
               'visitas', r.n,
               'status', r.status,
               'contatado_em', r.contatado_em
             ) order by r.rn), '[]'::jsonb)
      from recuperar_rows r
    ),
    'clientes', case
      when p_status in ('novo', 'ativo', 'em_atencao', 'inativo', 'perdido') then (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'id', s.id,
                 'nome', s.nome,
                 'telefone', s.telefone,
                 'ultimo_atendimento', to_char(s.ult, 'YYYY-MM-DD'),
                 'dias', (current_date - s.ult),
                 'visitas', s.n,
                 'status', s.status,
                 'contatado_em', s.contatado_em
               ) order by s.rn), '[]'::jsonb)
        from status_rows s
      )
      else null
    end
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.crm_panorama(text) from public;
grant execute on function public.crm_panorama(text) to authenticated;
