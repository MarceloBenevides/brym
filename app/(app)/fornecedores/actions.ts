"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSection } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";

export interface SupplierState {
  error?: string;
  ok?: boolean;
}

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do fornecedor."),
  telefone: z.string().trim().optional(),
  email: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().pipe(z.email("E-mail inválido.")).nullable(),
  ),
  observacoes: z.string().trim().optional(),
});

export async function saveSupplierAction(
  _prev: SupplierState,
  formData: FormData,
): Promise<SupplierState> {
  const ctx = await requireSection("fornecedores");

  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
    email: formData.get("email"),
    observacoes: formData.get("observacoes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const id = formData.get("id");
  const payload = {
    tenant_id: ctx.tenant.id,
    nome: parsed.data.nome,
    telefone: parsed.data.telefone || null,
    email: parsed.data.email,
    observacoes: parsed.data.observacoes || null,
  };

  const { error } =
    typeof id === "string" && id
      ? await supabase.from("suppliers").update(payload).eq("id", id)
      : await supabase.from("suppliers").insert(payload);

  if (error) return { error: "Não foi possível salvar o fornecedor." };

  revalidatePath("/fornecedores");
  return { ok: true };
}

export async function deleteSupplierAction(formData: FormData) {
  await requireSection("fornecedores");
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("suppliers").update({ ativo: false }).eq("id", id);
  revalidatePath("/fornecedores");
}
