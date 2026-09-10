import "server-only";

import Stripe from "stripe";

/**
 * Cliente Stripe (server-only), instanciado sob demanda. A `STRIPE_SECRET_KEY`
 * fica só no ambiente do servidor. Lazy porque o construtor do SDK lança quando
 * a chave está vazia — e no build/coleta de rotas ela pode não estar presente.
 */
let _stripe: Stripe | null = null;

export function stripeClient(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurada no ambiente do servidor.",
    );
  }
  _stripe = new Stripe(key, {
    apiVersion: "2026-08-26.dahlia",
    appInfo: { name: "BRYM" },
  });
  return _stripe;
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export const temStripe = Boolean(process.env.STRIPE_SECRET_KEY);
