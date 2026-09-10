import type { ReactNode } from "react";

import { signOutAction } from "@/app/auth/actions";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { AssinaturaBanner } from "@/components/app-shell/assinatura-banner";
import { Sidebar } from "@/components/app-shell/sidebar";
import { requireApp } from "@/lib/guards";

// Área autenticada: sempre renderizada por request (lê cookies de sessão).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireApp();

  return (
    <div className="flex min-h-dvh bg-paper">
      <Sidebar
        signOut={signOutAction}
        isOwner={ctx.isOwner}
        permissoes={ctx.permissoes}
        isProfessional={ctx.professionalId != null}
        plataformaAdmin={ctx.plataformaAdmin}
        settings={ctx.settings}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar
          tenant={ctx.tenant}
          profile={ctx.profile}
          isOwner={ctx.isOwner}
        />
        <AssinaturaBanner tenant={ctx.tenant} isOwner={ctx.isOwner} />
        <main className="mx-auto w-full max-w-6xl flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
