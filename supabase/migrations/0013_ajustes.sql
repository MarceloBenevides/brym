-- ==============================================================
-- BRYM · Migration 0013 — Ajustes pós-Fase 2
-- Aplicar depois da 0012, no SQL Editor.
--
-- A. relatorio_vendas: + num_clientes, + num_servicos
-- B. comissoes_periodo: + por_dia (comissão do profissional por dia)
-- C. RLS de clients: profissional vinculado (barbeiro) só vê os
--    clientes que já atendeu, e não gerencia cadastro.
-- D. Fuso: os relatórios passam a recortar por data em
--    America/Sao_Paulo (antes era UTC — "Hoje" errava ~3h/dia).
-- ==============================================================

-- --------------------------------------------------------------
-- A. relatorio_vendas — contagens extras
-- --------------------------------------------------------------

create or replace function public.relatorio_vendas(
  p_de              date,
  p_ate             date,
  p_service_id      uuid default null,
  p_professional_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_result jsonb;
begin
  if not public.has_section('financeiro') then
    if public.my_professional_id() is null
       or p_professional_id is null
       or p_professional_id <> public.my_professional_id() then
      raise exception 'Sem permissão para ver este relatório.' using errcode = '42501';
    end if;
  end if;

  with itens as (
    select c.id as comanda_id,
           c.client_id,
           c.fechada_em::date as dia,
           i.tipo,
           coalesce(s.nome, i.descricao) as servico_nome,
           i.quantidade,
           i.valor_unitario
    from public.comandas c
    join public.comanda_items i on i.comanda_id = c.id
    left join public.services s on s.id = i.service_id
    where c.tenant_id = v_tenant
      and c.status = 'fechada'
      and c.fechada_em::date between p_de and p_ate
      and (p_professional_id is null or c.professional_id = p_professional_id)
      and (p_service_id is null or i.service_id = p_service_id)
  ),
  tot as (
    select coalesce(sum(quantidade * valor_unitario), 0)::numeric(12,2) as total,
           count(distinct comanda_id) as num,
           count(distinct client_id) filter (where client_id is not null) as num_clientes,
           coalesce(sum(quantidade) filter (where tipo = 'servico'), 0) as num_servicos
    from itens
  ),
  por_dia as (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.dia), '[]'::jsonb) as j
    from (
      select dia, sum(quantidade * valor_unitario)::numeric(12,2) as valor
      from itens group by dia
    ) x
  ),
  por_servico as (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.valor desc), '[]'::jsonb) as j
    from (
      select servico_nome as nome,
             sum(quantidade) as qtd,
             sum(quantidade * valor_unitario)::numeric(12,2) as valor
      from itens group by servico_nome
    ) x
  ),
  por_pagamento as (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.valor desc), '[]'::jsonb) as j
    from (
      select pm.forma, sum(pm.valor)::numeric(12,2) as valor
      from public.payments pm
      join public.comandas c on c.id = pm.comanda_id
      where p_service_id is null
        and c.tenant_id = v_tenant
        and c.status = 'fechada'
        and c.fechada_em::date between p_de and p_ate
        and (p_professional_id is null or c.professional_id = p_professional_id)
      group by pm.forma
    ) x
  )
  select jsonb_build_object(
    'total', tot.total,
    'num_comandas', tot.num,
    'num_clientes', tot.num_clientes,
    'num_servicos', tot.num_servicos,
    'ticket_medio', case when tot.num > 0 then round(tot.total / tot.num, 2) else 0 end,
    'por_dia', por_dia.j,
    'por_servico', por_servico.j,
    'por_pagamento', por_pagamento.j
  )
  into v_result
  from tot, por_dia, por_servico, por_pagamento;

  return v_result;
end;
$$;

revoke all on function public.relatorio_vendas(date, date, uuid, uuid) from public;
grant execute on function public.relatorio_vendas(date, date, uuid, uuid) to authenticated;

-- --------------------------------------------------------------
-- B. comissoes_periodo — série diária da comissão
-- --------------------------------------------------------------

