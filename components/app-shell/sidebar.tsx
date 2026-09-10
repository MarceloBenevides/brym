"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, LogOut } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { GoldStripe } from "@/components/brand/gold-stripe";
import { cn } from "@/lib/cn";
import { podeAcessarSecao } from "@/lib/permissions";
import { secaoHabilitada } from "@/lib/settings";
import type { TenantSettingsRow } from "@/types/database";
import { NAV_ITEMS } from "./nav";

export function Sidebar({
  signOut,
  isOwner,
  permissoes,
  isProfessional,
  plataformaAdmin,
  settings,
}: {
  signOut: () => Promise<void>;
  isOwner: boolean;
  permissoes: string[];
  isProfessional: boolean;
  plataformaAdmin: boolean;
  settings: TenantSettingsRow | null;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => {
    // flag desligada esconde a seção pra todo mundo, inclusive o dono
    if (item.flag && !secaoHabilitada(item.section, settings)) return false;
    if (item.professionalOnly) return !isOwner && isProfessional;
    if (isOwner) return true;
    if (item.ownerOnly) return false;
    return podeAcessarSecao({ isOwner, permissoes }, item.section);
  });

  return (
    <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col bg-ink">
      <div className="px-5 py-6">
        <Logo dark />
      </div>
      <GoldStripe />

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors",
                active
                  ? "bg-ink-soft font-semibold text-white"
                  : "font-medium text-text-faint hover:text-white",
              )}
            >
              {active && (
                <span className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-gold" />
              )}
              <Icon
                size={16}
                className={active ? "text-gold" : "text-text-faint"}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        {isOwner && (
          <Link
            href="/assinar"
            className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-text-faint transition-colors hover:text-white"
          >
            <CreditCard size={16} className="text-text-faint" />
            Assinatura
          </Link>
        )}
        {plataformaAdmin && (
          <Link
            href="/admin"
            className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-text-faint transition-colors hover:text-white"
          >
            <Building2 size={16} className="text-text-faint" />
            Plataforma
          </Link>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-text-faint transition-colors hover:text-white"
          >
            <LogOut size={16} />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
