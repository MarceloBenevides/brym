"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import type { ProfileRow, TenantRow, TenantSettingsRow } from "@/types/database";
import { AppTopBar } from "./app-top-bar";
import { AssinaturaBanner } from "./assinatura-banner";
import { Sidebar } from "./sidebar";

/**
 * Monta o esqueleto da área logada (sidebar + topbar + banner + conteúdo).
 * Abaixo de `md`, a sidebar vira um drawer off-canvas controlado pelo botão
 * de hambúrguer da topbar — mesmo padrão de overlay+backdrop do `Modal`
 * (`components/ui/modal.tsx`). Em `md+` nada muda: sidebar sempre visível,
 * como antes desta fatia.
 */
export function AppShell({
  signOut,
  isOwner,
  permissoes,
  isProfessional,
  plataformaAdmin,
  settings,
  tenant,
  profile,
  children,
}: {
  signOut: () => Promise<void>;
  isOwner: boolean;
  permissoes: string[];
  isProfessional: boolean;
  plataformaAdmin: boolean;
  settings: TenantSettingsRow | null;
  tenant: TenantRow;
  profile: ProfileRow;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Fecha o drawer sozinho ao navegar (mesma fonte que a Sidebar já usa pra
  // destacar o link ativo — sem precisar de onClick em cada <Link>). Ajuste
  // de estado durante a renderização em vez de useEffect, seguindo o padrão
  // recomendado pra "resetar estado quando uma prop muda" (evita o efeito
  // rodar 1 render depois, que o eslint acusa como cascata desnecessária).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <div className="flex min-h-dvh bg-paper">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          role="presentation"
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar
          signOut={signOut}
          isOwner={isOwner}
          permissoes={permissoes}
          isProfessional={isProfessional}
          plataformaAdmin={plataformaAdmin}
          settings={settings}
          plano={tenant.plano}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar
          tenant={tenant}
          profile={profile}
          isOwner={isOwner}
          onMenuClick={() => setOpen(true)}
          signOut={signOut}
        />
        <AssinaturaBanner tenant={tenant} isOwner={isOwner} />
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
