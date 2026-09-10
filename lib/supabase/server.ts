import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { requireSupabaseEnv } from "./config";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Um cliente novo por request — nunca reutilize entre requests.
 *
 * O `setAll` pode falhar quando chamado a partir de um Server Component
 * (não é possível escrever cookies durante o render). Nesse caso o refresh
 * de token é feito pelo `proxy.ts`, então engolimos o erro com segurança.
 */
export async function createClient() {
  const { url, key } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado de um Server Component — ignorado (ver comentário acima).
        }
      },
    },
  });
}
