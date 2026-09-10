/**
 * Tradução pura "evento do Asaas" -> ação na assinatura do tenant. Sem I/O —
 * testável isolada, usada pelo webhook (`app/api/asaas/webhook`).
 *
 * As `acao`s são as mesmas do genérico (`assinatura_processar_evento`):
 * ativar / renovar / atualizar / atraso / encerrar / ignorar.
 */
import type { AcaoAssinatura } from "@/lib/stripe-eventos";

export type { AcaoAssinatura };

const ENCERRAM = new Set([
  "PAYMENT_REFUNDED",
  "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
  "PAYMENT_DELETED",
  "SUBSCRIPTION_DELETED",
]);

const ATIVAM = new Set([
  // PIX cai direto em RECEIVED; cartão passa por CONFIRMED (garantido) antes.
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_RECEIVED_IN_CASH",
  "CHECKOUT_PAID",
]);

export function acaoPorEventoAsaas(tipo: string): AcaoAssinatura {
  if (ATIVAM.has(tipo)) return "ativar";
  if (tipo === "PAYMENT_OVERDUE") return "atraso";
  if (ENCERRAM.has(tipo)) return "encerrar";
  return "ignorar";
}
