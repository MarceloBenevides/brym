/**
 * Resolve as credenciais públicas do Supabase a partir do ambiente.
 * Aceita tanto a "publishable key" (projetos novos) quanto a "anon key"
 * (projetos antigos) — basta preencher uma delas em `.env.local`.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** `true` quando as credenciais do Supabase estão presentes no ambiente. */
export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Garante que as variáveis existem e devolve-as já tipadas como string. */
export function requireSupabaseEnv(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) " +
        "em .env.local. Veja .env.example.",
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_KEY };
}
