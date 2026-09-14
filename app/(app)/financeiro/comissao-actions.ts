"use server";

import { revalidatePath } from "next/cache";

import { requireSection } from "@/lib/guards";
import { capacidadeLiberadaPeloPlano, planoEfetivo } from "@/lib/planos";
import { createClient } from "@/lib/supabase/server";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Dá baixa em todas as comissões `a_pagar` de um profissional no período. */
export async function marcarComissoesPagasAction(formData: FormData) {
  const ctx = await requireSection("financeiro");
  if (!capacidadeLiberadaPeloPlano("financeiro_avancado", planoEfetivo(ctx.tenant.plano, ctx.tenant.plano_manual))) return;

  const professionalId = String(formData.get("professional_id") ?? "");
  const de = String(formData.get("de") ?? "");
  const ate = String(formData.get("ate") ?? "");
  if (!professionalId || !ISO.test(de) || !ISO.test(ate)) return;

  const supabase = await createClient();
  await supabase.rpc("marcar_comissoes_pagas", {
    p_professional_id: professionalId,
    p_de: de,
    p_ate: ate,
  });

  revalidatePath("/financeiro");
}
