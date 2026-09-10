import { BarChart3, TrendingDown, Wallet } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import { formatBRL } from "@/lib/format";
import { intervaloDoMes } from "@/lib/mes";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseRow } from "@/types/database";
import { ExpensesManager } from "./expenses-manager";

export async function DespesasTab({ mes }: { mes: string }) {
  const { inicio, fim } = intervaloDoMes(mes);
  const supabase = await createClient();
  const { data: despesas } = await supabase
    .from("expenses")
    .select("*")
    .gte("data", inicio)
    .lte("data", fim)
    .order("data", { ascending: false })
    .returns<ExpenseRow[]>();

  const lista = despesas ?? [];
  const total = lista.reduce((s, d) => s + Number(d.valor), 0);
  const pago = lista
    .filter((d) => d.status === "pago")
    .reduce((s, d) => s + Number(d.valor), 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-4">
        <StatCard
          icon={BarChart3}
          label="Total de despesas no mês"
          value={formatBRL(total)}
          sub={`${lista.length} lançamento(s)`}
        />
        <StatCard icon={Wallet} label="Pago" value={formatBRL(pago)} />
        <StatCard
          icon={TrendingDown}
          label="Pendente"
          value={formatBRL(total - pago)}
        />
      </div>
      <ExpensesManager despesas={lista} mes={mes} />
    </div>
  );
}
