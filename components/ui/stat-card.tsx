import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  /** Quando presente, o cartão vira um link clicável. */
  href?: string;
  active?: boolean;
}) {
  const className = cn(
    "block flex-1 rounded-2xl border bg-card p-5 transition-colors",
    active ? "border-gold ring-1 ring-gold/40" : "border-border",
    href && !active && "hover:border-gold/60",
  );

  const conteudo = (
    <>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#fbf1dc]">
        <Icon size={17} className="text-gold-deep" />
      </div>
      <div className="font-mono text-2xl font-semibold text-text">{value}</div>
      <div className="mt-0.5 text-[13px] text-text-soft">{label}</div>
      {sub && <div className="mt-1.5 text-[11.5px] text-text-faint">{sub}</div>}
    </>
  );

  return href ? (
    <Link href={href} className={className}>
      {conteudo}
    </Link>
  ) : (
    <div className={className}>{conteudo}</div>
  );
}
