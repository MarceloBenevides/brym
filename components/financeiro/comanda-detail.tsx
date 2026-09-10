"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import {
  addItemAction,
  addPaymentAction,
  excluirComandaAction,
  fecharComandaAction,
  reabrirComandaAction,
  removeItemAction,
  removePaymentAction,
  type ComandaFormState,
} from "@/app/(app)/financeiro/comanda-actions";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { FORMAS_PAGAMENTO, formaLabel, restante, totalItens, totalPago } from "@/lib/comanda";
import { formatBRL } from "@/lib/format";
import type {
  ComandaItemRow,
  ComandaRow,
  PaymentRow,
  ProductRow,
  ServiceRow,
} from "@/types/database";

const INITIAL: ComandaFormState = {};
type ServicoMin = Pick<ServiceRow, "id" | "nome" | "preco">;
type ProdutoMin = Pick<
  ProductRow,
  "id" | "nome" | "preco" | "controla_estoque" | "estoque_atual"
>;

function dataBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return d ? `${d}/${m}/${y}` : iso;
}

export function ComandaDetail({
  comanda,
  itens,
  pagamentos,
  clienteNome,
  clienteSaldo,
  agendamento,
  avulsa,
  servicos,
  produtos,
  podeFinanceiro,
}: {
  comanda: ComandaRow;
  itens: ComandaItemRow[];
  pagamentos: PaymentRow[];
  clienteNome: string | null;
  clienteSaldo: number;
  agendamento: { data: string; hora: string; profissional: string | null } | null;
  avulsa: boolean;
  servicos: ServicoMin[];
  produtos: ProdutoMin[];
  podeFinanceiro: boolean;
}) {
  const aberta = comanda.status === "aberta";
  const total = totalItens(itens);
  const pago = totalPago(pagamentos);
  const falta = restante(itens, pagamentos);

  const [addItemState, addItem] = useActionState(addItemAction, INITIAL);
  const [rmItemState, rmItem] = useActionState(removeItemAction, INITIAL);
  const [addPagState, addPag] = useActionState(addPaymentAction, INITIAL);
  const [rmPagState, rmPag] = useActionState(removePaymentAction, INITIAL);
  const [fecharState, fecharAction] = useActionState(fecharComandaAction, INITIAL);

  const erro =
    addItemState.error ??
    rmItemState.error ??
    addPagState.error ??
    rmPagState.error ??
    fecharState.error ??
    null;

  return (
    <div>
      <Link
        href="/financeiro"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-text-soft"
      >
        <ArrowLeft size={14} /> Comandas
      </Link>

      <Card className="mb-4 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-text">
              {clienteNome ?? (avulsa ? "Venda avulsa" : "Comanda")}
            </h1>
            <p className="mt-0.5 text-[13px] text-text-soft">
              {agendamento
                ? `${dataBR(agendamento.data)}${agendamento.hora ? ` às ${agendamento.hora}` : ""}${agendamento.profissional ? ` · ${agendamento.profissional}` : ""}`
                : "Venda de balcão · sem agendamento"}
            </p>
            {clienteNome && (
              <p className="mt-1 text-[12px] text-text-faint">
                Saldo na casa: {formatBRL(clienteSaldo)}
              </p>
            )}
          </div>
          <Pill tone={aberta ? "gold" : "forest"}>
            {aberta ? "aberta" : "fechada"}
          </Pill>
        </div>
      </Card>

      {/* Itens */}
      <Card className="mb-4">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="font-display text-lg font-semibold text-text">Itens</h2>
        </div>
        {itens.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-text-faint">Nenhum item.</p>
        ) : (
          <ul>
            {itens.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between border-b border-border px-5 py-3 last:border-b-0"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-text">
                      {it.descricao}
                    </span>
                    {it.tipo === "produto" && (
                      <Pill tone="neutral">produto</Pill>
                    )}
                  </div>
                  <div className="font-mono text-[12px] text-text-faint">
                    {it.quantidade} × {formatBRL(it.valor_unitario)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[13px] font-semibold text-text">
                    {formatBRL(it.quantidade * it.valor_unitario)}
                  </span>
                  {aberta && (
                    <form action={rmItem}>
                      <input type="hidden" name="comanda_id" value={comanda.id} />
                      <input type="hidden" name="item_id" value={it.id} />
                      <button
                        type="submit"
                        className="rounded-lg p-1.5 text-text-faint hover:bg-[#f7e7e5] hover:text-garnet"
                        aria-label="Remover item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {aberta && (
          <div className="border-t border-border p-5">
            <AddItemForm
              comandaId={comanda.id}
              servicos={servicos}
              produtos={produtos}
              action={addItem}
              avulsa={avulsa}
            />
          </div>
        )}
      </Card>

      {/* Pagamentos */}
      <Card className="mb-4">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="font-display text-lg font-semibold text-text">
            Pagamentos
          </h2>
        </div>
        {pagamentos.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-text-faint">
            Nenhum pagamento registrado.
          </p>
        ) : (
          <ul>
            {pagamentos.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between border-b border-border px-5 py-3 last:border-b-0"
              >
                <span className="text-[13px] text-text">{formaLabel(p.forma)}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[13px] font-semibold text-text">
                    {formatBRL(p.valor)}
                  </span>
                  {aberta && (
                    <form action={rmPag}>
                      <input type="hidden" name="comanda_id" value={comanda.id} />
                      <input type="hidden" name="payment_id" value={p.id} />
                      <button
                        type="submit"
                        className="rounded-lg p-1.5 text-text-faint hover:bg-[#f7e7e5] hover:text-garnet"
                        aria-label="Remover pagamento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {aberta && (
          <div className="border-t border-border p-5">
            <AddPaymentForm
              comandaId={comanda.id}
              sugestao={Math.max(falta, 0)}
              action={addPag}
            />
          </div>
        )}
      </Card>

      {/* Totais */}
      <Card className="mb-4 p-5">
        <Row label="Total dos itens" value={formatBRL(total)} />
        <Row label="Total pago" value={formatBRL(pago)} />
        <div className="mt-2 border-t border-border pt-2">
          <Row
            label={falta > 0 ? "Falta pagar" : falta < 0 ? "Troco" : "Quitada"}
            value={formatBRL(Math.abs(falta))}
            forte
            tone={falta > 0 ? "garnet" : "forest"}
          />
        </div>
      </Card>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-3">
        {aberta ? (
          <form action={fecharAction}>
            <input type="hidden" name="comanda_id" value={comanda.id} />
            <SubmitButton pendingLabel="Fechando…" disabled={falta > 0}>
              Fechar comanda
            </SubmitButton>
          </form>
        ) : (
          podeFinanceiro && (
            <form action={reabrirComandaAction}>
              <input type="hidden" name="comanda_id" value={comanda.id} />
              <button
                type="submit"
                className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-text-soft hover:border-gold"
              >
                Reabrir comanda
              </button>
            </form>
          )
        )}
        <form action={excluirComandaAction}>
          <input type="hidden" name="comanda_id" value={comanda.id} />
          <button
            type="submit"
            className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-text-soft hover:border-garnet hover:text-garnet"
          >
            Excluir
          </button>
        </form>
      </div>

      {erro && <p className="mt-3 text-[12.5px] text-garnet">{erro}</p>}
    </div>
  );
}

/** Botão de submit compacto com rótulo de "aguarde" enquanto a action roda. */
function BotaoAcao({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
    >
      {pending ? (
        pendingLabel
      ) : (
        <>
          <Plus size={15} /> {children}
        </>
      )}
    </button>
  );
}

function Row({
  label,
  value,
  forte,
  tone,
}: {
  label: string;
  value: string;
  forte?: boolean;
  tone?: "garnet" | "forest";
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span
        className={
          forte ? "text-[13.5px] font-semibold text-text" : "text-[13px] text-text-soft"
        }
      >
        {label}
      </span>
      <span
        className={`font-mono text-[13.5px] font-semibold ${
          tone === "garnet"
            ? "text-garnet"
            : tone === "forest"
              ? "text-forest"
              : "text-text"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function AddItemForm({
  comandaId,
  servicos,
  produtos,
  action,
  avulsa,
}: {
  comandaId: string;
  servicos: ServicoMin[];
  produtos: ProdutoMin[];
  action: (formData: FormData) => void;
  avulsa: boolean;
}) {
  const [modo, setModo] = useState<"servico" | "produto">("servico");

  // Venda avulsa só aceita produto (o trigger no banco é a trava de verdade).
  if (avulsa) {
    return <AddProdutoForm comandaId={comandaId} produtos={produtos} action={action} />;
  }

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-xl border border-border p-0.5 text-[12.5px] font-semibold">
        {(["servico", "produto"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`rounded-lg px-3 py-1.5 ${
              modo === m ? "bg-ink text-white" : "text-text-soft"
            }`}
          >
            {m === "servico" ? "Serviço" : "Produto"}
          </button>
        ))}
      </div>

      {modo === "servico" ? (
        <AddServicoForm comandaId={comandaId} servicos={servicos} action={action} />
      ) : (
        <AddProdutoForm comandaId={comandaId} produtos={produtos} action={action} />
      )}
    </div>
  );
}

function AddServicoForm({
  comandaId,
  servicos,
  action,
}: {
  comandaId: string;
  servicos: ServicoMin[];
  action: (formData: FormData) => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="comanda_id" value={comandaId} />
      <input type="hidden" name="tipo" value="servico" />
      <SelectField
        label="Serviço"
        name="service_id"
        defaultValue=""
        onChange={(e) => {
          const s = servicos.find((x) => x.id === e.target.value);
          if (s) {
            setDescricao(s.nome);
            setValor(String(s.preco));
          }
        }}
      >
        <option value="">Item avulso</option>
        {servicos.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nome} · {formatBRL(s.preco)}
          </option>
        ))}
      </SelectField>
      <div className="grid grid-cols-[1fr_80px_120px] gap-3">
        <TextField
          label="Descrição"
          name="descricao"
          required
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <TextField
          label="Qtd"
          name="quantidade"
          type="number"
          min={1}
          defaultValue={1}
          required
        />
        <TextField
          label="Valor unit."
          name="valor_unitario"
          type="number"
          min={0}
          step="0.01"
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </div>
      <BotaoAcao pendingLabel="Adicionando…">Adicionar item</BotaoAcao>
    </form>
  );
}

function AddProdutoForm({
  comandaId,
  produtos,
  action,
}: {
  comandaId: string;
  produtos: ProdutoMin[];
  action: (formData: FormData) => void;
}) {
  if (produtos.length === 0) {
    return (
      <p className="text-[13px] text-text-faint">
        Nenhum produto cadastrado. Cadastre em Produtos para vender aqui.
      </p>
    );
  }

  const rotulo = (p: ProdutoMin) =>
    `${p.nome} — ${formatBRL(p.preco)} — ${
      p.controla_estoque ? `${p.estoque_atual} em estoque` : "sem controle"
    }`;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="comanda_id" value={comandaId} />
      <input type="hidden" name="tipo" value="produto" />
      <div className="grid grid-cols-[1fr_80px] gap-3">
        <SelectField label="Produto" name="product_id" defaultValue="" required>
          <option value="">Selecione…</option>
          {produtos.map((p) => (
            <option
              key={p.id}
              value={p.id}
              disabled={p.controla_estoque && p.estoque_atual <= 0}
            >
              {rotulo(p)}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Qtd"
          name="quantidade"
          type="number"
          min={1}
          defaultValue={1}
          required
        />
      </div>
      <BotaoAcao pendingLabel="Adicionando…">Adicionar produto</BotaoAcao>
    </form>
  );
}

function AddPaymentForm({
  comandaId,
  sugestao,
  action,
}: {
  comandaId: string;
  sugestao: number;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="comanda_id" value={comandaId} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Forma" name="forma" defaultValue="pix">
          {FORMAS_PAGAMENTO.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Valor (R$)"
          name="valor"
          type="number"
          min={0.01}
          step="0.01"
          required
          defaultValue={sugestao > 0 ? sugestao.toFixed(2) : ""}
        />
      </div>
      <BotaoAcao pendingLabel="Registrando…">Registrar pagamento</BotaoAcao>
    </form>
  );
}
