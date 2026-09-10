import Link from "next/link";

import { cn } from "@/lib/cn";

export interface TabItem {
  key: string;
  label: string;
  href: string;
}

export function Tabs({
  items,
  active,
}: {
  items: TabItem[];
  active: string;
}) {
  return (
    <div className="mb-6 flex gap-2">
      {items.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
              isActive
                ? "border-ink bg-ink text-white"
                : "border-border bg-card text-text-soft hover:border-gold/60",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
