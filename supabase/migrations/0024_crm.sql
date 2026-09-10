-- ==============================================================
-- BRYM · Migration 0024 — CRM enxuto: régua de recência + panorama
-- Ajuste pós-Fase 4. Aplicar depois da 0023, no SQL Editor.
--
-- Classifica clientes por dias desde o último atendimento CONCLUÍDO:
-- Novo / Ativo / Em atenção / Inativo / Perdido. Régua configurável por
-- tenant (Configurações). `crm_panorama()` devolve a contagem por status;
-- a lista "recuperar" entra na 0025.
-- ==============================================================

-- --------------------------------------------------------------
-- 1. Régua (dias) + mensagem de recuperação em tenant_settings
-- --------------------------------------------------------------
alter table public.tenant_settings
  add column if not exists crm_dias_ativo       integer not null default 35,
  add column if not exists crm_dias_atencao     integer not null default 70,
  add column if not exists crm_dias_inativo     integer not null default 140,
  add column if not exists mensagem_recuperacao text;

alter table public.tenant_settings
  drop constraint if exists tenant_settings_crm_dias_ordem;
alter table public.tenant_settings
  add constraint tenant_settings_crm_dias_ordem
  check (
    crm_dias_ativo >= 1
    and crm_dias_ativo < crm_dias_atencao
    and crm_dias_atencao < crm_dias_inativo
  );

-- --------------------------------------------------------------
-- 2. RPC crm_panorama — contagem de clientes por status de recência
-- --------------------------------------------------------------
create or replace function public.crm_panorama()
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
    -- replica a policy de SELECT de clients (0013): dono/recepção vê todos,
    -- barbeiro só vê quem já atendeu
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
           max(a.data) filter (where a.status = 'concluido') as ult,
           count(*)    filter (where a.status = 'concluido') as n
    from visiveis v
    left join public.appointments a on a.client_id = v.id
    group by v.id
  ),
  classificado as (
    select case
             when ult is null then 'sem_visita'
             when (current_date - ult) <= v_d_ativo and n <= 1 then 'novo'
             when (current_date - ult) <= v_d_ativo   then 'ativo'
             when (current_date - ult) <= v_d_atencao then 'em_atencao'
             when (current_date - ult) <= v_d_inativo then 'inativo'
             else 'perdido'
           end as status
    from agg
  )
  select jsonb_build_object(
    'contagem', jsonb_build_object(
      'novo',       count(*) filter (where status = 'novo'),
      'ativo',      count(*) filter (where status = 'ativo'),
      'em_atencao', count(*) filter (where status = 'em_atencao'),
      'inativo',    count(*) filter (where status = 'inativo'),
      'perdido',    count(*) filter (where status = 'perdido'),
      'sem_visita', count(*) filter (where status = 'sem_visita')
    )
  )
  into v_result
  from classificado;

  return v_result;
end;
$$;

revoke all on function public.crm_panorama() from public;
grant execute on function public.crm_panorama() to authenticated;
