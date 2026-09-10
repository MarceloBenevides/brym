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
// Produtos
// --------------------------------------------------------------
const productSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do produto."),
  marca: z.string().trim().optional(),
  codigo: z.string().trim().optional(),
  preco: z.coerce.number().min(0, "Preço não pode ser negativo."),
  custo: z.coerce.number().min(0, "Custo não pode ser negativo.").catch(0),
  category_id: z.uuid().nullable().catch(null),
  controla_estoque: z.boolean(),
  estoque_min: z.coerce.number().int().min(0).catch(0),
  estoque_atual: z.coerce.number().int().min(0).catch(0),
});

export async function saveProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSection("produtos");

  const rawCategory = formData.get("category_id");
  const parsed = productSchema.safeParse({
    nome: formData.get("nome"),
    marca: formData.get("marca"),
    codigo: formData.get("codigo"),
    preco: formData.get("preco"),
    custo: formData.get("custo"),
    category_id: rawCategory === "" ? null : rawCategory,
    controla_estoque: formData.get("controla_estoque") === "on",
    estoque_min: formData.get("estoque_min"),
    estoque_atual: formData.get("estoque_atual"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const id = formData.get("id");
  const editando = typeof id === "string" && id.length > 0;

  const base = {
    tenant_id: ctx.tenant.id,
    nome: parsed.data.nome,
    marca: parsed.data.marca || null,
    codigo: parsed.data.codigo || null,
    preco: parsed.data.preco,
    custo: parsed.data.custo,
    category_id: parsed.data.category_id,
    controla_estoque: parsed.data.controla_estoque,
    estoque_min: parsed.data.controla_estoque ? parsed.data.estoque_min : 0,
  };

  // estoque_atual só é definido na criação; depois muda só por "Ajustar estoque"
  const payload = editando
    ? base
    : {
        ...base,
        estoque_atual: parsed.data.controla_estoque ? parsed.data.estoque_atual : 0,
      };

  const { error } = editando
    ? await supabase.from("products").update(payload).eq("id", id)
    : await supabase.from("products").insert(payload);

  if (error) return { error: "Não foi possível salvar o produto." };

  revalidatePath("/produtos");
  return { ok: true };
}

export async function deleteProductAction(formData: FormData) {
  await requireSection("produtos");
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("products").update({ ativo: false }).eq("id", id);
  revalidatePath("/produtos");
}

// --------------------------------------------------------------
// Ajuste de estoque
// --------------------------------------------------------------
export async function ajustarEstoqueAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSection("produtos");

  const productId = String(formData.get("product_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const quantidade = Number(formData.get("quantidade") ?? 0);
  const motivo = String(formData.get("motivo") ?? "").trim();
  const supplierRaw = String(formData.get("supplier_id") ?? "");
  const supplierId = /^[0-9a-f-]{36}$/i.test(supplierRaw) ? supplierRaw : null;

  if (!productId || !["entrada", "saida", "ajuste"].includes(tipo)) {
    return { error: "Dados inválidos." };
  }
  if (!Number.isFinite(quantidade) || quantidade < 0) {
    return { error: "Quantidade inválida." };
  }
  if (tipo !== "ajuste" && quantidade <= 0) {
    return { error: "Informe uma quantidade maior que zero." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("ajustar_estoque", {
    p_product_id: productId,
    p_tipo: tipo,
    p_quantidade: Math.trunc(quantidade),
    p_motivo: motivo || null,
    p_supplier_id: tipo === "entrada" ? supplierId : null,
  });
  if (error) {
    return {
      error: /estoque insuficiente/i.test(error.message)
        ? "Estoque insuficiente para essa saída."
        : "Não foi possível ajustar o estoque.",
    };
  }

  revalidatePath("/produtos");
  return { ok: true };
}

// --------------------------------------------------------------
// Categorias de produto
// --------------------------------------------------------------
function nomeCategoria(formData: FormData): string {
  return String(formData.get("nome") ?? "").trim();
}

export async function createProductCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSection("produtos");
  const nome = nomeCategoria(formData);
  if (nome.length < 2) return { error: "Nome da categoria muito curto." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_categories")
    .insert({ tenant_id: ctx.tenant.id, nome });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe uma categoria com esse nome."
          : "Não foi possível criar a categoria.",
    };
  }
  revalidatePath("/produtos");
  return { ok: true };
}

export async function renameProductCategoryAction(formData: FormData) {
  await requireSection("produtos");
  const id = formData.get("id");
  const nome = nomeCategoria(formData);
  if (typeof id !== "string" || nome.length < 2) return;

  const supabase = await createClient();
  await supabase.from("product_categories").update({ nome }).eq("id", id);
  revalidatePath("/produtos");
}

export async function deleteProductCategoryAction(formData: FormData) {
  await requireSection("produtos");
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("product_categories").delete().eq("id", id);
  revalidatePath("/produtos");
}
