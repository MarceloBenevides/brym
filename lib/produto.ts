import type { ProductRow, TipoMovimento } from "@/types/database";

export const TIPO_MOVIMENTO_LABEL: Record<TipoMovimento, string> = {
  entrada: "Entrada",
  saida: "Saída",
  venda: "Venda",
  devolucao: "Devolução",
  ajuste: "Contagem",
};

/** O produto controla estoque e está no mínimo ou abaixo? */
export function estoqueBaixo(
  p: Pick<ProductRow, "controla_estoque" | "estoque_atual" | "estoque_min">,
): boolean {
  return p.controla_estoque && p.estoque_atual <= p.estoque_min;
}

export interface RelatorioProdutoItem {
  nome: string;
  qtd: number;
  faturamento: number;
  custo_total: number | null;
  margem: number | null;
  /** false = alguma venda desse produto no período é anterior ao campo custo (Fatia B) */
  custo_registrado: boolean;
}

export interface RelatorioProdutos {
  itens: RelatorioProdutoItem[];
  total_faturamento: number;
  total_margem: number;
}

export const RELATORIO_PRODUTOS_VAZIO: RelatorioProdutos = {
  itens: [],
  total_faturamento: 0,
  total_margem: 0,
};
