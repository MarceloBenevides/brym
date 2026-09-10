"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { GraficoLinhaValor } from "@/components/financeiro/line-chart";
import { FiltroPeriodo } from "@/components/financeiro/filtro-periodo";
import { formaLabel } from "@/lib/comanda";
import { formatBRL } from "@/lib/format";
import { type RelatorioVendas } from "@/lib/relatorio";

type ServicoMin = { id: string; nome: string };

export function RelatorioView({
  dados,
  servicos,
  periodoAtual,
  deAtual,
  ateAtual,
  servicoAtual,
  path = "/financeiro",
  baseParams = { aba: "relatorios" },
}: {
  dados: RelatorioVendas;
  servicos: ServicoMin[];
  periodoAtual: string;
  deAtual: string;
  ateAtual: string;
  servicoAtual: string;
  path?: string;
  baseParams?: Record<string, string>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const trocarServico = (id: string) => {
    const sp = new URLSearchParams({ ...baseParams, periodo: periodoAtual });
    if (periodoAtual === "custom") {
      sp.set("de", deAtual);
      sp.set("ate", ateAtual);
    }
    if (id) sp.set("servico", id);
    startTransition(() => router.replace(`${path}?${sp.toString()}`));
  };

  return (
    <div>
      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <FiltroPeriodo
          periodoAtual={periodoAtual}
          deAtual={deAtual}
          ateAtual={ateAtual}
          path={path}
          baseParams={baseParams}
          extraParams={servicoAtual ? { servico: servicoAtual } : undefined}
        />

        <select
          value={servicoAtual}
          onChange={(e) => trocarServico(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-1.5 text-[12.5px] text-text outline-none focus:border-gold"
        >
          <option value="">Todos os serviços</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Gráfico */}
      <Card className="mb-4 p-5">
        <div className="mb-3 text-[13px] font-semibold text-text">
          Faturamento no período
        </div>
        <GraficoLinhaValor dados={dados.por_dia} />
      </Card>

      {/* Quebras */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QuebraItens titulo="Vendas por serviço" itens={dados.por_servico} />
        <QuebraItens titulo="Vendas por produto" itens={dados.por_produto} />

        <Card>
          <div className="border-b border-border px-5 py-3.5 text-[13px] font-semibold text-text">
            Por forma de pagamento
          </div>
          {servicoAtual ? (
            <p className="px-5 py-6 text-[13px] text-text-faint">
              O detalhe por pagamento não se aplica ao filtrar por serviço.
            </p>
          ) : dados.por_pagamento.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-text-faint">Nada no período.</p>
          ) : (
            <ul>
              {dados.por_pagamento.map((p) => (
                <li
                  key={p.forma}
                  className="flex items-center justify-between border-b border-border px-5 py-3 last:border-b-0"
                >
                  <span className="text-[13px] text-text-soft">
                    {formaLabel(p.forma)}
                  </span>
                  <span className="font-mono text-[13px] font-semibold text-text">
                    {formatBRL(p.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function QuebraItens({
  titulo,
  itens,
}: {
  titulo: string;
  itens: { nome: string; qtd: number; valor: number }[];
}) {
  return (
    <Card>
      <div className="border-b border-border px-5 py-3.5 text-[13px] font-semibold text-text">
        {titulo}
      </div>
      {itens.length === 0 ? (
        <p className="px-5 py-6 text-[13px] text-text-faint">Nada no período.</p>
      ) : (
        <ul>
          {itens.map((s) => (
            <li
              key={s.nome}
              className="flex items-center justify-between border-b border-border px-5 py-3 last:border-b-0"
            >
              <span className="text-[13px] text-text-soft">
                {s.nome} <span className="text-text-faint">· {s.qtd}×</span>
              </span>
              <span className="font-mono text-[13px] font-semibold text-text">
                {formatBRL(s.valor)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
