import type { StatusComissao } from "@/types/database";

/** Uma comanda que gerou comissão (dentro de `ComissaoProfissional.comandas`). */
export interface ComissaoComanda {
  comissao_id: string;
  fechada_em: string;
  cliente_nome: string | null;
  valor: number;
  status: StatusComissao;
}

/** Apuração de comissão de um profissional no período (retorno da RPC). */
export interface ComissaoProfissional {
  professional_id: string;
  nome: string;
  percentual: number;
  /** Faturamento em serviços que serviu de base. */
  faturamento: number;
  total: number;
  pago: number;
  a_pagar: number;
  comandas: ComissaoComanda[];
  /** Comissão somada por dia (para o gráfico de "Meu desempenho"). */
  por_dia: { dia: string; valor: number }[];
}

export function somaComissoes(linhas: ComissaoProfissional[]) {
  return linhas.reduce(
    (acc, l) => ({
      faturamento: acc.faturamento + l.faturamento,
      total: acc.total + l.total,
      pago: acc.pago + l.pago,
      a_pagar: acc.a_pagar + l.a_pagar,
    }),
    { faturamento: 0, total: 0, pago: 0, a_pagar: 0 },
  );
}
