-- ==============================================================
-- BRYM · Migration 0022 — Relatório de produtos (com margem)
-- Ajuste pós-Fase 4. Aplicar depois da 0021, no SQL Editor.
--
-- `relatorio_produtos` = mesma ideia do "Vendas por produto" de
-- `relatorio_vendas`, mas: (a) acessível por quem tem a seção 'produtos'
-- (não exige 'financeiro') e (b) com margem = faturamento − custo, usando o
-- `custo_unitario` congelado no momento da venda (Fatia B / migration 0021).
-- SECURITY DEFINER porque a RLS de `comandas` restringe a "financeiro OU
-- profissional dono", o que bloquearia quem só tem a seção 'produtos'.
-- ==============================================================

create or replace function public.relatorio_produtos(
  p_de  date,
  p_ate date
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
  if not (public.is_owner() or public.has_section('produtos')) then
    raise exception 'Sem permissão para ver este relatório.' using errcode = '42501';
  end if;

  with itens as (
    select coalesce(i.product_id::text, 'desc:' || coalesce(i.descricao, '')) as chave,
           coalesce(p.nome, i.descricao, 'Produto removido') as nome,
           i.quantidade,
           i.valor_unitario,
           i.custo_unitario
    from public.comandas c
    join public.comanda_items i on i.comanda_id = c.id
    left join public.products p on p.id = i.product_id
    where c.tenant_id = v_tenant
      and c.status = 'fechada'
      and c.fechada_em::date between p_de and p_ate
      and i.tipo = 'produto'
  ),
  por_produto as (
    select chave,
           max(nome) as nome,
           sum(quantidade) as qtd,
           sum(quantidade * valor_unitario)::numeric(12,2) as faturamento,
           (sum(quantidade * custo_unitario) filter (where custo_unitario is not null))::numeric(12,2) as custo_total,
           -- só considera a margem "confiável" quando TODAS as vendas do produto
           -- no período têm custo gravado (uma venda anterior à Fatia B zera isso
           -- pro período que a inclui — se resolve sozinho em períodos recentes).
           bool_and(custo_unitario is not null) as custo_registrado
    from itens
    group by chave
  ),
  agg as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'nome', nome,
             'qtd', qtd,
             'faturamento', faturamento,
             'custo_total', custo_total,
             'margem', case when custo_registrado
                            then (faturamento - coalesce(custo_total, 0))::numeric(12,2)
                            else null end,
             'custo_registrado', custo_registrado
           ) order by faturamento desc), '[]'::jsonb) as j,
           coalesce(sum(faturamento), 0)::numeric(12,2) as total_faturamento,
           coalesce(sum(case when custo_registrado
                             then faturamento - coalesce(custo_total, 0)
                             else 0 end), 0)::numeric(12,2) as total_margem
    from por_produto
  )
  select jsonb_build_object(
    'itens', agg.j,
    'total_faturamento', agg.total_faturamento,
    'total_margem', agg.total_margem
  )
  into v_result
  from agg;

  return v_result;
end;
$$;

revoke all on function public.relatorio_produtos(date, date) from public;
grant execute on function public.relatorio_produtos(date, date) to authenticated;
