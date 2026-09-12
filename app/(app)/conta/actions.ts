"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAppContext } from "@/lib/auth";
import { requireApp, requireOwner } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  ok?: boolean;
}

const nomeSchema = z
  .string()
  .trim()
  .min(2, "Precisa ter pelo menos 2 caracteres.");

const senhaSchema = z
  .string()
  .min(8, "A senha precisa de pelo menos 8 caracteres.");

// --------------------------------------------------------------
// Nome do negócio — só o dono
// --------------------------------------------------------------
export async function salvarNegocioAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOwner();

  const parsed = nomeSchema.safeParse(formData.get("nome"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({ nome: parsed.data })
    .eq("id", ctx.tenant.id);
  if (error) {
    return { error: "Não foi possível salvar o nome do negócio." };
  }

  // O nome aparece na topbar (fora de /conta) — revalida o layout inteiro.
  revalidatePath("/", "layout");
  return { ok: true };
}

// --------------------------------------------------------------
// Meus dados — qualquer usuário logado (dono ou funcionário)
// --------------------------------------------------------------
const dadosSchema = z.object({
  nome: nomeSchema,
  telefone: z.preprocess(
    (v) => {
      const digitos = String(v ?? "").replace(/\D/g, "");
      return digitos === "" ? null : digitos;
    },
    z.string().nullable(),
  ),
});

export async function salvarDadosAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireApp();

  const parsed = dadosSchema.safeParse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ nome: parsed.data.nome, telefone: parsed.data.telefone })
    .eq("id", ctx.profile.id);
  if (error) {
    return { error: "Não foi possível salvar seus dados." };
  }

  // O nome aparece na topbar via iniciais — revalida o layout inteiro.
  revalidatePath("/", "layout");
  return { ok: true };
}

// --------------------------------------------------------------
// Trocar senha — reautentica com a senha atual antes de aceitar a nova
// --------------------------------------------------------------
const senhaFormSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual."),
    novaSenha: senhaSchema,
    confirmarSenha: z.string(),
  })
  .refine((d) => d.novaSenha === d.confirmarSenha, {
    message: "A confirmação não bate com a nova senha.",
    path: ["confirmarSenha"],
  });

export async function trocarSenhaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireApp();

  const parsed = senhaFormSchema.safeParse({
    senhaAtual: formData.get("senhaAtual"),
    novaSenha: formData.get("novaSenha"),
    confirmarSenha: formData.get("confirmarSenha"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const claims = await getAppContext();
  const email = claims?.claims.email ?? ctx.profile.email;
  if (!email) {
    return { error: "Não foi possível confirmar seu e-mail." };
  }

  const supabase = await createClient();

  // Supabase não tem um endpoint isolado de "verificar senha atual" — a
  // forma de confirmar é reautenticando com ela.
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.senhaAtual,
  });
  if (authError) {
    return { error: "Senha atual incorreta." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.novaSenha,
  });
  if (updateError) {
    return { error: "Não foi possível trocar a senha. Tente de novo." };
  }

  return { ok: true };
}
