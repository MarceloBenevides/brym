import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth";
import { stripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Abre o Customer Portal do Stripe (trocar cartão / plano / cancelar). Só o
 * dono, e só se o negócio já tem um customer no Stripe. Não usa `requireOwner`
 * de propósito: um dono com assinatura vencida precisa chegar aqui pra
 * regularizar, e o gate de `requireApp` o mandaria de volta pra /assinar.
 */
export async function POST(req: Request) {
  const ctx = await getAppContext();
  if (!ctx?.profile || !ctx.tenant) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }
  if (!ctx.isOwner) {
    return NextResponse.redirect(new URL("/agenda", req.url), 303);
  }
  if (ctx.tenant.gateway !== "stripe" || !ctx.tenant.gateway_customer_id) {
    return NextResponse.redirect(new URL("/assinar", req.url), 303);
  }

  const origin = new URL(req.url).origin;
  try {
    const session = await stripeClient().billingPortal.sessions.create({
      customer: ctx.tenant.gateway_customer_id,
      return_url: `${origin}/assinar`,
    });
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error("[stripe portal] erro:", (err as Error).message);
    return NextResponse.redirect(new URL("/assinar?portal=erro", req.url), 303);
  }
}
