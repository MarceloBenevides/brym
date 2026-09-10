"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSection } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  ok?: boolean;
}

// --------------------------------------------------------------
// Serviços
// --------------------------------------------------------------
const serviceSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do serviço."),
  duracao_min: z.coerce
    .number()
    .int("Duração em minutos inteiros.")
    .positive("Duração precisa ser maior que zero.")
    .max(1440, "Duração muito longa."),
  preco: z.coerce.number().min(0, "Preço não pode ser negativo."),
  category_id: z.uuid().nullable().catch(null),
});

export async function saveServiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSection("servicos");

  const rawCategory = formData.get("category_id");
  const parsed = serviceSchema.safeParse({
    nome: formData.get("nome"),
    duracao_min: formData.get("duracao_min"),
    preco: formData.get("preco"),
    category_id: rawCategory === "" ? null : rawCategory,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const id = formData.get("id");
  const payload = {
    tenant_id: ctx.tenant.id,
    nome: parsed.data.nome,
    duracao_min: parsed.data.duracao_min,
    preco: parsed.data.preco,
    category_id: parsed.data.category_id,
  };

  const { error } =
    typeof id === "string" && id
      ? await supabase.from("services").update(payload).eq("id", id)
      : await supabase.from("services").insert(payload);

  if (error) return { error: "Não foi possível salvar o serviço." };

  revalidatePath("/servicos");
  return { ok: true };
}

export async function deleteServiceAction(formData: FormData) {
  await requireSection("servicos");
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("services").update({ ativo: false }).eq("id", id);
  revalidatePath("/servicos");
}

// --------------------------------------------------------------
// Categorias
// --------------------------------------------------------------
function nomeCategoria(formData: FormData): string {
  return String(formData.get("nome") ?? "").trim();
}

export async function createCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSection("servicos");
  const nome = nomeCategoria(formData);
  if (nome.length < 2) return { error: "Nome da categoria muito curto." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_categories")
    .insert({ tenant_id: ctx.tenant.id, nome });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe uma categoria com esse nome."
          : "Não foi possível criar a categoria.",
    };
  }
  revalidatePath("/servicos");
  return { ok: true };
}

export async function renameCategoryAction(formData: FormData) {
  await requireSection("servicos");
  const id = formData.get("id");
  const nome = nomeCategoria(formData);
  if (typeof id !== "string" || nome.length < 2) return;

  const supabase = await createClient();
  await supabase.from("service_categories").update({ nome }).eq("id", id);
  revalidatePath("/servicos");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireSection("servicos");
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  // serviços da categoria ficam sem categoria (FK on delete set null)
  await supabase.from("service_categories").delete().eq("id", id);
  revalidatePath("/servicos");
}
