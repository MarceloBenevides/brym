alter table public.tenants rename column stripe_customer_id to gateway_customer_id;
alter table public.tenants rename column stripe_subscription_id to gateway_subscription_id;
alter table public.tenants add column if not exists gateway text;

update public.tenants set gateway = 'stripe' where gateway_customer_id is not null and gateway is null;

alter index if exists tenants_stripe_customer_idx rename to tenants_gateway_customer_idx;
alter index if exists tenants_stripe_subscription_idx rename to tenants_gateway_subscription_idx;

alter table public.stripe_events rename to pagamento_eventos;
alter table public.pagamento_eventos add column if not exists gateway text not null default 'stripe';
alter table public.pagamento_eventos alter column gateway drop default;
alter index if exists stripe_events_pendentes_idx rename to pagamento_eventos_pendentes_idx;
alter policy "stripe_events_admin_le" on public.pagamento_eventos rename to "pagamento_eventos_admin_le";

drop function if exists public.stripe_processar_evento(
  text, text, text, uuid, text, text, text, timestamptz, boolean, jsonb
);
drop function if exists public.stripe_vincular_evento(text, uuid);

create or replace function public.assinatura_processar_evento(
  p_gateway        text,
  p_event_id       text,
  p_tipo           text,
  p_acao           text,
  p_tenant_id      uuid,
  p_plano          text,
  p_customer       text,
  p_subscription   text,
  p_ativa_ate      timestamptz,
  p_cancelar_no_fim boolean,
  p_payload        jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.pagamento_eventos (id, gateway, tipo, acao, tenant_id, payload)
  values (p_event_id, p_gateway, p_tipo, p_acao, p_tenant_id, p_payload)
  on conflict (id) do nothing;

  if not found then
    return jsonb_build_object('duplicado', true);
  end if;

  if p_tenant_id is null then
    return jsonb_build_object('sem_tenant', true);
  end if;

  if p_acao in ('ativar', 'renovar', 'atualizar') then
    update public.tenants set
      status_assinatura          = 'ativo',
      gateway                    = p_gateway,
      plano                      = coalesce(p_plano, plano),
      gateway_customer_id        = coalesce(p_customer, gateway_customer_id),
      gateway_subscription_id    = coalesce(p_subscription, gateway_subscription_id),
      assinatura_ativa_ate       = coalesce(p_ativa_ate, assinatura_ativa_ate),
      assinatura_em_atraso       = false,
      assinatura_cancelar_no_fim = coalesce(p_cancelar_no_fim, false)
    where id = p_tenant_id;

  elsif p_acao = 'atraso' then
    update public.tenants set
      assinatura_em_atraso = true,
      assinatura_ativa_ate = coalesce(p_ativa_ate, assinatura_ativa_ate)
    where id = p_tenant_id;

  elsif p_acao = 'encerrar' then
    update public.tenants set
      assinatura_ativa_ate       = coalesce(p_ativa_ate, now()),
      assinatura_cancelar_no_fim = false,
      gateway_subscription_id    = null
    where id = p_tenant_id;
  end if;

  update public.pagamento_eventos set processado = true where id = p_event_id;

  return jsonb_build_object('ok', true, 'acao', p_acao);
end;
$$;

revoke all on function public.assinatura_processar_evento(
  text, text, text, text, uuid, text, text, text, timestamptz, boolean, jsonb
) from public;
grant execute on function public.assinatura_processar_evento(
  text, text, text, text, uuid, text, text, text, timestamptz, boolean, jsonb
) to service_role;

create or replace function public.assinatura_vincular_evento(
  p_event_id  text,
  p_tenant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ev public.pagamento_eventos;
begin
  if not public.is_plataforma_admin() then
    raise exception 'Sem permissao para o painel da plataforma.' using errcode = '42501';
  end if;

  select * into v_ev from public.pagamento_eventos where id = p_event_id;
  if not found then
    raise exception 'Evento nao encontrado.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.tenants where id = p_tenant_id) then
    raise exception 'Negocio nao encontrado.' using errcode = '22023';
  end if;

  update public.tenants set
    status_assinatura       = 'ativo',
    gateway                 = coalesce(v_ev.gateway, gateway),
    plano                   = coalesce(v_ev.payload ->> 'plano', plano),
    gateway_customer_id     = coalesce(v_ev.payload ->> 'customer', gateway_customer_id),
    gateway_subscription_id = coalesce(v_ev.payload ->> 'subscription', gateway_subscription_id),
    assinatura_ativa_ate    = coalesce((v_ev.payload ->> 'ativa_ate')::timestamptz, assinatura_ativa_ate),
    assinatura_em_atraso    = false
  where id = p_tenant_id;

  update public.pagamento_eventos
    set tenant_id = p_tenant_id, processado = true
  where id = p_event_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.assinatura_vincular_evento(text, uuid) from public;
grant execute on function public.assinatura_vincular_evento(text, uuid) to authenticated;

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
