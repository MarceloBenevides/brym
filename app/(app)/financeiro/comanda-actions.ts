"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireComanda, requireSection } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";

export interface ComandaFormState {
  error?: string;
  ok?: boolean;
}

function revalida(comandaId: string) {
  revalidatePath(`/financeiro/comandas/${comandaId}`);
  revalidatePath("/financeiro");
  revalidatePath("/agenda");
}

// --------------------------------------------------------------
// Abrir comanda a partir de um agendamento
// --------------------------------------------------------------
export async function abrirComandaAction(formData: FormData) {
  const appointmentId = String(formData.get("appointment_id") ?? "");
  if (!appointmentId) return;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("abrir_comanda", {
    p_appointment_id: appointmentId,
  });
  if (error || !data) {
    redirect("/agenda?erro=comanda");
  }
  revalidatePath("/agenda");
  redirect(`/financeiro/comandas/${data}`);
}

// --------------------------------------------------------------
// Abrir venda avulsa (comanda de balcão, sem agendamento — só produto)
// --------------------------------------------------------------
export async function abrirVendaAvulsaAction() {
  await requireSection("financeiro");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("abrir_venda_avulsa");
  if (error || !data) {
    redirect("/financeiro?erro=venda");
  }
  revalidatePath("/financeiro");
  redirect(`/financeiro/comandas/${data}`);
}

// --------------------------------------------------------------
// Itens
// --------------------------------------------------------------
const servicoSchema = z.object({
  descricao: z.string().trim().min(2, "Descreva o item."),
  quantidade: z.coerce.number().int().min(1).max(99),
  valor_unitario: z.coerce.number().min(0, "Valor inválido."),
  service_id: z.uuid().nullable().catch(null),
});

