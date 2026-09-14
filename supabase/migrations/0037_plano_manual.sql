alter table public.tenants add column if not exists plano_manual text;

create or replace function public.plataforma_definir_plano_manual(
  p_tenant_id uuid,
  p_plano     text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_plataforma_admin() then
    raise exception 'Sem permissao para o painel da plataforma.' using errcode = '42501';
  end if;

  if p_plano is not null and p_plano not in ('essencial', 'profissional', 'gestao') then
    raise exception 'Plano invalido: %', p_plano using errcode = '22023';
  end if;

  update public.tenants set plano_manual = p_plano where id = p_tenant_id;

  if not found then
    raise exception 'Negocio nao encontrado.' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.plataforma_definir_plano_manual(uuid, text) from public;
grant execute on function public.plataforma_definir_plano_manual(uuid, text) to authenticated;

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
    raise exception 'Sem permissao para o painel da plataforma.' using errcode = '42501';
  end if;

  with base as (
    select
      t.id,
      t.nome,
      t.segmento,
      t.status_assinatura,
      t.trial_expira_em,
      t.criado_em,
      t.plano,
      t.plano_manual,
      t.gateway,
      t.assinatura_ativa_ate,
      t.assinatura_em_atraso,
      (t.gateway_customer_id is not null) as tem_gateway,
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
        'negocios',        count(*),
        'trial',           count(*) filter (where status_assinatura = 'trial'),
        'ativo',           count(*) filter (where status_assinatura = 'ativo'),
        'suspenso',        count(*) filter (where status_assinatura = 'suspenso'),
        'cancelado',       count(*) filter (where status_assinatura = 'cancelado'),
        'trial_expirado',  count(*) filter (where trial_expirado),
        'em_atraso',       count(*) filter (where assinatura_em_atraso),
        'eventos_nao_vinculados', (
          select count(*) from public.pagamento_eventos
          where tenant_id is null and not processado
        )
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
        'plano', b.plano,
        'plano_manual', b.plano_manual,
        'gateway', b.gateway,
        'assinatura_ativa_ate', b.assinatura_ativa_ate,
        'assinatura_em_atraso', b.assinatura_em_atraso,
        'tem_gateway', b.tem_gateway,
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
    ),
    'nao_vinculados', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id,
        'gateway', e.gateway,
        'tipo', e.tipo,
        'recebido_em', e.recebido_em,
        'email', e.payload ->> 'email',
        'plano', e.payload ->> 'plano',
        'valor', e.payload ->> 'valor'
      ) order by e.recebido_em desc), '[]'::jsonb)
      from public.pagamento_eventos e
      where e.tenant_id is null and not e.processado
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.plataforma_panorama() from public;
grant execute on function public.plataforma_panorama() to authenticated;
