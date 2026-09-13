"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSection } from "@/lib/guards";
import { CATEGORIAS_DESPESA } from "@/lib/despesas";
import { capacidadeLiberadaPeloPlano } from "@/lib/planos";
import { createClient } from "@/lib/supabase/server";

export interface ExpenseState {
  error?: string;
  ok?: boolean;
}

const schema = z.object({
  categoria: z.enum(CATEGORIAS_DESPESA),
  descricao: z.string().trim().optional(),
  valor: z.coerce.number().min(0, "O valor não pode ser negativo."),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  status: z.enum(["pago", "pendente"]),
});

export async function saveExpenseAction(
  _prev: ExpenseState,
  formData: FormData,
): Promise<ExpenseState> {
  const ctx = await requireSection("financeiro");
  if (!capacidadeLiberadaPeloPlano("financeiro_avancado", ctx.tenant.plano)) {
    return { error: "Despesas não fazem parte do seu plano atual." };
  }

  const parsed = schema.safeParse({
    categoria: formData.get("categoria"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    data: formData.get("data"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const id = formData.get("id");
  const payload = {
    tenant_id: ctx.tenant.id,
    categoria: parsed.data.categoria,
    descricao: parsed.data.descricao || null,
    valor: parsed.data.valor,
    data: parsed.data.data,
    status: parsed.data.status,
  };

  const { error } =
    typeof id === "string" && id
      ? await supabase.from("expenses").update(payload).eq("id", id)
      : await supabase.from("expenses").insert(payload);

  if (error) return { error: "Não foi possível salvar a despesa." };

  revalidatePath("/financeiro");
  return { ok: true };
}

export async function setExpenseStatusAction(formData: FormData) {
  const ctx = await requireSection("financeiro");
  if (!capacidadeLiberadaPeloPlano("financeiro_avancado", ctx.tenant.plano)) return;
  const id = formData.get("id");
  const status = formData.get("status");
  if (typeof id !== "string" || (status !== "pago" && status !== "pendente")) {
    return;
  }

  const supabase = await createClient();
  await supabase.from("expenses").update({ status }).eq("id", id);
  revalidatePath("/financeiro");
}

export async function deleteExpenseAction(formData: FormData) {
  const ctx = await requireSection("financeiro");
  if (!capacidadeLiberadaPeloPlano("financeiro_avancado", ctx.tenant.plano)) return;
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", id);
  revalidatePath("/financeiro");
}
