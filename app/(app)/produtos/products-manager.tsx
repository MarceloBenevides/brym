"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Plus, SlidersHorizontal, Tag, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Pill } from "@/components/ui/pill";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { formatBRL } from "@/lib/format";
import { estoqueBaixo, TIPO_MOVIMENTO_LABEL } from "@/lib/produto";
import type {
  EstoqueMovimentoRow,
  ProductRow,
} from "@/types/database";
import {
  ajustarEstoqueAction,
  createProductCategoryAction,
  deleteProductAction,
  deleteProductCategoryAction,
  renameProductCategoryAction,
  saveProductAction,
  type FormState,
} from "./actions";

type Categoria = { id: string; nome: string };
type Fornecedor = { id: string; nome: string };

const INITIAL: FormState = {};
const SEM_CATEGORIA = "__sem__";

export function ProductsManager({
  categorias,
  produtos,
  movimentos,
  fornecedores,
}: {
  categorias: Categoria[];
  produtos: ProductRow[];
  movimentos: EstoqueMovimentoRow[];
  fornecedores: Fornecedor[];
}) {
  const [editing, setEditing] = useState<ProductRow | "novo" | null>(null);
  const [ajustando, setAjustando] = useState<ProductRow | null>(null);
  const [gerenciarCategorias, setGerenciarCategorias] = useState(false);

  const grupos = agrupar(produtos, categorias);
  const baixos = produtos.filter(estoqueBaixo);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setEditing("novo")}
          className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={15} /> Novo produto
        </button>
        <button
          onClick={() => setGerenciarCategorias(true)}
          className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-soft"
        >
          <Tag size={15} /> Categorias
        </button>
      </div>

      {baixos.length > 0 && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-garnet/30 bg-[#f7e7e5] px-4 py-3 text-[13px] text-garnet">
          <AlertTriangle size={15} />
          {baixos.length === 1
            ? "1 produto no estoque mínimo ou abaixo."
            : `${baixos.length} produtos no estoque mínimo ou abaixo.`}
        </div>
      )}

      {produtos.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <p className="text-[13.5px] text-text-soft">
            Nenhum produto cadastrado ainda. Comece criando o primeiro.
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
                  {grupo.produtos.length}
                </span>
              </div>
              <Card>
                {grupo.produtos.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-5 py-3.5"
                    style={{
                      borderBottom:
                        i < grupo.produtos.length - 1
                          ? "1px solid var(--color-border)"
                          : undefined,
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-semibold text-text">
                          {p.nome}
                        </span>
                        {estoqueBaixo(p) && (
                          <Pill tone="garnet">estoque baixo</Pill>
                        )}
                      </div>
                      <div className="text-[12px] text-text-faint">
                        {[p.marca, p.codigo].filter(Boolean).join(" · ")}
                        {p.marca || p.codigo ? " · " : ""}
                        <span className="font-mono">{formatBRL(p.preco)}</span>
                        {" · "}
                        {p.controla_estoque
                          ? `${p.estoque_atual} em estoque`
                          : "sem controle de estoque"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.controla_estoque && (
                        <button
                          onClick={() => setAjustando(p)}
                          className="rounded-lg p-1.5 text-text-faint hover:bg-[#f1ece1] hover:text-text-soft"
                          aria-label={`Ajustar estoque de ${p.nome}`}
                        >
                          <SlidersHorizontal size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setEditing(p)}
                        className="rounded-lg p-1.5 text-text-faint hover:bg-[#f1ece1] hover:text-text-soft"
                        aria-label={`Editar ${p.nome}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <form action={deleteProductAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-lg p-1.5 text-text-faint hover:bg-[#f7e7e5] hover:text-garnet"
                          aria-label={`Excluir ${p.nome}`}
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
        <ProductFormModal
          categorias={categorias}
          product={editing === "novo" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {ajustando && (
        <AjustarEstoqueModal
          product={ajustando}
          movimentos={movimentos.filter((m) => m.product_id === ajustando.id)}
          fornecedores={fornecedores}
          onClose={() => setAjustando(null)}
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

function agrupar(produtos: ProductRow[], categorias: Categoria[]) {
  const porCategoria = new Map<string, ProductRow[]>();
  for (const p of produtos) {
    const key = p.category_id ?? SEM_CATEGORIA;
    const lista = porCategoria.get(key) ?? [];
    lista.push(p);
    porCategoria.set(key, lista);
  }
  const grupos = categorias
    .filter((c) => porCategoria.has(c.id))
    .map((c) => ({ id: c.id, nome: c.nome, produtos: porCategoria.get(c.id)! }));
  if (porCategoria.has(SEM_CATEGORIA)) {
    grupos.push({
      id: SEM_CATEGORIA,
      nome: "Sem categoria",
      produtos: porCategoria.get(SEM_CATEGORIA)!,
    });
  }
  return grupos;
}

function ProductFormModal({
  categorias,
  product,
  onClose,
}: {
  categorias: Categoria[];
  product: ProductRow | null;
  onClose: () => void;
}) {
  const [state, action] = useActionState(saveProductAction, INITIAL);
  const [controla, setControla] = useState(product?.controla_estoque ?? true);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal title={product ? "Editar produto" : "Novo produto"} onClose={onClose}>
      <form action={action} className="space-y-4">
        {product && <input type="hidden" name="id" value={product.id} />}
        <TextField
          label="Nome"
          name="nome"
          required
          defaultValue={product?.nome ?? ""}
          placeholder="Ex.: Pomada modeladora"
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Marca"
            name="marca"
            defaultValue={product?.marca ?? ""}
          />
          <TextField
            label="Código"
            name="codigo"
            defaultValue={product?.codigo ?? ""}
          />
        </div>
        <SelectField
          label="Categoria"
          name="category_id"
          defaultValue={product?.category_id ?? ""}
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
            label="Preço de venda (R$)"
            name="preco"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={product?.preco ?? ""}
          />
          <TextField
            label="Custo de compra (R$)"
            name="custo"
            type="number"
            min={0}
            step="0.01"
            defaultValue={product?.custo ?? ""}
          />
        </div>

        <label className="flex items-center gap-2 text-[13px] text-text">
          <input
            type="checkbox"
            name="controla_estoque"
            checked={controla}
            onChange={(e) => setControla(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--color-gold-deep)]"
          />
          Controlar estoque deste produto
        </label>

        {controla && (
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Estoque mínimo"
              name="estoque_min"
              type="number"
              min={0}
              defaultValue={product?.estoque_min ?? 0}
            />
            {product ? (
              <div>
                <span className="mb-1.5 block text-[12.5px] font-semibold text-text-soft">
                  Estoque atual
                </span>
                <div className="rounded-xl border border-border bg-[#faf7f0] px-3.5 py-2.5 text-sm text-text">
                  {product.estoque_atual} · use “Ajustar estoque”
                </div>
              </div>
            ) : (
              <TextField
                label="Estoque inicial"
                name="estoque_atual"
                type="number"
                min={0}
                defaultValue={0}
              />
            )}
          </div>
        )}

        {state.error && (
          <p className="text-[12.5px] text-garnet">{state.error}</p>
        )}
        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
      </form>
    </Modal>
  );
}

function AjustarEstoqueModal({
  product,
  movimentos,
  fornecedores,
  onClose,
}: {
  product: ProductRow;
  movimentos: EstoqueMovimentoRow[];
  fornecedores: Fornecedor[];
  onClose: () => void;
}) {
  const [state, action] = useActionState(ajustarEstoqueAction, INITIAL);
  const [tipo, setTipo] = useState("entrada");

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const recentes = useMemo(() => movimentos.slice(0, 10), [movimentos]);
  const nomeFornecedor = useMemo(
    () => new Map(fornecedores.map((f) => [f.id, f.nome])),
    [fornecedores],
  );

  return (
    <Modal title={`Ajustar estoque · ${product.nome}`} onClose={onClose}>
      <p className="mb-4 text-[13px] text-text-soft">
        Estoque atual:{" "}
        <span className="font-mono font-semibold text-text">
          {product.estoque_atual}
        </span>
      </p>
      <form action={action} className="space-y-4">
        <input type="hidden" name="product_id" value={product.id} />
        <SelectField
          label="Tipo"
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="entrada">Entrada (reposição)</option>
          <option value="saida">Saída (perda, uso interno)</option>
          <option value="ajuste">Contagem (corrigir o saldo)</option>
        </SelectField>
        <TextField
          label={tipo === "ajuste" ? "Saldo correto" : "Quantidade"}
          name="quantidade"
          type="number"
          min={0}
          required
          defaultValue=""
        />
        {tipo === "entrada" && fornecedores.length > 0 && (
          <SelectField label="Fornecedor" name="supplier_id" defaultValue="">
            <option value="">Sem fornecedor</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </SelectField>
        )}
        <TextField label="Motivo (opcional)" name="motivo" defaultValue="" />

        {state.error && (
          <p className="text-[12.5px] text-garnet">{state.error}</p>
        )}
        <SubmitButton pendingLabel="Salvando…">Registrar</SubmitButton>
      </form>

      {recentes.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-text-faint uppercase">
            Últimas movimentações
          </div>
          <ul className="space-y-1.5">
            {recentes.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between text-[12.5px]"
              >
                <span className="text-text-soft">
                  {dataHora(m.criado_em)} · {TIPO_MOVIMENTO_LABEL[m.tipo]}
                  {m.supplier_id && nomeFornecedor.get(m.supplier_id)
                    ? ` · ${nomeFornecedor.get(m.supplier_id)}`
                    : ""}
                  {m.motivo ? ` · ${m.motivo}` : ""}
                </span>
                <span className="font-mono text-text-faint">
                  {["entrada", "devolucao"].includes(m.tipo) ? "+" : "−"}
                  {m.quantidade}
                  {m.saldo_apos != null ? ` → ${m.saldo_apos}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

function dataHora(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function CategoryManagerModal({
  categorias,
  onClose,
}: {
  categorias: Categoria[];
  onClose: () => void;
}) {
  const [state, action] = useActionState(createProductCategoryAction, INITIAL);

  return (
    <Modal title="Categorias de produto" onClose={onClose}>
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
              <form
                action={renameProductCategoryAction}
                className="flex flex-1 gap-2"
              >
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
              <form action={deleteProductCategoryAction}>
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
        Ao excluir uma categoria, os produtos dela ficam como “Sem categoria”.
      </p>
      <div className="mt-4">
        <Pill tone="neutral">{categorias.length} categorias</Pill>
      </div>
    </Modal>
  );
}
