-- ==============================================================
-- BRYM · Migration 0027 — Painel de administrador da plataforma
-- Item 19 da especificação. Aplicar depois da 0026, no SQL Editor.
--
-- `profiles.plataforma_admin` = flag do super-admin (dono do BRYM), acima da
-- multi-tenancy. `plataforma_panorama()` retorna SÓ métricas agregadas/
-- operacionais de todos os negócios — nenhum conteúdo de cliente final
-- (só `count(*)`).
--
-- PASSO MANUAL DE SETUP (rodar uma vez, no SQL Editor):
--   update public.profiles set plataforma_admin = true
--   where id = (select id from auth.users where email = 'SEU-EMAIL');
-- ==============================================================

alter table public.profiles
  add column if not exists plataforma_admin boolean not null default false;

-- --------------------------------------------------------------
-- Helper: o usuário logado é admin da plataforma?
-- --------------------------------------------------------------
create or replace function public.is_plataforma_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select plataforma_admin from public.profiles where id = (select auth.uid())),
    false
  )
$$;

revoke all on function public.is_plataforma_admin() from public;
grant execute on function public.is_plataforma_admin() to authenticated;

-- --------------------------------------------------------------
-- RPC: panorama de todos os negócios (só métricas)
-- --------------------------------------------------------------
create or replace function public.plataforma_panorama()
returns jsonb
language plpgsql
security definer
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
declare
  v_result jsonb;
begin
  if not public.is_plataforma_admin() then
    raise exception 'Sem permissão para o painel da plataforma.' using errcode = '42501';
  end if;

  with base as (
    select
      t.id,
      t.nome,
      t.segmento,
      t.status_assinatura,
      t.trial_expira_em,
      t.criado_em,
      (t.status_assinatura = 'trial' and t.trial_expira_em < now()) as trial_expirado,
      (
        select p.nome from public.profiles p
        where p.tenant_id = t.id and p.papel = 'owner'
        order by p.criado_em limit 1
      ) as dono_nome,
      (
        select p.email from public.profiles p
        where p.tenant_id = t.id and p.papel = 'owner'
        order by p.criado_em limit 1
      ) as dono_email,
      (select count(*) from public.clients c        where c.tenant_id = t.id and c.ativo)  as n_clientes,
      (select count(*) from public.professionals pr where pr.tenant_id = t.id and pr.ativo) as n_profissionais,
      (select count(*) from public.services s       where s.tenant_id = t.id and s.ativo)  as n_servicos,
      (select count(*) from public.appointments a   where a.tenant_id = t.id)              as n_agendamentos,
      (select count(*) from public.comandas co      where co.tenant_id = t.id)             as n_comandas,
      (
        select count(*) from public.appointments a
        where a.tenant_id = t.id and a.data >= current_date - 30
      ) as n_agendamentos_30d,
      (
        select count(*) from public.comandas co
        where co.tenant_id = t.id and co.criado_em > now() - interval '30 days'
      ) as n_comandas_30d,
      (
        select to_char(max(a.data), 'YYYY-MM-DD') from public.appointments a
        where a.tenant_id = t.id
      ) as ultimo_agendamento
    from public.tenants t
  )
  select jsonb_build_object(
    'totais', (
      select jsonb_build_object(
        'negocios',       count(*),
        'trial',          count(*) filter (where status_assinatura = 'trial'),
        'ativo',          count(*) filter (where status_assinatura = 'ativo'),
        'suspenso',       count(*) filter (where status_assinatura = 'suspenso'),
        'cancelado',      count(*) filter (where status_assinatura = 'cancelado'),
        'trial_expirado', count(*) filter (where trial_expirado)
      )
      from base
    ),
    'negocios', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', b.id,
        'nome', b.nome,
        'segmento', b.segmento,
        'status_assinatura', b.status_assinatura,
        'trial_expira_em', b.trial_expira_em,
        'criado_em', b.criado_em,
        'dono_nome', b.dono_nome,
        'dono_email', b.dono_email,
        'n_clientes', b.n_clientes,
        'n_profissionais', b.n_profissionais,
        'n_servicos', b.n_servicos,
        'n_agendamentos', b.n_agendamentos,
        'n_comandas', b.n_comandas,
        'n_agendamentos_30d', b.n_agendamentos_30d,
        'n_comandas_30d', b.n_comandas_30d,
        'ultimo_agendamento', b.ultimo_agendamento
      ) order by b.criado_em desc), '[]'::jsonb)
      from base b
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.plataforma_panorama() from public;
grant execute on function public.plataforma_panorama() to authenticated;
