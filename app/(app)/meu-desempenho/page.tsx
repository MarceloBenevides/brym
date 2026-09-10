import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeDollarSign, CalendarCheck, Scissors } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DesempenhoView } from "@/components/meu-desempenho/desempenho-view";
import { requireApp } from "@/lib/guards";
import { formatBRL } from "@/lib/format";
import { RELATORIO_VAZIO, resolverPeriodo, type RelatorioVendas } from "@/lib/relatorio";
import type { ComissaoProfissional } from "@/lib/comissao";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meu desempenho" };

export default async function MeuDesempenhoPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  const ctx = await requireApp();
  if (ctx.isOwner || !ctx.professionalId) redirect("/agenda");

  const sp = await searchParams;
  const p = resolverPeriodo(sp.periodo, sp.de, sp.ate);

  const supabase = await createClient();
  const [{ data: rpc }, { data: comissoes }, { data: prof }] = await Promise.all([
    supabase.rpc("relatorio_vendas", {
      p_de: p.de,
      p_ate: p.ate,
      p_service_id: null,
      p_professional_id: ctx.professionalId,
    }),
    supabase.rpc("comissoes_periodo", {
      p_de: p.de,
      p_ate: p.ate,
      p_professional_id: ctx.professionalId,
    }),
    supabase
      .from("professionals")
      .select("recebe_comissao, percentual_comissao")
      .eq("id", ctx.professionalId)
      .maybeSingle<{ recebe_comissao: boolean; percentual_comissao: number }>(),
  ]);

  const rel = (rpc as RelatorioVendas | null) ?? RELATORIO_VAZIO;
  const linha = ((comissoes as ComissaoProfissional[] | null) ?? [])[0];
  const recebe = prof?.recebe_comissao ?? false;

  const comissao = {
    recebe,
    percentual: linha?.percentual ?? prof?.percentual_comissao ?? 0,
    total: linha?.total ?? 0,
    pago: linha?.pago ?? 0,
    a_pagar: linha?.a_pagar ?? 0,
    num_clientes: rel.num_clientes,
    por_dia: linha?.por_dia ?? [],
  };

  return (
    <div>
      <PageHeader title="Meu desempenho" subtitle={p.label} />

      <div className="mb-6 flex flex-wrap gap-4">
        <StatCard
          icon={Scissors}
          label="Serviços realizados"
          value={String(rel.num_servicos)}
          sub={p.label}
        />
        <StatCard
          icon={CalendarCheck}
          label="Atendimentos"
          value={String(rel.num_comandas)}
        />
        <StatCard
          icon={BadgeDollarSign}
          label="Comissão no período"
          value={recebe ? formatBRL(comissao.total) : "—"}
          sub={
            recebe ? `${formatBRL(comissao.a_pagar)} a pagar` : "não recebe comissão"
          }
        />
      </div>

      <DesempenhoView
        comissao={comissao}
        porServico={rel.por_servico}
        periodoAtual={p.key}
        deAtual={p.de}
        ateAtual={p.ate}
      />
    </div>
  );
}
