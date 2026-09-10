"use client";

import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { FiltroPeriodo } from "@/components/financeiro/filtro-periodo";
import { marcarComissoesPagasAction } from "@/app/(app)/financeiro/comissao-actions";
import { formatBRL } from "@/lib/format";
import type { ComissaoProfissional } from "@/lib/comissao";

function dataBR(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function MarcarPagaButton({ valor }: { valor: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-ink px-4 py-2 text-[13px] font-semibold text-white transition-opacity disabled:opacity-60"
    >
      {pending ? "Dando baixa…" : `Marcar como paga (${formatBRL(valor)})`}
    </button>
  );
}

export function ComissoesView({
  linhas,
  periodoAtual,
  deAtual,
  ateAtual,
}: {
  linhas: ComissaoProfissional[];
  periodoAtual: string;
  deAtual: string;
  ateAtual: string;
}) {
  return (
    <div>
      <div className="mb-5">
        <FiltroPeriodo
          periodoAtual={periodoAtual}
          deAtual={deAtual}
          ateAtual={ateAtual}
          path="/financeiro"
          baseParams={{ aba: "comissoes" }}
        />
      </div>

      {linhas.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <p className="text-[13.5px] text-text-soft">
            Nenhuma comissão no período. Só comandas fechadas de profissionais que
            recebem comissão entram aqui.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {linhas.map((l) => (
            <Card key={l.professional_id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[14px] font-semibold text-text">
                    {l.nome}
                  </div>
                  <div className="text-[12px] text-text-faint">
                    {l.percentual}% · faturamento em serviços{" "}
                    {formatBRL(l.faturamento)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[18px] font-semibold text-text">
                    {formatBRL(l.total)}
                  </div>
                  <div className="text-[12px] text-text-soft">
                    {formatBRL(l.pago)} paga · {formatBRL(l.a_pagar)} a pagar
                  </div>
                </div>
              </div>

              <details className="mt-3 border-t border-border pt-3">
                <summary className="cursor-pointer text-[12.5px] font-semibold text-text-soft">
                  {l.comandas.length} comanda(s)
                </summary>
                <ul className="mt-2">
                  {l.comandas.map((c) => (
                    <li
                      key={c.comissao_id}
                      className="flex items-center justify-between border-b border-border py-2 text-[13px] last:border-b-0"
                    >
                      <span className="text-text-soft">
                        {dataBR(c.fechada_em)}
                        {c.cliente_nome ? ` · ${c.cliente_nome}` : ""}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-text">
                          {formatBRL(c.valor)}
                        </span>
                        <Pill tone={c.status === "pago" ? "forest" : "gold"}>
                          {c.status === "pago" ? "paga" : "a pagar"}
                        </Pill>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>

              {l.a_pagar > 0 && (
                <form
                  action={marcarComissoesPagasAction}
                  className="mt-4 flex justify-end"
                >
                  <input
                    type="hidden"
                    name="professional_id"
                    value={l.professional_id}
                  />
                  <input type="hidden" name="de" value={deAtual} />
                  <input type="hidden" name="ate" value={ateAtual} />
                  <MarcarPagaButton valor={l.a_pagar} />
                </form>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
