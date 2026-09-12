"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { ActionButton } from "@/components/ui/action-button";
import type { StatusAssinatura } from "@/types/database";
import {
  ativarManualAction,
  estenderTrialAction,
  setStatusNegocioAction,
} from "./actions";

/**
 * Menu compacto "···" por linha — antes os 3 grupos (Ativar/Suspender/
 * Cancelar, Estender trial, Ativar manual) ficavam sempre visíveis na
 * célula de Status; com 40+ negócios isso poluía a tabela. Mesmo padrão de
 * fechar em clique fora/Escape de `components/app-shell/avatar-menu.tsx`.
 * Lógica das ações em si não muda — mesmas server actions, mesmo `ActionButton`.
 */
export function NegocioAcoesMenu({
  id,
  status,
}: {
  id: string;
  status: StatusAssinatura;
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

  const statusAlvos: { label: string; status: StatusAssinatura }[] = [];
  if (status !== "ativo") statusAlvos.push({ label: "Ativar", status: "ativo" });
  if (status === "trial" || status === "ativo")
    statusAlvos.push({ label: "Suspender", status: "suspenso" });
  if (status !== "cancelado")
    statusAlvos.push({ label: "Cancelar", status: "cancelado" });

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Ações do negócio"
        aria-expanded={open}
        className="rounded-lg p-1.5 text-text-faint hover:bg-[#f1ece1] hover:text-text-soft"
      >
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 z-20 w-48 space-y-3 rounded-xl border border-border bg-card p-3 shadow-lg">
          <div>
            <div className="mb-1.5 text-[10.5px] font-semibold tracking-wide text-text-faint uppercase">
              Status
            </div>
            <div className="flex flex-wrap gap-1.5">
              {statusAlvos.map((a) => (
                <form key={a.status} action={setStatusNegocioAction}>
                  <input type="hidden" name="tenant_id" value={id} />
                  <input type="hidden" name="status" value={a.status} />
                  <ActionButton className="rounded-lg border border-border px-2 py-1 text-[11.5px] font-semibold text-text-soft hover:border-gold-deep hover:text-gold-deep">
                    {a.label}
                  </ActionButton>
                </form>
              ))}
            </div>
          </div>

          {status === "trial" && (
            <div>
              <div className="mb-1.5 text-[10.5px] font-semibold tracking-wide text-text-faint uppercase">
                Estender trial
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[7, 15, 30].map((dias) => (
                  <form key={dias} action={estenderTrialAction}>
                    <input type="hidden" name="tenant_id" value={id} />
                    <input type="hidden" name="dias" value={dias} />
                    <ActionButton className="rounded-lg border border-border px-2 py-1 text-[11.5px] font-semibold text-text-soft hover:border-gold-deep hover:text-gold-deep">
                      +{dias}d
                    </ActionButton>
                  </form>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-1.5 text-[10.5px] font-semibold tracking-wide text-text-faint uppercase">
              Ativar manual
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { meses: 3, label: "3m" },
                { meses: 6, label: "6m" },
                { meses: 12, label: "1a" },
              ].map((o) => (
                <form key={o.meses} action={ativarManualAction}>
                  <input type="hidden" name="tenant_id" value={id} />
                  <input type="hidden" name="meses" value={o.meses} />
                  <ActionButton className="rounded-lg border border-border px-2 py-1 text-[11.5px] font-semibold text-text-soft hover:border-gold-deep hover:text-gold-deep">
                    {o.label}
                  </ActionButton>
                </form>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
