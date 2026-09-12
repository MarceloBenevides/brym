"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, User } from "lucide-react";

/**
 * Círculo com a inicial no topo direito — abre um menu pequeno ancorado
 * embaixo com "Minha conta"/"Sair". Fecha em clique fora e em Escape (mesmo
 * espírito de `components/ui/modal.tsx`, só que sem backdrop cobrindo a
 * tela — é um menu de canto, não um modal).
 */
export function AvatarMenu({
  initials,
  signOut,
}: {
  initials: string;
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickFora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickFora);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickFora);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu da conta"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-[13px] font-semibold text-ink transition-opacity hover:opacity-85"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 z-20 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <Link
            href="/conta"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium text-text-soft hover:bg-[#f1ece1]"
          >
            <User size={15} /> Minha conta
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium text-text-soft hover:bg-[#f1ece1]"
            >
              <LogOut size={15} /> Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
