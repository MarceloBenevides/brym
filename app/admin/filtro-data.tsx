"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filtro de período (De/Até) por `criado_em`, mesmo espírito do
 * `components/ui/search-input.tsx` — escreve na URL, preservando os outros
 * filtros já presentes (busca, status). Sem debounce: `<input type="date">`
 * já é um evento discreto (não dispara a cada tecla).
 */
export function FiltroData() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function atualizar(campo: "de" | "ate", valor: string) {
    const params = new URLSearchParams(searchParams);
    if (valor) params.set(campo, valor);
    else params.delete(campo);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        aria-label="Criado de"
        defaultValue={searchParams.get("de") ?? ""}
        onChange={(e) => atualizar("de", e.target.value)}
        className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-text outline-none focus:border-gold"
      />
      <span className="text-[12.5px] text-text-faint">até</span>
      <input
        type="date"
        aria-label="Criado até"
        defaultValue={searchParams.get("ate") ?? ""}
        onChange={(e) => atualizar("ate", e.target.value)}
        className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-text outline-none focus:border-gold"
      />
    </div>
  );
}
