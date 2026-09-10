"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlataformaAdmin } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  tenant_id: z.uuid(),
  status: z.enum(["trial", "ativo", "suspenso", "cancelado"]),
});

export async function setStatusNegocioAction(formData: FormData) {
  await requirePlataformaAdmin();

  const parsed = schema.safeParse({
    tenant_id: formData.get("tenant_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.rpc("plataforma_set_status", {
    p_tenant_id: parsed.data.tenant_id,
    p_status: parsed.data.status,
  });
  revalidatePath("/admin");
}

const vincularSchema = z.object({
  event_id: z.string().min(1),
  tenant_id: z.uuid(),
});

export async function vincularPagamentoAction(formData: FormData) {
  await requirePlataformaAdmin();

  const parsed = vincularSchema.safeParse({
    event_id: formData.get("event_id"),
    tenant_id: formData.get("tenant_id"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.rpc("assinatura_vincular_evento", {
    p_event_id: parsed.data.event_id,
    p_tenant_id: parsed.data.tenant_id,
  });
  revalidatePath("/admin");
}
