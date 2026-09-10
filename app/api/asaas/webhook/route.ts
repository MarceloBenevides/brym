import { NextResponse } from "next/server";

import { ASAAS_WEBHOOK_TOKEN } from "@/lib/asaas";
import { acaoPorEventoAsaas, type AcaoAssinatura } from "@/lib/asaas-eventos";
import { planoPorValorReais } from "@/lib/planos";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIAS_CICLO_MS = 33 * 24 * 60 * 60 * 1000; // 1 mês + folga
const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

type ServiceClient = ReturnType<typeof createServiceClient>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AsaasPayment {
  id?: string;
  customer?: string;
  subscription?: string;
  value?: number;
  status?: string;
  paymentDate?: string;
  dueDate?: string;
  externalReference?: string;
  invoiceUrl?: string;
}

interface AsaasCheckout {
  id?: string;
  customer?: string;
  subscription?: string | { id?: string };
  value?: number;
  externalReference?: string;
}

interface AsaasEvent {
  id?: string;
  event?: string;
  payment?: AsaasPayment;
  checkout?: AsaasCheckout;
}

export async function POST(req: Request) {
  const token = req.headers.get("asaas-access-token");
  if (!ASAAS_WEBHOOK_TOKEN || token !== ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "token inválido" }, { status: 401 });
  }

  let event: AsaasEvent;
  try {
    event = (await req.json()) as AsaasEvent;
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  if (!event.id || !event.event) {
    return NextResponse.json({ error: "evento sem id/tipo" }, { status: 400 });
  }

  const db = createServiceClient();
  const acao = await montarAcao(event, db);

  const { error, data } = await db.rpc("assinatura_processar_evento", {
    p_gateway: "asaas",
    p_event_id: event.id,
    p_tipo: event.event,
    p_acao: acao.acao,
    p_tenant_id: acao.tenantId,
    p_plano: acao.plano,
    p_customer: acao.customer,
    p_subscription: acao.subscription,
    p_ativa_ate: acao.ativaAte,
    p_cancelar_no_fim: false,
    p_payload: acao.payload,
  });

  if (error) {
    console.error("[asaas webhook] erro no RPC:", error);
    return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
  }

  return NextResponse.json({ received: true, resultado: data });
}

// --------------------------------------------------------------

interface Acao {
  acao: AcaoAssinatura;
  tenantId: string | null;
  plano: string | null;
  customer: string | null;
  subscription: string | null;
  ativaAte: string | null;
  payload: Record<string, unknown> | null;
}

async function montarAcao(event: AsaasEvent, db: ServiceClient): Promise<Acao> {
  const acao = acaoPorEventoAsaas(event.event ?? "");
  const p = event.payment;
  const c = event.checkout;

  const customer = p?.customer ?? c?.customer ?? null;
  const subscription =
    p?.subscription ??
    (typeof c?.subscription === "string" ? c.subscription : c?.subscription?.id) ??
    null;
  const ref = p?.externalReference ?? c?.externalReference ?? null;
  const valor = p?.value ?? c?.value ?? null;

  const base: Acao = {
    acao,
    tenantId: null,
    plano: planoPorValorReais(valor),
    customer,
    subscription,
    ativaAte: null,
    payload: {
      email: null,
      plano: planoPorValorReais(valor),
      valor,
      customer,
      subscription,
      ativa_ate: null as string | null,
    },
  };

  if (acao === "ignorar") return base;

  base.tenantId = await resolverTenant(db, { ref, customer, subscription });

  if (acao === "ativar") {
    const quando = p?.paymentDate ? new Date(p.paymentDate) : new Date();
    base.ativaAte = new Date(quando.getTime() + DIAS_CICLO_MS).toISOString();
  } else if (acao === "atraso") {
    base.ativaAte = new Date(Date.now() + SETE_DIAS_MS).toISOString();
  } else if (acao === "encerrar") {
    base.ativaAte = new Date().toISOString();
  }
  if (base.payload) base.payload.ativa_ate = base.ativaAte;

  return base;
}

async function resolverTenant(
  db: ServiceClient,
  ids: { ref: string | null; customer: string | null; subscription: string | null },
): Promise<string | null> {
  if (ids.ref && UUID_RE.test(ids.ref)) {
    const { data } = await db
      .from("tenants")
      .select("id")
      .eq("id", ids.ref)
      .maybeSingle();
    if ((data as { id: string } | null)?.id) return ids.ref;
  }
  if (ids.customer) {
    const { data } = await db
      .from("tenants")
      .select("id")
      .eq("gateway_customer_id", ids.customer)
      .maybeSingle();
    if ((data as { id: string } | null)?.id) return (data as { id: string }).id;
  }
  if (ids.subscription) {
    const { data } = await db
      .from("tenants")
      .select("id")
      .eq("gateway_subscription_id", ids.subscription)
      .maybeSingle();
    if ((data as { id: string } | null)?.id) return (data as { id: string }).id;
  }
  return null;
}
