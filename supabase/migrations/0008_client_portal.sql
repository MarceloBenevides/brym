-- ==============================================================
-- BRYM · Migration 0008 — Portal do cliente (consulta por telefone)
-- Fase 1b-iv. Aplicar depois da 0007, no SQL Editor.
--
-- Sem sessão: o cliente informa o telefone e vê os próprios agendamentos
-- e histórico — SEM valores. Funções SECURITY DEFINER, expostas a `anon`.
-- (OTP por SMS fica para depois — só a estrutura por enquanto.)
-- ==============================================================

-- Nome do negócio pelo slug (para o cabeçalho da página)
create or replace function public.portal_tenant_nome(p_slug text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nome from public.tenants where slug = p_slug
$$;

revoke all on function public.portal_tenant_nome(text) from public;
grant execute on function public.portal_tenant_nome(text) to anon, authenticated;

-- --------------------------------------------------------------
-- Consulta do cliente: negócio (slug) + telefone → agendamentos
-- --------------------------------------------------------------

create or replace function public.portal_lookup(p_slug text, p_telefone text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant   record;
  v_client   record;
  v_digits   text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  v_proximos jsonb;
  v_historico jsonb;
begin
  if length(v_digits) < 8 then
    return jsonb_build_object('encontrado', false, 'motivo', 'telefone');
  end if;

  select id, nome into v_tenant from public.tenants where slug = p_slug;
  if not found then
    return jsonb_build_object('encontrado', false, 'motivo', 'negocio');
  end if;

  select id, nome into v_client
  from public.clients
  where tenant_id = v_tenant.id
    and ativo
    and right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 8) = right(v_digits, 8)
  order by criado_em desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'encontrado', false, 'motivo', 'cliente',
      'negocio_nome', v_tenant.nome
    );
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.data, t.hora_inicio), '[]'::jsonb)
    into v_proximos
  from (
    select a.data,
           to_char(a.hora_inicio, 'HH24:MI') as hora_inicio,
           s.nome as servico,
           pr.nome as profissional,
           a.status
    from public.appointments a
    left join public.services s on s.id = a.service_id
    left join public.professionals pr on pr.id = a.professional_id
    where a.client_id = v_client.id
      and a.status = 'confirmado'
      and a.data >= current_date
  ) t;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.data desc, t.hora_inicio desc), '[]'::jsonb)
    into v_historico
  from (
    select a.data,
           to_char(a.hora_inicio, 'HH24:MI') as hora_inicio,
           s.nome as servico,
           pr.nome as profissional,
           a.status
    from public.appointments a
    left join public.services s on s.id = a.service_id
    left join public.professionals pr on pr.id = a.professional_id
    where a.client_id = v_client.id
      and (
        a.status = 'concluido'
        or (a.data < current_date and a.status <> 'cancelado')
      )
    order by a.data desc, a.hora_inicio desc
    limit 20
  ) t;

  return jsonb_build_object(
    'encontrado', true,
    'negocio_nome', v_tenant.nome,
    'cliente_nome', v_client.nome,
    'proximos', v_proximos,
    'historico', v_historico
  );
end;
$$;

revoke all on function public.portal_lookup(text, text) from public;
grant execute on function public.portal_lookup(text, text) to anon, authenticated;
