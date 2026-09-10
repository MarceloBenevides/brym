import type {
  ComandaItemRow,
  FormaPagamento,
  PaymentRow,
} from "@/types/database";

export const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Cartão de débito" },
  { value: "credito", label: "Cartão de crédito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "saldo", label: "Saldo na casa" },
];

export function formaLabel(v: string): string {
  return FORMAS_PAGAMENTO.find((f) => f.value === v)?.label ?? v;
}

export function totalItens(
  itens: Pick<ComandaItemRow, "quantidade" | "valor_unitario">[],
): number {
  return itens.reduce(
    (s, i) => s + Number(i.quantidade) * Number(i.valor_unitario),
    0,
  );
}

export function totalPago(pagamentos: Pick<PaymentRow, "valor">[]): number {
  return pagamentos.reduce((s, p) => s + Number(p.valor), 0);
}

/** Positivo = falta pagar. Negativo = troco. */
export function restante(
  itens: Pick<ComandaItemRow, "quantidade" | "valor_unitario">[],
  pagamentos: Pick<PaymentRow, "valor">[],
): number {
  return Math.round((totalItens(itens) - totalPago(pagamentos)) * 100) / 100;
}
