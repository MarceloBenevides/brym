"use server";

import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth";
import { cancelarAssinatura, criarAssinatura } from "@/lib/asaas";
import { validarCpfCnpj } from "@/lib/documento";
import { isPlano } from "@/lib/planos";
import { createClient } from "@/lib/supabase/server";

/**
 * Salva o CPF/CNPJ do negócio (necessário pra criar a assinatura no Asaas).
 * Passo único — depois de salvo, os planos aparecem direto.
 */
export async function salvarCpfAction(formData: FormData) {
  const ctx = await getAppContext();
  if (!ctx?.profile || !ctx.tenant || !ctx.isOwner) redirect("/assinar");

  const doc = validarCpfCnpj(formData.get("cpf_cnpj") as string);
  if (!doc.valido) redirect("/assinar?erro=cpf");

  const supabase = await createClient();
  await supabase
    .from("tenants")
    .update({ cpf_cnpj: doc.limpo })
    .eq("id", ctx.tenant.id);

  redirect("/assinar");
}

/**
 * Cria a assinatura recorrente no Asaas e manda o dono pra página de pagamento
 * (Pix / boleto / cartão, escolha dele). Não usa `requireOwner` — o gate de
 * `requireApp` mandaria um dono com assinatura vencida de volta pra cá.
 */
export async function assinarPlanoAction(formData: FormData) {
  const ctx = await getAppContext();
  if (!ctx?.profile || !ctx.tenant || !ctx.isOwner) redirect("/assinar");

  const plano = formData.get("plano");
  if (!isPlano(plano)) redirect("/assinar");

  const cpf = ctx.tenant.cpf_cnpj;
  if (!cpf || !validarCpfCnpj(cpf).valido) redirect("/assinar?erro=cpf");

  // Trocar de plano = cancelar a assinatura atual do Asaas antes de abrir a nova.
  if (ctx.tenant.gateway === "asaas" && ctx.tenant.gateway_subscription_id) {
    try {
      await cancelarAssinatura(ctx.tenant.gateway_subscription_id);
    } catch (err) {
      console.error("[assinar] falha ao cancelar assinatura anterior:", err);
    }
  }

  let assinatura;
  try {
    assinatura = await criarAssinatura({
      tenantId: ctx.tenant.id,
      plano,
      nome: ctx.tenant.nome,
      email: ctx.profile.email,
      cpfCnpj: cpf,
      customerIdExistente:
        ctx.tenant.gateway === "asaas" ? ctx.tenant.gateway_customer_id : null,
    });
  } catch (err) {
    console.error("[assinar] falha ao criar assinatura no Asaas:", err);
    redirect("/assinar?erro=asaas");
  }

  const supabase = await createClient();
  await supabase
    .from("tenants")
    .update({
      gateway: "asaas",
      gateway_customer_id: assinatura.customerId,
      gateway_subscription_id: assinatura.subscriptionId,
      plano,
    })
    .eq("id", ctx.tenant.id);

  redirect(assinatura.invoiceUrl);
}

export async function cancelarAssinaturaAction() {
  const ctx = await getAppContext();
  if (!ctx?.profile || !ctx.tenant || !ctx.isOwner) redirect("/assinar");
  if (!ctx.tenant.gateway_subscription_id) redirect("/assinar");

  try {
    await cancelarAssinatura(ctx.tenant.gateway_subscription_id);
  } catch (err) {
    console.error("[assinar] falha ao cancelar assinatura:", err);
    redirect("/assinar?erro=asaas");
  }
  redirect("/assinar?cancelada=1");
}
