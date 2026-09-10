/**
 * Tradução pura "tipo de evento do Stripe" -> ação na assinatura do tenant.
 * Sem I/O, sem imports de runtime — testável isolada e usada pelo webhook
 * (`app/api/stripe/webhook`).
 */

export type AcaoAssinatura =
  | "ativar" // 1ª ativação (checkout concluído)
  | "renovar" // fatura recorrente paga
  | "atualizar" // mudança de plano / cancelamento agendado
  | "atraso" // fatura recorrente falhou (entra a carência de 7 dias)
  | "encerrar" // assinatura removida no Stripe
  | "ignorar"; // evento sem efeito no acesso

/**
 * `billing_reason` filtra a 1ª fatura (`subscription_create`, já coberta pelo
 * `checkout.session.completed`) das renovações de fato.
 */
export function acaoPorEvento(
  tipo: string,
  billingReason?: string | null,
): AcaoAssinatura {
  switch (tipo) {
    case "checkout.session.completed":
      return "ativar";
    case "invoice.paid":
      return billingReason === "subscription_create" ? "ignorar" : "renovar";
    case "invoice.payment_failed":
      return billingReason === "subscription_create" ? "ignorar" : "atraso";
    case "customer.subscription.updated":
      return "atualizar";
    case "customer.subscription.deleted":
      return "encerrar";
    default:
      return "ignorar";
  }
}
