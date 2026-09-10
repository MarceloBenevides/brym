import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "./config";

/**
 * Cliente Supabase com a `service_role` key — ignora RLS. **Uso restrito a
 * fluxos sem sessão de usuário** (hoje: só o webhook do Stripe em
 * `app/api/stripe/webhook`). Nunca importe isto de um componente ou de uma
 * action com sessão — use `lib/supabase/server.ts`.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error(
      "Supabase service role não configurado. Defina SUPABASE_SERVICE_ROLE_KEY " +
        "no ambiente do servidor (necessário para o webhook do Stripe).",
    );
  }
  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
