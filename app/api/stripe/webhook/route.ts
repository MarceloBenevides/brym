import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { planoPorValorCentavos } from "@/lib/planos";
import { stripeClient, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { acaoPorEvento, type AcaoAssinatura } from "@/lib/stripe-eventos";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

type ServiceClient = ReturnType<typeof createServiceClient>;

interface Acao {
  acao: AcaoAssinatura;
  tenantId: string | null;
  plano: string | null;
  customer: string | null;
  subscription: string | null;
  ativaAte: string | null;
  cancelarNoFim: boolean;
  payload: Record<string, unknown> | null;
}

const IGNORAR: Acao = {
  acao: "ignorar",
  tenantId: null,
  plano: null,
  customer: null,
  subscription: null,
  ativaAte: null,
  cancelarNoFim: false,
  payload: null,
};

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "webhook do Stripe não configurado" },
      { status: 400 },
    );
  }

  let stripe: Stripe;
  let event: Stripe.Event;
  try {
    stripe = stripeClient();
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe webhook] rejeitado:", (err as Error).message);
    return NextResponse.json({ error: "assinatura inválida" }, { status: 400 });
  }

  const db = createServiceClient();

  let acao: Acao;
  try {
    acao = await montarAcao(event, stripe, db);
  } catch (err) {
    console.error("[stripe webhook] erro montando ação:", err);
    return NextResponse.json({ error: "erro ao interpretar o evento" }, { status: 500 });
  }

  const { error, data } = await db.rpc("assinatura_processar_evento", {
    p_gateway: "stripe",
    p_event_id: event.id,
    p_tipo: event.type,
    p_acao: acao.acao,
    p_tenant_id: acao.tenantId,
    p_plano: acao.plano,
    p_customer: acao.customer,
    p_subscription: acao.subscription,
    p_ativa_ate: acao.ativaAte,
    p_cancelar_no_fim: acao.cancelarNoFim,
    p_payload: acao.payload,
  });

  if (error) {
    console.error("[stripe webhook] erro no RPC:", error);
    return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
  }

  return NextResponse.json({ received: true, resultado: data });
}

// --------------------------------------------------------------

async function montarAcao(
  event: Stripe.Event,
  stripe: Stripe,
  db: ServiceClient,
): Promise<Acao> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") return IGNORAR;

      const customer = idDe(session.customer);
      const subscription = idDe(session.subscription);
      const sub = subscription
        ? await stripe.subscriptions.retrieve(subscription)
        : null;

      const plano = planoPorValorCentavos(session.amount_total);
      const ativaAte = fimDoPeriodo(sub);
      const tenantId = await resolverTenant(db, session);

      return {
        acao: "ativar",
        tenantId,
        plano,
        customer,
        subscription,
        ativaAte,
        cancelarNoFim: sub?.cancel_at_period_end ?? false,
        payload: {
          email: session.customer_details?.email ?? session.customer_email ?? null,
          plano,
          valor: session.amount_total,
          customer,
          subscription,
          ativa_ate: ativaAte,
        },
      };
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      if (acaoPorEvento(event.type, invoice.billing_reason) === "ignorar") {
        return IGNORAR;
      }
      const customer = idDe(invoice.customer);
      const tenantId = await tenantPorCustomer(db, customer);
      const subscription = await subscriptionDoTenant(db, tenantId);
      const sub = subscription
        ? await stripe.subscriptions.retrieve(subscription)
        : null;

      return {
        ...IGNORAR,
        acao: "renovar",
        tenantId,
        customer,
        subscription,
        plano: null,
        ativaAte: fimDoPeriodo(sub),
        cancelarNoFim: sub?.cancel_at_period_end ?? false,
      };
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (acaoPorEvento(event.type, invoice.billing_reason) === "ignorar") {
        return IGNORAR;
      }
      const customer = idDe(invoice.customer);
      const tenantId = await tenantPorCustomer(db, customer);
      return {
        ...IGNORAR,
        acao: "atraso",
        tenantId,
        customer,
        ativaAte: new Date(Date.now() + SETE_DIAS_MS).toISOString(),
      };
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customer = idDe(sub.customer);
      const tenantId = await tenantPorCustomer(db, customer);
      return {
        ...IGNORAR,
        acao: "atualizar",
        tenantId,
        customer,
        subscription: sub.id,
        plano: null,
        ativaAte: fimDoPeriodo(sub),
        cancelarNoFim: sub.cancel_at_period_end ?? false,
      };
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customer = idDe(sub.customer);
      const tenantId = await tenantPorCustomer(db, customer);
      return {
        ...IGNORAR,
        acao: "encerrar",
        tenantId,
        customer,
        ativaAte: new Date().toISOString(),
      };
    }

    default:
      return IGNORAR;
  }
}

// --------------------------------------------------------------

function idDe(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.id;
}

/** Fim do período atual (na API dahlia isso vive no item da subscription). */
function fimDoPeriodo(sub: Stripe.Subscription | null): string | null {
  const seg = sub?.items?.data?.[0]?.current_period_end;
  return seg ? new Date(seg * 1000).toISOString() : null;
}

async function tenantPorCustomer(
  db: ServiceClient,
  customerId: string | null,
): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await db
    .from("tenants")
    .select("id")
    .eq("gateway_customer_id", customerId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function subscriptionDoTenant(
  db: ServiceClient,
  tenantId: string | null,
): Promise<string | null> {
  if (!tenantId) return null;
  const { data } = await db
    .from("tenants")
    .select("gateway_subscription_id")
    .eq("id", tenantId)
    .maybeSingle();
  return (
    (data as { gateway_subscription_id: string | null } | null)
      ?.gateway_subscription_id ?? null
  );
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolverTenant(
  db: ServiceClient,
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const ref = session.client_reference_id;
  if (ref && UUID_RE.test(ref)) {
    const { data } = await db
      .from("tenants")
      .select("id")
      .eq("id", ref)
      .maybeSingle();
    if ((data as { id: string } | null)?.id) return ref;
  }

  const email = session.customer_details?.email ?? session.customer_email;
  if (email) {
    const { data } = await db
      .from("profiles")
      .select("tenant_id")
      .eq("papel", "owner")
      .ilike("email", email)
      .not("tenant_id", "is", null)
      .limit(1)
      .maybeSingle();
    const tid = (data as { tenant_id: string | null } | null)?.tenant_id;
    if (tid) return tid;
  }

  return null;
}
