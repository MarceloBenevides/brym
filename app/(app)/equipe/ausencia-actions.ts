"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOwner } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";

export interface AusenciaState {
  error?: string;
  ok?: boolean;
}

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z
  .object({
    professional_id: z.uuid("Profissional inválido."),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
    dia_todo: z.boolean(),
    hora_inicio: z.string().optional(),
    hora_fim: z.string().optional(),
    motivo: z.enum(["folga", "falta", "atraso", "outro"]),
    observacoes: z.string().trim().max(300).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.dia_todo) return;
    if (!HORA_RE.test(d.hora_inicio ?? "") || !HORA_RE.test(d.hora_fim ?? "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o horário de início e fim da ausência.",
      });
      return;
    }
    if ((d.hora_inicio ?? "") >= (d.hora_fim ?? "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O fim da ausência precisa ser depois do início.",
      });
    }
  });

export async function salvarAusenciaAction(
  _prev: AusenciaState,
  formData: FormData,
): Promise<AusenciaState> {
  const ctx = await requireOwner();

  const parsed = schema.safeParse({
    professional_id: formData.get("professional_id"),
    data: formData.get("data"),
    dia_todo: formData.get("dia_todo") === "on",
    hora_inicio: formData.get("hora_inicio") || undefined,
    hora_fim: formData.get("hora_fim") || undefined,
    motivo: formData.get("motivo"),
    observacoes: formData.get("observacoes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();

  const { data: prof } = await supabase
    .from("professionals")
    .select("id")
    .eq("id", parsed.data.professional_id)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle<{ id: string }>();
  if (!prof) {
    return { error: "Profissional não encontrado." };
  }

  const { error } = await supabase.from("ausencias").insert({
    tenant_id: ctx.tenant.id,
    professional_id: parsed.data.professional_id,
    data: parsed.data.data,
    dia_todo: parsed.data.dia_todo,
    hora_inicio: parsed.data.dia_todo ? null : parsed.data.hora_inicio,
    hora_fim: parsed.data.dia_todo ? null : parsed.data.hora_fim,
    motivo: parsed.data.motivo,
    observacoes: parsed.data.observacoes ?? null,
    criado_por: ctx.profile.id,
  });
  if (error) {
    return { error: "Não foi possível registrar a ausência." };
  }

  revalidatePath("/equipe");
  revalidatePath("/agenda");
  return { ok: true };
}

export async function removerAusenciaAction(formData: FormData) {
  const ctx = await requireOwner();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const supabase = await createClient();
  await supabase
    .from("ausencias")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  revalidatePath("/equipe");
  revalidatePath("/agenda");
}
