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

type ProfileComTenant = ProfileRow & {
  tenants: (TenantRow & { tenant_settings: TenantSettingsRow | null }) | null;
};

/**
 * Contexto do usuário logado (dono ou funcionário): claims + perfil + tenant
 * + papel + permissões. Retorna `null` quando não há sessão.
 *
 * **Medido em produção (2026-09)**: cada ida-e-volta ao Supabase custa
 * ~250-500ms daqui. Antes eram 2 round-trips em fila (profile → tenant+
 * settings+professional) — profile e tenant/settings agora vêm **embutidos
 * num único select** (PostgREST resolve o join por FK: profiles → tenants →
 * tenant_settings), e `professionals` roda em paralelo no mesmo
 * `Promise.all` (não depende do profile, só de `claims.sub`) — o contexto
 * inteiro vira 1 round-trip em vez de 2, e isso roda em toda página e toda
 * server action do app.
 */
export const getAppContext = cache(async (): Promise<AppContext | null> => {
  const claims = await getSessionClaims();
  if (!claims) return null;

  const supabase = await createClient();

  const [{ data: profile }, { data: prof }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, tenants(*, tenant_settings(*))")
      .eq("id", claims.sub)
      .maybeSingle<ProfileComTenant>(),
    supabase
      .from("professionals")
      .select("id")
      .eq("user_id", claims.sub)
      .maybeSingle<{ id: string }>(),
  ]);

  const tenant = profile?.tenants ?? null;
  const settings = tenant?.tenant_settings ?? null;
  const isOwner = profile?.papel === "owner" && Boolean(profile.tenant_id);

  return {
    claims,
    profile: profile ?? null,
    tenant,
    settings,
    isOwner,
    plataformaAdmin: profile?.plataforma_admin ?? false,
    permissoes: profile?.permissoes ?? [],
    professionalId: prof?.id ?? null,
  };
});
