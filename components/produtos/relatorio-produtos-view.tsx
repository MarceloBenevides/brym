import { Coins, TrendingUp } from "lucide-react";

import { FiltroPeriodo } from "@/components/financeiro/filtro-periodo";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatBRL } from "@/lib/format";
import type { RelatorioProdutos } from "@/lib/produto";

export function RelatorioProdutosView({
  dados,
  periodoAtual,
  deAtual,
  ateAtual,
}: {
  dados: RelatorioProdutos;
  periodoAtual: string;
  deAtual: string;
  ateAtual: string;
}) {
  const temVendaSemCusto = dados.itens.some((i) => !i.custo_registrado);

  return (
    <div>
      <div className="mb-5">
        <FiltroPeriodo
          periodoAtual={periodoAtual}
          deAtual={deAtual}
          ateAtual={ateAtual}
          path="/produtos"
          baseParams={{ aba: "relatorio" }}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <StatCard
          icon={TrendingUp}
          label="Faturamento em produtos"
          value={formatBRL(dados.total_faturamento)}
        />
        <StatCard
          icon={Coins}
          label="Margem de lucro"
          value={formatBRL(dados.total_margem)}
          sub="faturamento − custo de compra"
        />
      </div>

      {dados.itens.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <p className="text-[13.5px] text-text-soft">
            Nenhuma venda de produto em comanda fechada nesse período.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="grid grid-cols-[1fr_4rem_7rem_7rem_7rem] gap-3 border-b border-border px-5 py-3 text-[11px] font-semibold tracking-wide text-text-faint uppercase">
              <span>Produto</span>
              <span className="text-right">Qtd</span>
              <span className="text-right">Faturamento</span>
              <span className="text-right">Custo</span>
              <span className="text-right">Margem</span>
            </div>
            {dados.itens.map((i, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_4rem_7rem_7rem_7rem] gap-3 px-5 py-3 text-[13px]"
                style={{
                  borderBottom:
                    idx < dados.itens.length - 1
                      ? "1px solid var(--color-border)"
                      : undefined,
                }}
              >
                <span className="truncate text-text">{i.nome}</span>
                <span className="text-right font-mono text-text-soft">{i.qtd}</span>
                <span className="text-right font-mono text-text">
                  {formatBRL(i.faturamento)}
                </span>
                <span className="text-right font-mono text-text-soft">
                  {i.custo_registrado && i.custo_total != null ? (
                    formatBRL(i.custo_total)
                  ) : (
                    <span className="text-text-faint">—</span>
                  )}
                </span>
                <span className="text-right font-mono font-semibold text-text">
                  {i.custo_registrado && i.margem != null ? (
                    formatBRL(i.margem)
                  ) : (
                    <span className="font-normal text-text-faint">—</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {temVendaSemCusto && (
        <p className="mt-3 text-[11.5px] text-text-faint">
          “—” na margem: esse produto teve vendas antes do campo de custo existir.
          As vendas novas já entram no cálculo.
        </p>
      )}
    </div>
  );
}
