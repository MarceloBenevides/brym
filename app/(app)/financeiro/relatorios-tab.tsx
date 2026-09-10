import { BarChart3, Receipt, TrendingUp } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import { RelatorioView } from "@/components/financeiro/relatorio-view";
import { formatBRL } from "@/lib/format";
import { RELATORIO_VAZIO, resolverPeriodo, type RelatorioVendas } from "@/lib/relatorio";
import { createClient } from "@/lib/supabase/server";
import type { ServiceRow } from "@/types/database";

export async function RelatoriosTab({
  periodo,
  de,
  ate,
  servico,
}: {
  periodo?: string;
  de?: string;
  ate?: string;
  servico?: string;
}) {
  const p = resolverPeriodo(periodo, de, ate);
  const servicoId = servico && /^[0-9a-f-]{36}$/i.test(servico) ? servico : null;

  const supabase = await createClient();
  const [{ data: rpc }, { data: servicos }] = await Promise.all([
    supabase.rpc("relatorio_vendas", {
      p_de: p.de,
      p_ate: p.ate,
      p_service_id: servicoId,
      p_professional_id: null,
    }),
    supabase
      .from("services")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome")
      .returns<Pick<ServiceRow, "id" | "nome">[]>(),
  ]);

  const dados = (rpc as RelatorioVendas | null) ?? RELATORIO_VAZIO;

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-4">
        <StatCard
          icon={TrendingUp}
          label="Faturado no período"
          value={formatBRL(dados.total)}
          sub={p.label}
        />
        <StatCard
          icon={Receipt}
          label="Comandas fechadas"
          value={String(dados.num_comandas)}
        />
        <StatCard
          icon={BarChart3}
          label="Ticket médio"
          value={formatBRL(dados.ticket_medio)}
        />
      </div>

      <RelatorioView
        dados={dados}
        servicos={servicos ?? []}
        periodoAtual={p.key}
        deAtual={p.de}
        ateAtual={p.ate}
        servicoAtual={servicoId ?? ""}
      />
    </div>
  );
}
