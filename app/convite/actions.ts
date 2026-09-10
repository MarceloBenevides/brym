"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";

export interface AcceptState {
  error?: string;
  notice?: string;
}

const cadastroSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome."),
    senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
    confirmar: z.string(),
  })
  .refine((d) => d.senha === d.confirmar, {
    error: "As senhas não conferem.",
    path: ["confirmar"],
  });

export async function acceptInviteAction(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const token = String(formData.get("token") ?? "");
  const mode = String(formData.get("mode") ?? "cadastro");
  if (!token) return { error: "Convite inválido." };

  const supabase = await createClient();

  const { data: preview } = await supabase.rpc("invitation_preview", {
    p_token: token,
  });
  if (!preview?.valido) {
    return { error: "Este convite não é mais válido." };
  }
  const email = String(preview.email);

  if (mode === "cadastro") {
    const parsed = cadastroSchema.safeParse({
      nome: formData.get("nome"),
      senha: formData.get("senha"),
      confirmar: formData.get("confirmar"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: parsed.data.senha,
      options: {
        data: { nome: parsed.data.nome },
        emailRedirectTo: `${await getOrigin()}/auth/confirm?next=/convite/${token}`,
      },
    });

    if (error) {
      const msg = /registered|already/i.test(error.message)
        ? "Já existe uma conta com esse e-mail. Faça login e abra o link de novo."
        : "Não foi possível criar a conta. Tente de novo.";
      return { error: msg };
    }

    if (!data.session) {
      return {
        notice:
          "Enviamos um link de confirmação para o seu e-mail. Abra o link para entrar na equipe.",
      };
    }
  }

  const { error: rpcError } = await supabase.rpc("accept_invitation", {
    p_token: token,
  });
  if (rpcError) {
    return {
      error:
        rpcError.code === "42501"
          ? "Este convite é para outro e-mail."
          : rpcError.message || "Não foi possível entrar na equipe.",
    };
  }

  redirect("/agenda");
}
