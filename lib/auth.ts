import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { ProfileRow, TenantRow, TenantSettingsRow } from "@/types/database";

export interface SessionClaims {
  sub: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Claims da sessão atual (verificadas), ou `null` se não houver sessão.
 * Memoizado por render com `cache()`.
 */
export const getSessionClaims = cache(async (): Promise<SessionClaims | null> => {
  if (!hasSupabaseEnv) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  return data.claims as SessionClaims;
});

export interface AppContext {
  claims: SessionClaims;
  /** Perfil do usuário. `null` se ele ainda não completou o onboarding/aceite. */
  profile: ProfileRow | null;
  /** Tenant do usuário. `null` antes de criar/entrar num negócio. */
  tenant: TenantRow | null;
  /** Preferências do negócio. `null` antes de ter tenant. */
  settings: TenantSettingsRow | null;
  /** `true` para o dono do negócio. */
  isOwner: boolean;
  /** `true` para o admin da plataforma (super-admin do BRYM, acima dos tenants). */
  plataformaAdmin: boolean;
  /** Seções liberadas (vazio para o dono, que enxerga tudo). */
  permissoes: string[];
  /** `professionals.id` vinculado a esta conta, ou `null`. */
  professionalId: string | null;
}

/**
 * Contexto do usuário logado (dono ou funcionário): claims + perfil + tenant
 * + papel + permissões. Retorna `null` quando não há sessão.
 */
export const getAppContext = cache(async (): Promise<AppContext | null> => {
  const claims = await getSessionClaims();
  if (!claims) return null;

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", claims.sub)
    .maybeSingle<ProfileRow>();

  let tenant: TenantRow | null = null;
  let settings: TenantSettingsRow | null = null;
  if (profile?.tenant_id) {
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase
        .from("tenants")
        .select("*")
        .eq("id", profile.tenant_id)
        .maybeSingle<TenantRow>(),
      supabase
        .from("tenant_settings")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle<TenantSettingsRow>(),
    ]);
    tenant = t ?? null;
    settings = s ?? null;
  }

  const isOwner = profile?.papel === "owner" && Boolean(profile.tenant_id);

  let professionalId: string | null = null;
  if (profile?.tenant_id) {
    const { data: prof } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", claims.sub)
      .maybeSingle<{ id: string }>();
    professionalId = prof?.id ?? null;
  }

  return {
    claims,
    profile: profile ?? null,
    tenant,
    settings,
    isOwner,
    plataformaAdmin: profile?.plataforma_admin ?? false,
    permissoes: profile?.permissoes ?? [],
    professionalId,
  };
});
