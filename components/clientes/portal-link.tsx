"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

export function PortalLink({ slug }: { slug: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    const url = `${window.location.origin}/portal/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      window.prompt("Copie o link do portal:", url);
    }
  };

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-[#fbf1dc]/50 px-5 py-3.5">
      <div className="min-w-0 text-[12.5px] text-text-soft">
        Seus clientes acompanham os próprios agendamentos em{" "}
        <span className="font-mono text-text">/portal/{slug}</span>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={`/portal/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-text-soft"
        >
          <ExternalLink size={13} /> Abrir
        </a>
        <button
          onClick={copiar}
          className="flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-semibold text-white"
        >
          {copiado ? <Check size={13} /> : <Copy size={13} />}
          {copiado ? "Copiado" : "Copiar link"}
        </button>
      </div>
    </div>
  );
}
