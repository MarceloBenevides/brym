"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/origin";
import { isSegmento } from "@/lib/segments";

export interface AuthState {
  error?: string;
  /** Mensagem informativa (ex.: "confirme seu e-mail"). */
  notice?: string;
}

const emailSchema = z.string().trim().pipe(z.email("E-mail inválido."));
const senhaSchema = z
  .string()
  .min(8, "A senha precisa de pelo menos 8 caracteres.");

// --------------------------------------------------------------
// Login
// --------------------------------------------------------------
export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = z
    .object({ email: emailSchema, senha: z.string().min(1, "Informe a senha.") })
    .safeParse({
      email: formData.get("email"),
      senha: formData.get("senha"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });

  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }

  const dest = await destinationAfterAuth(supabase);
  redirect(dest);
}

// --------------------------------------------------------------
// Cadastro do dono
// --------------------------------------------------------------
export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const segmento = formData.get("segmento");

  const parsed = z
    .object({
      nome: z.string().trim().min(2, "Informe seu nome."),
      email: emailSchema,
      senha: senhaSchema,
      negocio: z.string().trim().min(2, "Informe o nome do negócio."),
    })
    .safeParse({
      nome: formData.get("nome"),
      email: formData.get("email"),
      senha: formData.get("senha"),
      negocio: formData.get("negocio"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (!isSegmento(segmento)) {
    return { error: "Escolha o segmento do seu negócio." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.senha,
    options: {
      emailRedirectTo: `${await getOrigin()}/auth/confirm`,
      data: {
        nome: parsed.data.nome,
        negocio_nome: parsed.data.negocio,
        segmento,
      },
    },
  });

  if (error) {
    if (error.status === 422 || /registered|already/i.test(error.message)) {
      return { error: "Já existe uma conta com esse e-mail. Faça login." };
    }
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return {
        error:
          "Muitas tentativas de cadastro seguidas. Espere alguns minutos e tente de novo.",
      };
    }
    return { error: "Não foi possível criar a conta. Tente de novo." };
  }

  // Confirmação de e-mail ligada: sem sessão ainda.
  if (!data.session) {
    return {
      notice:
        "Enviamos um link de confirmação para o seu e-mail. Confirme para continuar.",
    };
  }

  // Confirmação desligada: já dá para criar o tenant.
  const { error: rpcError } = await supabase.rpc(
    "create_tenant_for_current_user",
    {
      p_nome: parsed.data.negocio,
      p_segmento: segmento,
    },
  );

  if (rpcError) {
    redirect("/onboarding");
  }

  redirect("/agenda");
}

// --------------------------------------------------------------
// Onboarding (criar tenant) — usado quando a sessão já existe
// --------------------------------------------------------------
export async function createTenantAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const segmento = formData.get("segmento");

  const parsed = z
    .object({
      negocio: z.string().trim().min(2, "Informe o nome do negócio."),
      telefone: z.string().trim().optional(),
      ddi: z.preprocess(
        (v) => String(v ?? "").replace(/\D/g, "").slice(0, 4),
        z.string().max(4),
      ),
    })
    .safeParse({
      negocio: formData.get("negocio"),
      telefone: formData.get("telefone"),
      ddi: formData.get("ddi"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (!isSegmento(segmento)) {
    return { error: "Escolha o segmento do seu negócio." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_tenant_for_current_user", {
    p_nome: parsed.data.negocio,
    p_segmento: segmento,
    p_telefone: parsed.data.telefone || null,
    p_ddi: parsed.data.ddi || null,
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/agenda");
    }
    return {
      error: "Não foi possível criar o negócio. Recarregue e tente de novo.",
    };
  }

  redirect("/agenda");
}

// --------------------------------------------------------------
// Logout
// --------------------------------------------------------------
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// --------------------------------------------------------------
async function destinationAfterAuth(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return "/login";

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, plataforma_admin")
    .eq("id", uid)
    .maybeSingle<{ tenant_id: string | null; plataforma_admin: boolean }>();

  if (profile?.tenant_id) return "/agenda";
  if (profile?.plataforma_admin) return "/admin";
  return "/onboarding";
}
