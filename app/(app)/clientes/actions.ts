"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireGerenciarClientes } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";

export interface ClientState {
  error?: string;
  ok?: boolean;
}

const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().int().min(min).max(max).nullable(),
  );

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente."),
  telefone: z.string().trim().optional(),
  email: z.preprocess(
    (v) => (v === "" ? null : v),
    z
      .string()
      .trim()
      .pipe(z.email("E-mail inválido."))
      .nullable(),
  ),
  aniversario_dia: optionalInt(1, 31),
  aniversario_mes: optionalInt(1, 12),
  observacoes: z.string().trim().optional(),
});

export async function saveClientAction(
  _prev: ClientState,
  formData: FormData,
): Promise<ClientState> {
  const ctx = await requireGerenciarClientes();

  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
    email: formData.get("email"),
    aniversario_dia: formData.get("aniversario_dia"),
    aniversario_mes: formData.get("aniversario_mes"),
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
    aniversario_dia: parsed.data.aniversario_dia,
    aniversario_mes: parsed.data.aniversario_mes,
    observacoes: parsed.data.observacoes || null,
  };

  const { error } =
    typeof id === "string" && id
      ? await supabase.from("clients").update(payload).eq("id", id)
      : await supabase.from("clients").insert(payload);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe um cliente com esse telefone."
          : "Não foi possível salvar o cliente.",
    };
  }

  revalidatePath("/clientes");
  return { ok: true };
}

export async function deleteClientAction(formData: FormData) {
  await requireGerenciarClientes();
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("clients").update({ ativo: false }).eq("id", id);
  revalidatePath("/clientes");
}
