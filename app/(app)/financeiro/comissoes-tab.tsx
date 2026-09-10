import { BadgeDollarSign, HandCoins, Wallet } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import { ComissoesView } from "@/components/financeiro/comissoes-view";
import { formatBRL } from "@/lib/format";
import { somaComissoes, type ComissaoProfissional } from "@/lib/comissao";
import { resolverPeriodo } from "@/lib/relatorio";
import { createClient } from "@/lib/supabase/server";

export async function ComissoesTab({
  periodo,
  de,
  ate,
}: {
  periodo?: string;
  de?: string;
  ate?: string;
}) {
  // Sem período escolhido: mostra tudo, pra não esconder comissão pendente antiga.
  const p = resolverPeriodo(periodo ?? "tudo", de, ate);

  const supabase = await createClient();
  const { data } = await supabase.rpc("comissoes_periodo", {
    p_de: p.de,
    p_ate: p.ate,
    p_professional_id: null,
  });

  const linhas = (data as ComissaoProfissional[] | null) ?? [];
  const soma = somaComissoes(linhas);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-4">
        <StatCard
          icon={HandCoins}
          label="A pagar"
          value={formatBRL(soma.a_pagar)}
          sub={p.label}
        />
        <StatCard
          icon={Wallet}
          label="Já pago no período"
          value={formatBRL(soma.pago)}
        />
        <StatCard
          icon={BadgeDollarSign}
          label="Comissão total"
          value={formatBRL(soma.total)}
        />
      </div>

      <ComissoesView
        linhas={linhas}
        periodoAtual={p.key}
        deAtual={p.de}
        ateAtual={p.ate}
      />
    </div>
  );
}
