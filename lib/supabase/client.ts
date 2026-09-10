import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseEnv } from "./config";

/**
 * Cliente Supabase para Client Components (roda no navegador).
 * `createBrowserClient` já devolve um singleton por origem.
 */
export function createClient() {
  const { url, key } = requireSupabaseEnv();
  return createBrowserClient(url, key);
}
