"use client";

import { useActionState, useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  importarClientesAction,
  type ImportResult,
} from "@/app/(app)/clientes/import-actions";

const INITIAL: ImportResult = {};

export function ImportarExportar() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href="/clientes/exportar"
          className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-[12.5px] font-semibold text-text-soft hover:border-gold"
        >
          <Download size={14} /> Exportar CSV
        </a>
        <button
          onClick={() => setAberto(true)}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-[12.5px] font-semibold text-text-soft hover:border-gold"
        >
          <Upload size={14} /> Importar CSV
        </button>
      </div>

      {aberto && <ImportarModal onClose={() => setAberto(false)} />}
    </>
  );
}

function ImportarModal({ onClose }: { onClose: () => void }) {
  const [state, action] = useActionState(importarClientesAction, INITIAL);

  useEffect(() => {
    // fecha sozinho num import 100% limpo
    if (state.ok && !state.pulados && !state.erros?.length && !state.avisos) {
      const t = setTimeout(onClose, 1200);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  return (
    <Modal title="Importar clientes (CSV)" onClose={onClose}>
      <form action={action} className="space-y-4">
        <p className="text-[13px] text-text-soft">
          Colunas: <span className="font-mono text-[12px]">nome</span> (obrigatória),{" "}
          <span className="font-mono text-[12px]">telefone</span>,{" "}
          <span className="font-mono text-[12px]">email</span>,{" "}
          <span className="font-mono text-[12px]">aniversario</span> (dd/mm),{" "}
          <span className="font-mono text-[12px]">observacoes</span>.{" "}
          <a
            href="/clientes/exportar?modelo=1"
            className="font-semibold text-gold-deep underline"
          >
            Baixar modelo
          </a>
        </p>

        <input
          type="file"
          name="arquivo"
          accept=".csv,text/csv"
          required
          className="block w-full text-[13px] text-text-soft file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-2 file:text-[12.5px] file:font-semibold file:text-white"
        />

        {state.error && (
          <p className="text-[12.5px] text-garnet">{state.error}</p>
        )}

        {state.ok && (
          <div className="rounded-xl border border-border bg-[#f6f2e8] px-4 py-3 text-[12.5px] text-text-soft">
            <p className="font-semibold text-text">
              {state.importados} cliente(s) importado(s).
            </p>
            {!!state.pulados && (
              <p>{state.pulados} pulado(s) — telefone já cadastrado.</p>
            )}
            {!!state.avisos && (
              <p>{state.avisos} sem aniversário — data em formato inválido.</p>
            )}
            {!!state.erros?.length && (
              <div className="mt-1">
                <p>{state.erros.length} linha(s) com erro:</p>
                <ul className="mt-0.5 list-inside list-disc">
                  {state.erros.map((e, i) => (
                    <li key={i}>
                      linha {e.linha}: {e.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <SubmitButton pendingLabel="Importando…">Importar</SubmitButton>
      </form>
    </Modal>
  );
}
