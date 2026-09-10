-- ==============================================================
-- BRYM · Migration 0021 — Custo (valor de compra) do produto
-- Ajuste pós-Fase 4. Aplicar depois da 0020, no SQL Editor.
--
-- `products.custo` = valor de compra, ao lado do `preco` (valor de venda).
-- `comanda_items.custo_unitario` = snapshot do custo no momento da venda
-- (mesmo padrão do `valor_unitario`), pra a margem histórica não mudar se o
-- custo do produto for editado depois. Nullable: itens de serviço e vendas
-- feitas antes desta migration ficam sem custo registrado.
-- ==============================================================

alter table public.products
  add column if not exists custo numeric(10,2) not null default 0 check (custo >= 0);

alter table public.comanda_items
  add column if not exists custo_unitario numeric(10,2);
