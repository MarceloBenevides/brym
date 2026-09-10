"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSection } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid();

export async function registrarContatoAction(formData: FormData) {
  const ctx = await requireSection("crm");
  const parsed = uuid.safeParse(formData.get("client_id"));
  if (!parsed.success) return;

  const supabase = await createClient();
  // a RLS de clients garante que o cliente é do tenant e visível pra este usuário
  const { data: cliente } = await supabase
    .from("clients")
    .select("id")
    .eq("id", parsed.data)
    .maybeSingle<{ id: string }>();
  if (!cliente) return;

  await supabase.from("crm_contatos").insert({
    tenant_id: ctx.tenant.id,
    client_id: parsed.data,
    criado_por: ctx.profile.id,
  });
  revalidatePath("/crm");
}

export async function desfazerContatoAction(formData: FormData) {
  await requireSection("crm");
  const parsed = uuid.safeParse(formData.get("client_id"));
  if (!parsed.success) return;

  const supabase = await createClient();
  const trintaDiasAtras = new Date(Date.now() - 30 * 864e5).toISOString();
  await supabase
    .from("crm_contatos")
    .delete()
    .eq("client_id", parsed.data)
    .gt("criado_em", trintaDiasAtras);
  revalidatePath("/crm");
}
