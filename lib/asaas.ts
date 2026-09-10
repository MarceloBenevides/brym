import "server-only";

import { PLANOS } from "@/lib/planos";
import type { PlanoAssinatura } from "@/types/database";

const SANDBOX = "https://api-sandbox.asaas.com/v3";
const PROD = "https://api.asaas.com/v3";

function base(): string {
  return process.env.ASAAS_ENV === "production" ? PROD : SANDBOX;
}

export const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN ?? "";
export const temAsaas = Boolean(process.env.ASAAS_API_KEY);

async function asaasFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada no ambiente do servidor.");

  const headers = {
    access_token: key,
    "Content-Type": "application/json",
    "User-Agent": "BRYM/1.0 (Next.js; assinatura)",
    ...init?.headers,
  };

  let ultimoErro = "";
  // O sandbox às vezes devolve "erro desconhecido" transitório — 1 retry.
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const res = await fetch(`${base()}${path}`, { ...init, headers });
    const texto = await res.text();
    if (res.ok) return texto ? (JSON.parse(texto) as T) : ({} as T);
    ultimoErro = `${res.status}: ${texto}`;
    if (res.status < 500 && !texto.includes("unknow")) break;
  }
  throw new Error(`Asaas ${init?.method ?? "GET"} ${path} → ${ultimoErro}`);
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface AsaasCustomer {
  id: string;
}
interface AsaasSubscription {
  id: string;
}
interface AsaasPaymentList {
  data?: { invoiceUrl?: string; id?: string }[];
}

export interface AssinaturaAsaas {
  customerId: string;
  subscriptionId: string;
  /** Página hospedada da 1ª cobrança — onde o dono paga (Pix / boleto / cartão). */
  invoiceUrl: string;
}

/**
 * O Asaas Checkout recorrente só aceita cartão. Pra recorrência com Pix o
 * caminho é: criar o cliente (exige CPF/CNPJ) → criar a assinatura
 * (`billingType: "UNDEFINED"`, o pagador escolhe a forma por cobrança) → mandar
 * o dono pra `invoiceUrl` da 1ª cobrança. `externalReference = tenantId` volta
 * em todos os eventos de webhook.
 */
export async function criarAssinatura(params: {
  tenantId: string;
  plano: PlanoAssinatura;
  nome: string;
  email: string | null;
  cpfCnpj: string;
  customerIdExistente?: string | null;
}): Promise<AssinaturaAsaas> {
  const p = PLANOS[params.plano];

  let customerId = params.customerIdExistente ?? "";
  if (!customerId) {
    const cliente = await asaasFetch<AsaasCustomer>("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: params.nome,
        cpfCnpj: params.cpfCnpj,
        email: params.email ?? undefined,
        externalReference: params.tenantId,
      }),
    });
    customerId = cliente.id;
  }

  const assinatura = await asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType: "UNDEFINED",
      value: p.valorReais,
      nextDueDate: hojeISO(),
      cycle: "MONTHLY",
      description: `BRYM · plano ${p.nome}`,
      externalReference: params.tenantId,
    }),
  });

  const cobrancas = await asaasFetch<AsaasPaymentList>(
    `/subscriptions/${assinatura.id}/payments?limit=1`,
  );
  const invoiceUrl = cobrancas.data?.[0]?.invoiceUrl;
  if (!invoiceUrl) {
    throw new Error(
      `Asaas: assinatura ${assinatura.id} criada mas sem cobrança pra pagar.`,
    );
  }

  return { customerId, subscriptionId: assinatura.id, invoiceUrl };
}

/** Cancela a assinatura no Asaas. O acesso segue até o fim do período pago. */
export async function cancelarAssinatura(subscriptionId: string): Promise<void> {
  await asaasFetch(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
}
