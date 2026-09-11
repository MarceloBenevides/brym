"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Pill } from "@/components/ui/pill";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { formatBRL, formatDuracao } from "@/lib/format";
import { placeholderServico } from "@/lib/segments";
import type { Segmento, ServiceRow } from "@/types/database";
import {
  createCategoryAction,
  deleteCategoryAction,
  deleteServiceAction,
  renameCategoryAction,
  saveServiceAction,
  type FormState,
} from "./actions";

type Categoria = { id: string; nome: string };

const INITIAL: FormState = {};
const SEM_CATEGORIA = "__sem__";

export function ServicesManager({
  categorias,
  servicos,
  segmento,
}: {
  categorias: Categoria[];
  servicos: ServiceRow[];
  segmento: Segmento;
}) {
  const [editing, setEditing] = useState<ServiceRow | "novo" | null>(null);
  const [gerenciarCategorias, setGerenciarCategorias] = useState(false);

  const grupos = agrupar(servicos, categorias);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setEditing("novo")}
          className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={15} /> Novo serviço
        </button>
        <button
          onClick={() => setGerenciarCategorias(true)}
          className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-soft"
        >
          <Tag size={15} /> Categorias
        </button>
      </div>

      {servicos.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <p className="text-[13.5px] text-text-soft">
            Nenhum serviço cadastrado ainda. Comece criando o primeiro.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grupos.map((grupo) => (
            <div key={grupo.id}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-[12.5px] font-semibold tracking-wide text-text-faint uppercase">
                  {grupo.nome}
                </h2>
                <span className="text-[11.5px] text-text-faint">
                  {grupo.servicos.length}
                </span>
              </div>
              <Card>
                {grupo.servicos.map((s, i) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-5 py-3.5"
                    style={{
                      borderBottom:
                        i < grupo.servicos.length - 1
                          ? "1px solid var(--color-border)"
                          : undefined,
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-text">
                        {s.nome}
                      </div>
                      <div className="font-mono text-[12px] text-text-faint">
                        {formatDuracao(s.duracao_min)} · {formatBRL(s.preco)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(s)}
                        className="rounded-lg p-1.5 text-text-faint hover:bg-[#f1ece1] hover:text-text-soft"
                        aria-label={`Editar ${s.nome}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <form action={deleteServiceAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          className="rounded-lg p-1.5 text-text-faint hover:bg-[#f7e7e5] hover:text-garnet"
                          aria-label={`Excluir ${s.nome}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ServiceFormModal
          categorias={categorias}
          service={editing === "novo" ? null : editing}
          segmento={segmento}
          onClose={() => setEditing(null)}
        />
      )}
      {gerenciarCategorias && (
        <CategoryManagerModal
          categorias={categorias}
          onClose={() => setGerenciarCategorias(false)}
        />
      )}
    </div>
  );
}

function agrupar(servicos: ServiceRow[], categorias: Categoria[]) {
  const porCategoria = new Map<string, ServiceRow[]>();
  for (const s of servicos) {
    const key = s.category_id ?? SEM_CATEGORIA;
    const lista = porCategoria.get(key) ?? [];
    lista.push(s);
    porCategoria.set(key, lista);
  }
  const grupos = categorias
    .filter((c) => porCategoria.has(c.id))
    .map((c) => ({ id: c.id, nome: c.nome, servicos: porCategoria.get(c.id)! }));
  if (porCategoria.has(SEM_CATEGORIA)) {
    grupos.push({
      id: SEM_CATEGORIA,
      nome: "Sem categoria",
      servicos: porCategoria.get(SEM_CATEGORIA)!,
    });
  }
  return grupos;
}

function ServiceFormModal({
  categorias,
  service,
  segmento,
  onClose,
}: {
  categorias: Categoria[];
  service: ServiceRow | null;
  segmento: Segmento;
  onClose: () => void;
}) {
  const [state, action] = useActionState(saveServiceAction, INITIAL);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal
      title={service ? "Editar serviço" : "Novo serviço"}
      onClose={onClose}
    >
      <form action={action} className="space-y-4">
        {service && <input type="hidden" name="id" value={service.id} />}
        <TextField
          label="Nome"
          name="nome"
          required
          defaultValue={service?.nome ?? ""}
          placeholder={placeholderServico(segmento)}
        />
        <SelectField
          label="Categoria"
          name="category_id"
          defaultValue={service?.category_id ?? ""}
        >
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Duração (min)"
            name="duracao_min"
            type="number"
            min={1}
            required
            defaultValue={service?.duracao_min ?? 30}
          />
          <TextField
            label="Preço (R$)"
            name="preco"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={service?.preco ?? ""}
          />
        </div>

        {state.error && (
          <p className="text-[12.5px] text-garnet">{state.error}</p>
        )}
        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
      </form>
    </Modal>
  );
}

function CategoryManagerModal({
  categorias,
  onClose,
}: {
  categorias: Categoria[];
  onClose: () => void;
}) {
  const [state, action] = useActionState(createCategoryAction, INITIAL);

  return (
    <Modal title="Categorias de serviço" onClose={onClose}>
      <form action={action} className="mb-5 flex gap-2">
        <input
          name="nome"
          required
          minLength={2}
          placeholder="Nova categoria"
          className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
        />
        <button
          type="submit"
          className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"
        >
          Adicionar
        </button>
      </form>
      {state.error && (
        <p className="mb-3 text-[12.5px] text-garnet">{state.error}</p>
      )}

      {categorias.length === 0 ? (
        <p className="text-[13px] text-text-faint">
          Nenhuma categoria. Crie a primeira acima.
        </p>
      ) : (
        <ul className="space-y-2">
          {categorias.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <form action={renameCategoryAction} className="flex flex-1 gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input
                  name="nome"
                  defaultValue={c.nome}
                  minLength={2}
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] outline-none focus:border-gold"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-text-soft"
                >
                  Renomear
                </button>
              </form>
              <form action={deleteCategoryAction}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-text-soft hover:border-garnet hover:text-garnet"
                  aria-label={`Excluir ${c.nome}`}
                >
                  <Trash2 size={13} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[11.5px] text-text-faint">
        Ao excluir uma categoria, os serviços dela ficam como “Sem categoria”.
      </p>
      <div className="mt-4">
        <Pill tone="neutral">{categorias.length} categorias</Pill>
      </div>
    </Modal>
  );
}
