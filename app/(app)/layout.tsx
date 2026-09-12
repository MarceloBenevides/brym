import type { ReactNode } from "react";

import { signOutAction } from "@/app/auth/actions";
import { AppShell } from "@/components/app-shell/app-shell";
import { requireApp } from "@/lib/guards";

// Área autenticada: sempre renderizada por request (lê cookies de sessão).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireApp();

  return (
    <AppShell
      signOut={signOutAction}
      isOwner={ctx.isOwner}
      permissoes={ctx.permissoes}
      isProfessional={ctx.professionalId != null}
      plataformaAdmin={ctx.plataformaAdmin}
      settings={ctx.settings}
      tenant={ctx.tenant}
      profile={ctx.profile}
    >
      {children}
    </AppShell>
  );
}
