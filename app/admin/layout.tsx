import type { ReactNode } from "react";
import { LogOut } from "lucide-react";

import { signOutAction } from "@/app/auth/actions";
import { Logo } from "@/components/brand/logo";
import { requirePlataformaAdmin } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const ctx = await requirePlataformaAdmin();

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo compact />
            <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">
              Plataforma
            </span>
          </div>
          <div className="flex items-center gap-4 text-[12.5px] text-text-soft">
            <span className="hidden sm:inline">{ctx.profile.email}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 font-semibold text-text-soft hover:border-gold"
              >
                <LogOut size={13} /> Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl p-8">{children}</main>
    </div>
  );
}
