import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { PLANOS, planoLabel } from "@/lib/planos";
import { segmentoLabel } from "@/lib/segments";
import {
  STATUS_ASSINATURA_LABEL,
  STATUS_ASSINATURA_TOM,
  diasRestantesTrial,
  type PlataformaNegocio,
} from "@/lib/plataforma";
import { NegocioAcoesMenu } from "./negocio-acoes-menu";

function dataBR(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function trialInfo(n: PlataformaNegocio): string | null {
  if (n.status_assinatura !== "trial") return null;
  const dias = diasRestantesTrial(n.trial_expira_em);
  if (dias < 0) return `expirou há ${Math.abs(dias)}d`;
  if (dias === 0) return "expira hoje";
  return `${dias}d restantes`;
}

export function NegociosTabela({ negocios }: { negocios: PlataformaNegocio[] }) {
  if (negocios.length === 0) {
    return (
      <Card className="px-6 py-14 text-center">
        <p className="text-[13.5px] text-text-soft">
          Nenhum negócio encontrado com esses filtros.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[1080px] text-[13px]">
        <thead>
          <tr className="border-b border-border text-left text-[11px] font-semibold tracking-wide text-text-faint uppercase">
            <th className="px-5 py-3">Negócio</th>
            <th className="px-5 py-3">Dono</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Assinatura</th>
            <th className="px-5 py-3">Criado</th>
            <th className="px-5 py-3 text-right">Clientes</th>
            <th className="px-5 py-3 text-right">Agendamentos</th>
            <th className="px-5 py-3 text-right">Comandas</th>
            <th className="px-5 py-3">Últ. atividade</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {negocios.map((n) => {
            const trial = trialInfo(n);
            const emAtraso = n.assinatura_em_atraso;
            return (
              <tr
                key={n.id}
                className={
                  emAtraso
                    ? "border-b border-l-2 border-border border-l-garnet bg-garnet/5 align-top"
                    : "border-b border-border align-top last:border-b-0"
                }
              >
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-text">{n.nome}</div>
                  <div className="text-[11.5px] text-text-faint">
                    {segmentoLabel(n.segmento)}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="text-text-soft">{n.dono_nome ?? "—"}</div>
                  <div className="text-[11.5px] text-text-faint">
                    {n.dono_email ?? "—"}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <Pill tone={STATUS_ASSINATURA_TOM[n.status_assinatura]}>
                    {STATUS_ASSINATURA_LABEL[n.status_assinatura]}
                  </Pill>
                  {trial && (
                    <div className="mt-1 text-[11px] text-text-faint">{trial}</div>
                  )}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-text-soft">
                  {n.plano || n.tem_gateway ? (
                    <>
                      <div>
                        {n.plano ? planoLabel(n.plano) : "—"}
                        {n.gateway && (
                          <span className="ml-1 text-[11px] text-text-faint">
                            · {n.gateway === "asaas" ? "Asaas" : "Stripe"}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        {emAtraso ? (
                          <Pill tone="garnet">Em atraso</Pill>
                        ) : n.assinatura_ativa_ate ? (
                          <span className="text-[11px] text-text-faint">
                            até {dataBR(n.assinatura_ativa_ate)}
                          </span>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <span className="text-text-faint">—</span>
                  )}
                  {n.plano_manual && (
                    <div className="mt-1">
                      <Pill tone="gold">
                        + liberado: {PLANOS[n.plano_manual].nome}
                      </Pill>
                    </div>
                  )}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-text-soft">
                  {dataBR(n.criado_em)}
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-text">
                  {n.n_clientes}
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-text">
                  {n.n_agendamentos}
                  <span className="block text-[11px] font-sans text-text-faint">
                    {n.n_agendamentos_30d} em 30d
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-text">
                  {n.n_comandas}
                  <span className="block text-[11px] font-sans text-text-faint">
                    {n.n_comandas_30d} em 30d
                  </span>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-text-soft">
                  {dataBR(n.ultimo_agendamento)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <NegocioAcoesMenu
                    id={n.id}
                    status={n.status_assinatura}
                    planoManual={n.plano_manual}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
