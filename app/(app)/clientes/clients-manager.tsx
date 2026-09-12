"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronRight, Pencil, Plus } from "lucide-react";

import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { formatAniversario, formatBRL, iniciais } from "@/lib/format";
import type { ClientRow } from "@/types/database";
import {
  deleteClientAction,
  saveClientAction,
  type ClientState,
} from "./actions";

const INITIAL: ClientState = {};

export function ClientsManager({
  clientes,
  podeEditar,
}: {
  clientes: ClientRow[];
  podeEditar: boolean;
}) {
  const [selected, setSelected] = useState<ClientRow | null>(null);
  const [editing, setEditing] = useState<ClientRow | "novo" | null>(null);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Pesquisar por nome, telefone ou e-mail" />
        {podeEditar && (
          <button
            onClick={() => setEditing("novo")}
            className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={15} /> Novo cliente
          </button>
        )}
      </div>

      {clientes.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <p className="text-[13.5px] text-text-soft">
            Nenhum cliente encontrado.
          </p>
        </Card>
      ) : (
        <Card>
          {clientes.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
              style={{
                borderBottom:
                  i < clientes.length - 1
                    ? "1px solid var(--color-border)"
                    : undefined,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fbf1dc] text-[13px] font-semibold text-gold-deep">
                  {iniciais(c.nome)}
                </div>
                <div>
                  <div className="text-[13.5px] font-semibold text-text">
                    {c.nome}
                  </div>
                  <div className="text-[12px] text-text-faint">
                    {[c.telefone, c.email].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-text-faint" />
            </button>
          ))}
        </Card>
      )}

      {selected && (
        <ClientDetailModal
          client={selected}
          podeEditar={podeEditar}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected);
            setSelected(null);
          }}
        />
      )}
      {editing && (
        <ClientFormModal
          client={editing === "novo" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-wide text-text-faint uppercase">
        {label}
      </div>
      <div className="mt-1 text-[13.5px] text-text">{children}</div>
    </div>
  );
}

function ClientDetailModal({
  client,
  podeEditar,
  onClose,
  onEdit,
}: {
  client: ClientRow;
  podeEditar: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const aniversario = formatAniversario(
    client.aniversario_dia,
    client.aniversario_mes,
  );
  return (
    <Modal title={client.nome} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-5">
        <Campo label="Telefone">{client.telefone || "—"}</Campo>
        <Campo label="E-mail">{client.email || "—"}</Campo>
        <Campo label="Aniversário">{aniversario || "—"}</Campo>
        <Campo label="Saldo na casa">
          <span className="font-mono text-forest">
            {formatBRL(client.saldo_credito)}
          </span>
        </Campo>
      </div>

      {client.observacoes && (
        <div className="mt-5">
          <Campo label="Observações">{client.observacoes}</Campo>
        </div>
      )}

      <div className="mt-6">
        <div className="text-[11px] font-semibold tracking-wide text-text-faint uppercase">
          Próximos agendamentos
        </div>
        <p className="mt-2 text-[13px] text-text-faint">
          Nenhum agendamento futuro. A agenda entra na próxima entrega.
        </p>
      </div>

      <div className="mt-5">
        <div className="text-[11px] font-semibold tracking-wide text-text-faint uppercase">
          Histórico de serviços
        </div>
        <p className="mt-2 text-[13px] text-text-faint">
          O histórico é gerado ao fechar comandas (Fase 2).
        </p>
      </div>

      {podeEditar && (
        <div className="mt-6 flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            <Pencil size={14} /> Editar
          </button>
          <form action={deleteClientAction}>
            <input type="hidden" name="id" value={client.id} />
            <ActionButton
              pendingLabel="Removendo…"
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-soft hover:border-garnet hover:text-garnet"
            >
              Remover
            </ActionButton>
          </form>
        </div>
      )}
    </Modal>
  );
}

function ClientFormModal({
  client,
  onClose,
}: {
  client: ClientRow | null;
  onClose: () => void;
}) {
  const [state, action] = useActionState(saveClientAction, INITIAL);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal title={client ? "Editar cliente" : "Novo cliente"} onClose={onClose}>
      <form action={action} className="space-y-4">
        {client && <input type="hidden" name="id" value={client.id} />}
        <TextField
          label="Nome"
          name="nome"
          required
          defaultValue={client?.nome ?? ""}
          placeholder="Nome completo"
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Telefone"
            name="telefone"
            type="tel"
            defaultValue={client?.telefone ?? ""}
            placeholder="(00) 00000-0000"
          />
          <TextField
            label="E-mail"
            name="email"
            type="email"
            defaultValue={client?.email ?? ""}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Dia do aniversário"
            name="aniversario_dia"
            type="number"
            min={1}
            max={31}
            defaultValue={client?.aniversario_dia ?? ""}
          />
          <TextField
            label="Mês do aniversário"
            name="aniversario_mes"
            type="number"
            min={1}
            max={12}
            defaultValue={client?.aniversario_mes ?? ""}
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
            defaultValue={client?.observacoes ?? ""}
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
