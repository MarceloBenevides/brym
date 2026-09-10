-- ==============================================================
-- BRYM · Migration 0011 — Relatórios de vendas
-- Fase 2c. Aplicar depois da 0010, no SQL Editor.
--
-- Só comandas FECHADAS entram no faturamento (dinheiro que entrou).
-- A RPC é parametrizável por serviço e por profissional — a 2d
-- ("Meu desempenho") reusa a mesma função com o próprio professionalId.
-- ==============================================================

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
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_result jsonb;
begin
  -- Guarda: dono/financeiro veem tudo; funcionário só o próprio profissional.
  if not public.has_section('financeiro') then
    if public.my_professional_id() is null
       or p_professional_id is null
       or p_professional_id <> public.my_professional_id() then
      raise exception 'Sem permissão para ver este relatório.' using errcode = '42501';
    end if;
  end if;

  with itens as (
    select c.id as comanda_id,
           c.fechada_em::date as dia,
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
           count(distinct comanda_id) as num
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