create or replace function public.comissoes_periodo(
  p_de              date,
  p_ate             date,
  p_professional_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_result jsonb;
begin
  if not public.has_section('financeiro') then
    if public.my_professional_id() is null
       or p_professional_id is null
       or p_professional_id <> public.my_professional_id() then
      raise exception 'Sem permissão para ver comissões.' using errcode = '42501';
    end if;
  end if;

  with base as (
    select k.id as comissao_id,
           k.professional_id,
           k.profissional_nome,
           k.percentual,
           k.base_servicos,
           k.valor,
           k.status,
           k.fechada_em,
           cl.nome as cliente_nome
    from public.comissoes k
    left join public.comandas c on c.id = k.comanda_id
    left join public.clients cl on cl.id = c.client_id
    where k.tenant_id = v_tenant
      and k.fechada_em::date between p_de and p_ate
      and (p_professional_id is null or k.professional_id = p_professional_id)
  ),
  por_dia as (
    select professional_id,
           coalesce(jsonb_agg(
             jsonb_build_object('dia', dia, 'valor', valor) order by dia
           ), '[]'::jsonb) as j
    from (
      select professional_id, fechada_em::date as dia, sum(valor)::numeric(12,2) as valor
      from base
      group by professional_id, fechada_em::date
    ) t
    group by professional_id
  ),
  linhas as (
    select professional_id,
           max(profissional_nome) as nome,
           max(percentual) as percentual,
           sum(base_servicos)::numeric(12,2) as faturamento,
           sum(valor)::numeric(12,2) as total,
           sum(valor) filter (where status = 'pago')::numeric(12,2) as pago,
           sum(valor) filter (where status = 'a_pagar')::numeric(12,2) as a_pagar,
           coalesce(jsonb_agg(
             jsonb_build_object(
               'comissao_id', comissao_id,
               'fechada_em', fechada_em,
               'cliente_nome', cliente_nome,
               'valor', valor,
               'status', status
             ) order by fechada_em desc
           ), '[]'::jsonb) as comandas
    from base
    group by professional_id
  )
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'professional_id', l.professional_id,
             'nome', l.nome,
             'percentual', l.percentual,
             'faturamento', l.faturamento,
             'total', l.total,
             'pago', coalesce(l.pago, 0),
             'a_pagar', coalesce(l.a_pagar, 0),
             'comandas', l.comandas,
             'por_dia', coalesce(pd.j, '[]'::jsonb)
           ) order by coalesce(l.a_pagar, 0) desc, l.total desc
         ), '[]'::jsonb)
  into v_result
  from linhas l
  left join por_dia pd on pd.professional_id = l.professional_id;

  return v_result;
end;
$$;

revoke all on function public.comissoes_periodo(date, date, uuid) from public;
grant execute on function public.comissoes_periodo(date, date, uuid) to authenticated;

-- marcar_comissoes_pagas: mesmo recorte de fuso das leituras
create or replace function public.marcar_comissoes_pagas(
  p_professional_id uuid,
  p_de              date,
  p_ate             date
)
returns integer
language plpgsql
security definer
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
declare
  v_n integer;
begin
  if not public.has_section('financeiro') then
    raise exception 'Sem permissão para dar baixa em comissões.' using errcode = '42501';
  end if;

  update public.comissoes
  set status = 'pago', pago_em = now()
  where tenant_id = public.current_tenant_id()
    and professional_id = p_professional_id
    and status = 'a_pagar'
    and fechada_em::date between p_de and p_ate;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.marcar_comissoes_pagas(uuid, date, date) from public;
grant execute on function public.marcar_comissoes_pagas(uuid, date, date) to authenticated;

-- --------------------------------------------------------------
-- C. RLS de clients — visibilidade por vínculo de profissional
--
--    dono / funcionário SEM profissional vinculado (gerente,
--    recepção): vê e gerencia todos os clientes, como antes.
--    profissional vinculado (barbeiro): só vê os clientes que já
--    têm/tiveram agendamento com ele; não cria/edita/exclui.
-- --------------------------------------------------------------

drop policy if exists "clients: ver do tenant" on public.clients;
drop policy if exists "clients: ver conforme vínculo" on public.clients;
create policy "clients: ver conforme vínculo"
  on public.clients for select
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.is_owner()
      or public.my_professional_id() is null
      or exists (
        select 1 from public.appointments a
        where a.client_id = clients.id
          and a.professional_id = public.my_professional_id()
      )
    )
  );

drop policy if exists "clients: gerenciar com permissão" on public.clients;
drop policy if exists "clients: gerenciar (acesso amplo)" on public.clients;
create policy "clients: gerenciar (acesso amplo)"
  on public.clients for all
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.is_owner()
      or (public.has_section('clientes') and public.my_professional_id() is null)
    )
  )
  with check (
    tenant_id = public.current_tenant_id()
    and (
      public.is_owner()
      or (public.has_section('clientes') and public.my_professional_id() is null)
    )
  );