export async function addItemAction(
  _prev: ComandaFormState,
  formData: FormData,
): Promise<ComandaFormState> {
  const comandaId = String(formData.get("comanda_id") ?? "");
  const { comanda } = await requireComanda(comandaId);
  if (comanda.status !== "aberta") {
    return { error: "A comanda está fechada." };
  }

  const supabase = await createClient();

  // ---- Produto: preço e descrição vêm do servidor (não confia no cliente) ----
  if (formData.get("tipo") === "produto") {
    const productId = String(formData.get("product_id") ?? "");
    const quantidade = Math.trunc(Number(formData.get("quantidade") ?? 1)) || 1;
    if (!/^[0-9a-f-]{36}$/i.test(productId) || quantidade < 1 || quantidade > 99) {
      return { error: "Produto ou quantidade inválidos." };
    }

    const { data: produto } = await supabase
      .from("products")
      .select("nome, preco, custo")
      .eq("id", productId)
      .maybeSingle<{ nome: string; preco: number; custo: number }>();
    if (!produto) return { error: "Produto não encontrado." };

    const { error } = await supabase.from("comanda_items").insert({
      comanda_id: comandaId,
      tipo: "produto",
      product_id: productId,
      descricao: produto.nome,
      quantidade,
      valor_unitario: produto.preco,
      custo_unitario: produto.custo,
    });
    if (error) {
      return {
        error: /estoque insuficiente/i.test(error.message)
          ? error.message
          : "Não foi possível adicionar o produto.",
      };
    }
    revalida(comandaId);
    return { ok: true };
  }

  // ---- Serviço / item avulso ----
  const raw = formData.get("service_id");
  const parsed = servicoSchema.safeParse({
    descricao: formData.get("descricao"),
    quantidade: formData.get("quantidade"),
    valor_unitario: formData.get("valor_unitario"),
    service_id: raw === "" ? null : raw,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { error } = await supabase.from("comanda_items").insert({
    comanda_id: comandaId,
    tipo: "servico",
    service_id: parsed.data.service_id,
    descricao: parsed.data.descricao,
    quantidade: parsed.data.quantidade,
    valor_unitario: parsed.data.valor_unitario,
  });
  if (error) return { error: "Não foi possível adicionar o item." };

  revalida(comandaId);
  return { ok: true };
}

export async function removeItemAction(
  _prev: ComandaFormState,
  formData: FormData,
): Promise<ComandaFormState> {
  const comandaId = String(formData.get("comanda_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const { comanda } = await requireComanda(comandaId);
  if (comanda.status !== "aberta" || !itemId) return {};

  const supabase = await createClient();
  const { error } = await supabase
    .from("comanda_items")
    .delete()
    .eq("id", itemId)
    .eq("comanda_id", comandaId);
  if (error) return { error: "Não foi possível remover o item." };
  revalida(comandaId);
  return { ok: true };
}

// --------------------------------------------------------------
// Pagamentos
// --------------------------------------------------------------
const paymentSchema = z.object({
  forma: z.enum(["pix", "debito", "credito", "dinheiro", "saldo"]),
  valor: z.coerce.number().positive("Informe um valor maior que zero."),
});

export async function addPaymentAction(
  _prev: ComandaFormState,
  formData: FormData,
): Promise<ComandaFormState> {
  const comandaId = String(formData.get("comanda_id") ?? "");
  const { comanda } = await requireComanda(comandaId);
  if (comanda.status !== "aberta") {
    return { error: "A comanda está fechada." };
  }

  const parsed = paymentSchema.safeParse({
    forma: formData.get("forma"),
    valor: formData.get("valor"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    comanda_id: comandaId,
    forma: parsed.data.forma,
    valor: parsed.data.valor,
  });
  if (error) {
    return {
      error: /saldo insuficiente/i.test(error.message)
        ? "Saldo na casa insuficiente para esse valor."
        : /sem cliente/i.test(error.message)
          ? "Essa comanda não tem cliente — não dá para pagar com saldo."
          : "Não foi possível registrar o pagamento.",
    };
  }

  revalida(comandaId);
  return { ok: true };
}

export async function removePaymentAction(
  _prev: ComandaFormState,
  formData: FormData,
): Promise<ComandaFormState> {
  const comandaId = String(formData.get("comanda_id") ?? "");
  const paymentId = String(formData.get("payment_id") ?? "");
  const { comanda } = await requireComanda(comandaId);
  if (comanda.status !== "aberta" || !paymentId) return {};

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId)
    .eq("comanda_id", comandaId);
  if (error) return { error: "Não foi possível remover o pagamento." };
  revalida(comandaId);
  return { ok: true };
}

// --------------------------------------------------------------
// Fechar / reabrir / excluir
// --------------------------------------------------------------
export async function fecharComandaAction(
  _prev: ComandaFormState,
  formData: FormData,
): Promise<ComandaFormState> {
  const comandaId = String(formData.get("comanda_id") ?? "");
  await requireComanda(comandaId);

  const supabase = await createClient();
  const { error } = await supabase.rpc("fechar_comanda", { p_comanda_id: comandaId });
  if (error) {
    return {
      error: /falta registrar pagamento/i.test(error.message)
        ? "Ainda falta registrar pagamento para cobrir o total."
        : "Não foi possível fechar a comanda.",
    };
  }
  revalida(comandaId);
  return { ok: true };
}

export async function reabrirComandaAction(formData: FormData) {
  const comandaId = String(formData.get("comanda_id") ?? "");
  await requireSection("financeiro");

  const supabase = await createClient();
  await supabase.rpc("reabrir_comanda", { p_comanda_id: comandaId });
  revalida(comandaId);
}

export async function excluirComandaAction(formData: FormData) {
  const comandaId = String(formData.get("comanda_id") ?? "");
  await requireComanda(comandaId);

  const supabase = await createClient();
  await supabase.from("comandas").delete().eq("id", comandaId);
  revalidatePath("/financeiro");
  revalidatePath("/agenda");
  redirect("/financeiro");
}
