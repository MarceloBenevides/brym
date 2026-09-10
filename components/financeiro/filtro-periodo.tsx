"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PERIODOS } from "@/lib/relatorio";
import { cn } from "@/lib/cn";

/**
 * Chips de período (Hoje / 7d / 30d / Tempo todo) + intervalo custom.
 * Compartilhado por Relatórios, Comissões e Meu desempenho — cada tela passa o
 * `path` de destino e os `baseParams` (ex.: `{ aba: "comissoes" }`).
 */
export function FiltroPeriodo({
  periodoAtual,
  deAtual,
  ateAtual,
  path,
  baseParams,
  extraParams,
}: {
  periodoAtual: string;
  deAtual: string;
  ateAtual: string;
  path: string;
  baseParams: Record<string, string>;
  extraParams?: Record<string, string>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [customAberto, setCustomAberto] = useState(periodoAtual === "custom");
  const [de, setDe] = useState(deAtual);
  const [ate, setAte] = useState(ateAtual);

  const irPara = (params: Record<string, string>) => {
    const sp = new URLSearchParams({ ...baseParams, ...extraParams, ...params });
    startTransition(() => router.replace(`${path}?${sp.toString()}`));
  };

  const trocarPeriodo = (key: string) => {
    setCustomAberto(false);
    irPara({ periodo: key });
  };

  const aplicarCustom = () => {
    if (de && ate) irPara({ periodo: "custom", de, ate });
  };

  const chipClass = (ativo: boolean) =>
    cn(
      "rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
      ativo
        ? "border-ink bg-ink text-white"
        : "border-border bg-card text-text-soft hover:border-gold/60",
    );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.key}
            onClick={() => trocarPeriodo(p.key)}
            className={chipClass(periodoAtual === p.key)}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setCustomAberto((v) => !v)}
          className={chipClass(periodoAtual === "custom")}
        >
          Período…
        </button>
      </div>

      {customAberto && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
          <label className="text-[12px] font-semibold text-text-soft">
            De
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="mt-1 block rounded-lg border border-border px-2.5 py-1.5 text-[13px] outline-none focus:border-gold"
            />
          </label>
          <label className="text-[12px] font-semibold text-text-soft">
            Até
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="mt-1 block rounded-lg border border-border px-2.5 py-1.5 text-[13px] outline-none focus:border-gold"
            />
          </label>
          <button
            onClick={aplicarCustom}
            className="rounded-xl bg-ink px-4 py-2 text-[13px] font-semibold text-white"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
