import "server-only";

import { notFound, redirect } from "next/navigation";

import { destinoBloqueio } from "@/lib/assinatura";
import { getAppContext, type AppContext } from "@/lib/auth";
import { podeAcessarSecao } from "@/lib/permissions";
import { secaoHabilitada } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { ComandaRow } from "@/types/database";

/**
 * Garante sessão + tenant. Redireciona para login/onboarding quando falta.
 * Use no topo de qualquer página da área autenticada que precise do contexto.
 */
export async function requireApp(): Promise<AppContext & { tenant: NonNullable<AppContext["tenant"]>; profile: NonNullable<AppContext["profile"]> }> {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (!ctx.profile || !ctx.tenant) redirect("/onboarding");
  // Acesso barrado por assinatura: suspensão manual do BRYM → /conta-suspensa;
  // trial expirado ou assinatura vencida → /assinar (o dono resolve pagando).
  const bloqueio = destinoBloqueio(ctx.tenant);
  if (bloqueio) redirect(bloqueio);
  return ctx as AppContext & {
    tenant: NonNullable<AppContext["tenant"]>;
    profile: NonNullable<AppContext["profile"]>;
  };
}

/** Como `requireApp`, mas manda para /agenda quem não pode ver a seção. */
export async function requireSection(secao: string) {
  const ctx = await requireApp();
  if (!podeAcessarSecao(ctx, secao)) redirect("/agenda");
  if (!secaoHabilitada(secao, ctx.settings)) redirect("/agenda");
  return ctx;
}

/** Como `requireApp`, mas só o dono passa. */
export async function requireOwner() {
  const ctx = await requireApp();
  if (!ctx.isOwner) redirect("/agenda");
  return ctx;
}

/**
 * Só o admin da plataforma (super-admin do BRYM) passa. Não exige tenant —
 * o admin pode não ter negócio próprio.
 */
export async function requirePlataformaAdmin(): Promise<
  AppContext & { profile: NonNullable<AppContext["profile"]> }
> {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (!ctx.profile?.plataforma_admin) redirect("/agenda");
  return ctx as AppContext & { profile: NonNullable<AppContext["profile"]> };
}

/** Pode gerenciar comandas em geral? (dono, financeiro ou profissional vinculado) */
export function podeGerenciarComandas(ctx: AppContext): boolean {
  return (
    ctx.isOwner ||
    podeAcessarSecao(ctx, "financeiro") ||
    ctx.professionalId != null
  );
}

/**
 * Pode criar/editar/excluir clientes? Só o dono ou um funcionário com a seção
 * `clientes` **sem** vínculo de profissional (gerente, recepção). O barbeiro
 * (profissional vinculado) só consulta os próprios clientes.
 */
export function podeGerenciarClientes(ctx: AppContext): boolean {
  return (
    ctx.isOwner ||
    (podeAcessarSecao(ctx, "clientes") && ctx.professionalId == null)
  );
}

/** Como `requireApp`, mas só quem gerencia clientes passa. */
export async function requireGerenciarClientes() {
  const ctx = await requireApp();
  if (!podeGerenciarClientes(ctx)) redirect("/clientes");
  return ctx;
}

/**
 * Carrega uma comanda e garante que o usuário pode gerenciá-la
 * (dono/financeiro, ou o profissional dono da comanda). `notFound()` se não.
 */
export async function requireComanda(
  comandaId: string,
): Promise<{ ctx: Awaited<ReturnType<typeof requireApp>>; comanda: ComandaRow }> {
  const supabase = await createClient();
  // A busca da comanda só depende do `comandaId` (já conhecido) — não
  // precisa esperar o `requireApp()` terminar pra começar. Rodando junto
  // vira 1 round-trip a menos numa ação chamada em toda comanda (o ponto
  // mais clicado do app).
  const [ctx, { data: comanda }] = await Promise.all([
    requireApp(),
    supabase.from("comandas").select("*").eq("id", comandaId).maybeSingle<ComandaRow>(),
  ]);

  const pode =
    comanda != null &&
    comanda.tenant_id === ctx.tenant.id &&
    (ctx.isOwner ||
      podeAcessarSecao(ctx, "financeiro") ||
      // `!= null` importante: numa venda avulsa `professional_id` é null, e em JS
      // `null === null` daria acesso a quem não tem vínculo de profissional.
      (comanda.professional_id != null &&
        comanda.professional_id === ctx.professionalId));

  if (!pode || !comanda) notFound();
  return { ctx, comanda };
}
