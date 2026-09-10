"use client";

import { Card } from "@/components/ui/card";
import { GraficoLinhaValor } from "@/components/financeiro/line-chart";
import { FiltroPeriodo } from "@/components/financeiro/filtro-periodo";
import { formatBRL } from "@/lib/format";

type ComissaoDesempenho = {
  recebe: boolean;
  percentual: number;
  total: number;
  pago: number;
  a_pagar: number;
  num_clientes: number;
  por_dia: { dia: string; valor: number }[];
};

export function DesempenhoView({
  comissao,
  porServico,
  periodoAtual,
  deAtual,
  ateAtual,
}: {
  comissao: ComissaoDesempenho;
  porServico: { nome: string; qtd: number }[];
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
          path="/meu-desempenho"
          baseParams={{}}
        />
      </div>

      {/* Comissão ao longo do período */}
      <Card className="mb-4 p-5">
        <div className="mb-3 text-[13px] font-semibold text-text">
          Comissão ao longo do período
        </div>
        <GraficoLinhaValor
          dados={comissao.por_dia}
          label="Comissão"
          vazioMsg="Sem comissão no período."
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-border px-5 py-3.5 text-[13px] font-semibold text-text">
            Serviços realizados
          </div>
          {porServico.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-text-faint">Nada no período.</p>
          ) : (
            <ul>
              {porServico.map((s) => (
                <li
                  key={s.nome}
                  className="flex items-center justify-between border-b border-border px-5 py-3 last:border-b-0"
                >
                  <span className="text-[13px] text-text-soft">{s.nome}</span>
                  <span className="font-mono text-[13px] font-semibold text-text">
                    {s.qtd}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-3.5 text-[13px] font-semibold text-text">
            Comissão no período
          </div>
          <div className="px-5 py-4">
            {comissao.recebe ? (
              <>
                <div className="font-mono text-[22px] font-semibold text-text">
                  {formatBRL(comissao.total)}
                </div>
                <p className="mt-1 text-[12.5px] text-text-soft">
                  {formatBRL(comissao.pago)} paga · {formatBRL(comissao.a_pagar)} a
                  pagar
                </p>
                <p className="mt-0.5 text-[12px] text-text-faint">
                  {comissao.percentual}% sobre serviços atendidos
                </p>
              </>
            ) : (
              <p className="text-[13px] text-text-faint">
                Você não recebe comissão.
              </p>
            )}
            <p className="mt-2 text-[12.5px] font-semibold text-text-soft">
              {comissao.num_clientes}{" "}
              {comissao.num_clientes === 1
                ? "cliente atendido"
                : "clientes atendidos"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
