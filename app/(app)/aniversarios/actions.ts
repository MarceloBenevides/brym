"use server";

import { revalidatePath } from "next/cache";

import { requireSection } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

export async function marcarFelicitacaoAction(formData: FormData) {
  const ctx = await requireSection("aniversarios");
  const clientId = String(formData.get("client_id") ?? "");
  const ano = Number(formData.get("ano"));
  if (!UUID.test(clientId) || !Number.isInteger(ano)) return;

  const supabase = await createClient();
  await supabase
    .from("felicitacoes")
    .upsert(
      { tenant_id: ctx.tenant.id, client_id: clientId, ano },
      { onConflict: "client_id,ano", ignoreDuplicates: true },
    );
  revalidatePath("/aniversarios");
}

export async function desmarcarFelicitacaoAction(formData: FormData) {
  await requireSection("aniversarios");
  const clientId = String(formData.get("client_id") ?? "");
  const ano = Number(formData.get("ano"));
  if (!UUID.test(clientId) || !Number.isInteger(ano)) return;

  const supabase = await createClient();
  await supabase
    .from("felicitacoes")
    .delete()
    .eq("client_id", clientId)
    .eq("ano", ano);
  revalidatePath("/aniversarios");
}
