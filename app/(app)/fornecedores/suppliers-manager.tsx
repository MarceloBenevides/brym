"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import type { SupplierRow } from "@/types/database";
import {
  deleteSupplierAction,
  saveSupplierAction,
  type SupplierState,
} from "./actions";

const INITIAL: SupplierState = {};

export function SuppliersManager({
  fornecedores,
}: {
  fornecedores: SupplierRow[];
}) {
  const [editing, setEditing] = useState<SupplierRow | "novo" | null>(null);

  return (
    <div>
      <div className="mb-5">
        <button
          onClick={() => setEditing("novo")}
          className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={15} /> Novo fornecedor
        </button>
      </div>

      {fornecedores.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <p className="text-[13.5px] text-text-soft">
            Nenhum fornecedor cadastrado ainda.
          </p>
        </Card>
      ) : (
        <Card>
          {fornecedores.map((f, i) => (
            <div
              key={f.id}
              className="flex items-center justify-between px-5 py-4"
              style={{
                borderBottom:
                  i < fornecedores.length - 1
                    ? "1px solid var(--color-border)"
                    : undefined,
              }}
            >
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-text">
                  {f.nome}
                </div>
                <div className="text-[12px] text-text-faint">
                  {[f.telefone, f.email].filter(Boolean).join(" · ") || "—"}
                </div>
                {f.observacoes && (
                  <div className="mt-0.5 text-[12px] text-text-soft">
                    {f.observacoes}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(f)}
                  className="rounded-lg p-1.5 text-text-faint hover:bg-[#f1ece1] hover:text-text-soft"
                  aria-label={`Editar ${f.nome}`}
                >
                  <Pencil size={14} />
                </button>
                <form action={deleteSupplierAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <button
                    type="submit"
                    className="rounded-lg p-1.5 text-text-faint hover:bg-[#f7e7e5] hover:text-garnet"
                    aria-label={`Excluir ${f.nome}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </Card>
      )}

      {editing && (
        <SupplierFormModal
          supplier={editing === "novo" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SupplierFormModal({
  supplier,
  onClose,
}: {
  supplier: SupplierRow | null;
  onClose: () => void;
}) {
  const [state, action] = useActionState(saveSupplierAction, INITIAL);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal
      title={supplier ? "Editar fornecedor" : "Novo fornecedor"}
      onClose={onClose}
    >
      <form action={action} className="space-y-4">
        {supplier && <input type="hidden" name="id" value={supplier.id} />}
        <TextField
          label="Nome"
          name="nome"
          required
          defaultValue={supplier?.nome ?? ""}
          placeholder="Ex.: Distribuidora Barba & Cia"
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Telefone"
            name="telefone"
            type="tel"
            defaultValue={supplier?.telefone ?? ""}
            placeholder="(00) 00000-0000"
          />
          <TextField
            label="E-mail"
            name="email"
            type="email"
            defaultValue={supplier?.email ?? ""}
          />
        </div>
        <label htmlFor="observacoes" className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-text-soft">
            Observações
          </span>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={3}
            defaultValue={supplier?.observacoes ?? ""}
            placeholder="O que fornece, condições de pagamento, etc."
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
          />
        </label>

        {state.error && (
          <p className="text-[12.5px] text-garnet">{state.error}</p>
        )}
        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
      </form>
    </Modal>
  );
}
