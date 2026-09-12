"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Pill } from "@/components/ui/pill";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { CATEGORIAS_DESPESA } from "@/lib/despesas";
import { formatBRL } from "@/lib/format";
import type { ExpenseRow } from "@/types/database";
import {
  deleteExpenseAction,
  saveExpenseAction,
  setExpenseStatusAction,
  type ExpenseState,
} from "./actions";

const INITIAL: ExpenseState = {};

function dataBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function ExpensesManager({
  despesas,
  mes,
}: {
  despesas: ExpenseRow[];
  mes: string;
}) {
  const [editing, setEditing] = useState<ExpenseRow | "nova" | null>(null);

  return (
    <div>
      <div className="mb-5">
        <button
          onClick={() => setEditing("nova")}
          className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={15} /> Nova despesa
        </button>
      </div>

      {despesas.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <p className="text-[13.5px] text-text-soft">
            Nenhuma despesa lançada neste mês.
          </p>
        </Card>
      ) : (
        <Card>
          {despesas.map((d, i) => (
            <div
              key={d.id}
              className="flex items-center justify-between px-5 py-4"
              style={{
                borderBottom:
                  i < despesas.length - 1
                    ? "1px solid var(--color-border)"
                    : undefined,
              }}
            >
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-text">
                  {d.descricao || d.categoria}
                </div>
                <div className="text-[12px] text-text-faint">
                  {d.categoria} · {dataBR(d.data)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13.5px] font-semibold text-text">
                  {formatBRL(d.valor)}
                </span>
                <form action={setExpenseStatusAction}>
                  <input type="hidden" name="id" value={d.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={d.status === "pago" ? "pendente" : "pago"}
                  />
                  <ActionButton aria-label="Alternar situação">
                    <Pill tone={d.status === "pago" ? "forest" : "gold"}>
                      {d.status === "pago" ? "pago" : "pendente"}
                    </Pill>
                  </ActionButton>
                </form>
                <button
                  onClick={() => setEditing(d)}
                  className="rounded-lg p-1.5 text-text-faint hover:bg-[#f1ece1] hover:text-text-soft"
                  aria-label={`Editar ${d.descricao || d.categoria}`}
                >
                  <Pencil size={14} />
                </button>
                <form action={deleteExpenseAction}>
                  <input type="hidden" name="id" value={d.id} />
                  <ActionButton
                    className="rounded-lg p-1.5 text-text-faint hover:bg-[#f7e7e5] hover:text-garnet"
                    aria-label="Excluir despesa"
                  >
                    <Trash2 size={14} />
                  </ActionButton>
                </form>
              </div>
            </div>
          ))}
        </Card>
      )}

      {editing && (
        <ExpenseFormModal
          despesa={editing === "nova" ? null : editing}
          mes={mes}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ExpenseFormModal({
  despesa,
  mes,
  onClose,
}: {
  despesa: ExpenseRow | null;
  mes: string;
  onClose: () => void;
}) {
  const [state, action] = useActionState(saveExpenseAction, INITIAL);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const dataPadrao = despesa?.data ?? `${mes}-01`;

  return (
    <Modal title={despesa ? "Editar despesa" : "Nova despesa"} onClose={onClose}>
      <form action={action} className="space-y-4">
        {despesa && <input type="hidden" name="id" value={despesa.id} />}
        <TextField
          label="Descrição"
          name="descricao"
          defaultValue={despesa?.descricao ?? ""}
          placeholder="Ex.: Aluguel de setembro"
        />
        <SelectField
          label="Categoria"
          name="categoria"
          defaultValue={despesa?.categoria ?? CATEGORIAS_DESPESA[0]}
          required
        >
          {CATEGORIAS_DESPESA.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Valor (R$)"
            name="valor"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={despesa?.valor ?? ""}
          />
          <TextField
            label="Data"
            name="data"
            type="date"
            required
            defaultValue={dataPadrao}
          />
        </div>
        <SelectField
          label="Situação"
          name="status"
          defaultValue={despesa?.status ?? "pendente"}
        >
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
        </SelectField>

        {state.error && (
          <p className="text-[12.5px] text-garnet">{state.error}</p>
        )}
        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
      </form>
    </Modal>
  );
}
