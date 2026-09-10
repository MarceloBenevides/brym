"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOwner } from "@/lib/guards";
import { sanitizarPermissoes } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export interface InviteState {
  error?: string;
  ok?: boolean;
}

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do funcionário."),
  email: z.string().trim().pipe(z.email("E-mail inválido.")),
});

export async function createInviteAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const ctx = await requireOwner();

  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const email = parsed.data.email.toLowerCase();
  const permissoes = sanitizarPermissoes(formData.getAll("permissoes"));
  const criarProfissional = formData.get("criar_profissional") === "on";

  if (email === ctx.profile.email?.toLowerCase()) {
    return { error: "Esse e-mail é o seu — use outro para o funcionário." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invitations").insert({
    tenant_id: ctx.tenant.id,
    email,
    nome: parsed.data.nome,
    permissoes,
    criar_profissional: criarProfissional,
    convidado_por: ctx.claims.sub,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um convite pendente para esse e-mail." };
    }
    return { error: "Não foi possível criar o convite. Tente de novo." };
  }

  revalidatePath("/equipe");
  return { ok: true };
}

export async function revokeInviteAction(formData: FormData) {
  await requireOwner();
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase
    .from("invitations")
    .update({ status: "revogado" })
    .eq("id", id)
    .eq("status", "pendente");

  revalidatePath("/equipe");
}
