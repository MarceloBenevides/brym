import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Tabs } from "@/components/ui/tabs";
import { requireSection } from "@/lib/guards";
import { mesAtualISO, mesPorExtenso, normalizarMes, somarMeses } from "@/lib/mes";
import { capacidadeLiberadaPeloPlano } from "@/lib/planos";
import { resolverPeriodo } from "@/lib/relatorio";
import { ComandasTab } from "./comandas-tab";
import { DespesasTab } from "./despesas-tab";
import { RelatoriosTab } from "./relatorios-tab";
import { ComissoesTab } from "./comissoes-tab";

export const metadata: Metadata = { title: "Financeiro" };

// Navegação de mês é via <Link> mudando só a query string; sem isto o roteador
// otimista do Next 16 congela o subtítulo do cabeçalho no mês anterior.
export const dynamic = "force-dynamic";

type Aba = "comandas" | "despesas" | "relatorios" | "comissoes";

const ABAS_PERIODO: Aba[] = ["relatorios", "comissoes"];

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{
    aba?: string;
    mes?: string;
    periodo?: string;
    de?: string;
    ate?: string;
    servico?: string;
  }>;
}) {
  const ctx = await requireSection("financeiro");
  const sp = await searchParams;
  const abaAtiva: Aba =
    sp.aba === "despesas"
      ? "despesas"
      : sp.aba === "relatorios"
        ? "relatorios"
        : sp.aba === "comissoes"
          ? "comissoes"
          : "comandas";
  // Comandas é livre desde o Essencial; as outras 3 abas exigem Profissional+.
  const avancadoLiberado = capacidadeLiberadaPeloPlano(
    "financeiro_avancado",
    ctx.tenant.plano,
  );
  if (abaAtiva !== "comandas" && !avancadoLiberado) {
    redirect("/assinar?erro=plano");
  }
  const mes = normalizarMes(sp.mes);
  const comPeriodo = ABAS_PERIODO.includes(abaAtiva);

  const qMes = (a: string, m: string) =>
    a === "comandas" ? `/financeiro?mes=${m}` : `/financeiro?aba=${a}&mes=${m}`;

  const periodoDefault = abaAtiva === "comissoes" ? "tudo" : undefined;
  const subtitulo = comPeriodo
    ? resolverPeriodo(sp.periodo ?? periodoDefault, sp.de, sp.ate).label
    : mesPorExtenso(mes);

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle={subtitulo}
        action={
          comPeriodo ? undefined : (
            <div className="flex items-center gap-2">
              <Link
                href={qMes(abaAtiva, somarMeses(mes, -1))}
                className="rounded-lg border border-border p-2 text-text-soft"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={15} />
              </Link>
              <Link
                href={qMes(abaAtiva, mesAtualISO())}
                className="rounded-lg border border-border px-3 py-2 text-[13px] font-semibold text-text-soft"
              >
                Mês atual
              </Link>
              <Link
                href={qMes(abaAtiva, somarMeses(mes, 1))}
                className="rounded-lg border border-border p-2 text-text-soft"
                aria-label="Próximo mês"
              >
                <ChevronRight size={15} />
              </Link>
            </div>
          )
        }
      />

      <Tabs
        active={abaAtiva}
        items={[
          { key: "comandas", label: "Comandas", href: qMes("comandas", mes) },
          ...(avancadoLiberado
            ? [
                { key: "despesas", label: "Despesas", href: qMes("despesas", mes) },
                { key: "relatorios", label: "Relatórios", href: "/financeiro?aba=relatorios" },
                { key: "comissoes", label: "Comissões", href: "/financeiro?aba=comissoes" },
              ]
            : []),
        ]}
      />

      {abaAtiva === "comandas" && <ComandasTab mes={mes} />}
      {abaAtiva === "despesas" && <DespesasTab mes={mes} />}
      {abaAtiva === "relatorios" && (
        <RelatoriosTab
          periodo={sp.periodo}
          de={sp.de}
          ate={sp.ate}
          servico={sp.servico}
        />
      )}
      {abaAtiva === "comissoes" && (
        <ComissoesTab periodo={sp.periodo} de={sp.de} ate={sp.ate} />
      )}
    </div>
  );
}
