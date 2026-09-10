import Link from "next/link";
import { ChevronRight, Plus, Receipt, TrendingUp } from "lucide-react";

import { abrirVendaAvulsaAction } from "@/app/(app)/financeiro/comanda-actions";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { StatCard } from "@/components/ui/stat-card";
import { totalItens, totalPago } from "@/lib/comanda";
import { formatBRL } from "@/lib/format";
import { intervaloDoMes, somarMeses } from "@/lib/mes";
import { createClient } from "@/lib/supabase/server";

function dataBR(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function ComandasTab({ mes }: { mes: string }) {
  const { inicio } = intervaloDoMes(mes);
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("comandas")
    .select(
      "id, status, aberta_em, appointment_id, cliente:clients(nome), profissional:professionals(nome), itens:comanda_items(quantidade, valor_unitario), pagamentos:payments(valor)",
    )
    .gte("aberta_em", inicio)
    .lt("aberta_em", `${somarMeses(mes, 1)}-01`)
    .order("aberta_em", { ascending: false });

  type Row = {
    id: string;
    status: "aberta" | "fechada";
    aberta_em: string;
    appointment_id: string | null;
    cliente: { nome: string } | null;
    profissional: { nome: string } | null;
    itens: { quantidade: number; valor_unitario: number }[];
    pagamentos: { valor: number }[];
  };
  const comandas = (rows ?? []) as unknown as Row[];

  const abertas = comandas.filter((c) => c.status === "aberta");
  const faturado = comandas
    .filter((c) => c.status === "fechada")
    .reduce((s, c) => s + totalItens(c.itens), 0);

  return (
    <div>
      <div className="mb-5">
        <form action={abrirVendaAvulsaAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={15} /> Nova venda
          </button>
        </form>
        <p className="mt-1.5 text-[11.5px] text-text-faint">
          Venda de balcão (só produtos), sem agendamento. Atendimentos com hora
          marcada continuam abrindo a comanda pela Agenda.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <StatCard
          icon={Receipt}
          label="Comandas abertas"
          value={String(abertas.length)}
          sub={`${comandas.length} no mês`}
        />
        <StatCard
          icon={TrendingUp}
          label="Faturado no mês"
          value={formatBRL(faturado)}
          sub={`${comandas.length - abertas.length} fechada(s)`}
        />
      </div>

      {comandas.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <p className="text-[13.5px] text-text-soft">
            Nenhuma comanda neste mês. Abra uma a partir de um agendamento na
            Agenda.
          </p>
        </Card>
      ) : (
        <Card>
          {comandas.map((c, i) => {
            const total = totalItens(c.itens);
            const pago = totalPago(c.pagamentos);
            return (
              <Link
                key={c.id}
                href={`/financeiro/comandas/${c.id}`}
                className="flex items-center justify-between px-5 py-4"
                style={{
                  borderBottom:
                    i < comandas.length - 1
                      ? "1px solid var(--color-border)"
                      : undefined,
                }}
              >
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-text">
                    {c.cliente?.nome ??
                      (c.appointment_id === null ? "Venda avulsa" : "Sem cliente")}
                  </div>
                  <div className="text-[12px] text-text-faint">
                    {dataBR(c.aberta_em)}
                    {c.profissional?.nome ? ` · ${c.profissional.nome}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[13.5px] font-semibold text-text">
                    {formatBRL(total)}
                  </span>
                  <Pill tone={c.status === "aberta" ? "gold" : "forest"}>
                    {c.status === "aberta"
                      ? pago >= total && total > 0
                        ? "a fechar"
                        : "aberta"
                      : "fechada"}
                  </Pill>
                  <ChevronRight size={16} className="text-text-faint" />
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
