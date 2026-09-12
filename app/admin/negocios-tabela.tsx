import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { planoLabel } from "@/lib/planos";
import { segmentoLabel } from "@/lib/segments";
import {
  STATUS_ASSINATURA_LABEL,
  STATUS_ASSINATURA_TOM,
  diasRestantesTrial,
  type PlataformaNegocio,
} from "@/lib/plataforma";
import type { StatusAssinatura } from "@/types/database";
import {
  ativarManualAction,
  estenderTrialAction,
  setStatusNegocioAction,
} from "./actions";

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

function StatusAcoes({
  id,
  status,
}: {
  id: string;
  status: StatusAssinatura;
}) {
  const alvos: { label: string; status: StatusAssinatura }[] = [];
  if (status !== "ativo") alvos.push({ label: "Ativar", status: "ativo" });
  if (status === "trial" || status === "ativo")
    alvos.push({ label: "Suspender", status: "suspenso" });
  if (status !== "cancelado")
    alvos.push({ label: "Cancelar", status: "cancelado" });

  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {alvos.map((a) => (
        <form key={a.status} action={setStatusNegocioAction}>
          <input type="hidden" name="tenant_id" value={id} />
          <input type="hidden" name="status" value={a.status} />
          <ActionButton className="text-[11px] font-semibold text-text-faint hover:text-gold-deep">
            {a.label}
          </ActionButton>
        </form>
      ))}
    </div>
  );
}

function EstenderTrial({ id, status }: { id: string; status: StatusAssinatura }) {
  if (status !== "trial") return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text-faint">
      <span>trial:</span>
      {[7, 15, 30].map((dias) => (
        <form key={dias} action={estenderTrialAction}>
          <input type="hidden" name="tenant_id" value={id} />
          <input type="hidden" name="dias" value={dias} />
          <ActionButton className="font-semibold text-text-faint hover:text-gold-deep">
            +{dias}d
          </ActionButton>
        </form>
      ))}
    </div>
  );
}

function AtivarManual({ id }: { id: string }) {
  const opcoes = [
    { meses: 3, label: "3m" },
    { meses: 6, label: "6m" },
    { meses: 12, label: "1a" },
  ];
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text-faint">
      <span>ativar:</span>
      {opcoes.map((o) => (
        <form key={o.meses} action={ativarManualAction}>
          <input type="hidden" name="tenant_id" value={id} />
          <input type="hidden" name="meses" value={o.meses} />
          <ActionButton className="font-semibold text-text-faint hover:text-gold-deep">
            {o.label}
          </ActionButton>
        </form>
      ))}
    </div>
  );
}

export function NegociosTabela({ negocios }: { negocios: PlataformaNegocio[] }) {
  if (negocios.length === 0) {
    return (
      <Card className="px-6 py-14 text-center">
        <p className="text-[13.5px] text-text-soft">
          Nenhum negócio cadastrado ainda.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-[13px]">
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
          </tr>
        </thead>
        <tbody>
          {negocios.map((n) => {
            const trial = trialInfo(n);
            return (
              <tr
                key={n.id}
                className="border-b border-border last:border-b-0 align-top"
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
                  <StatusAcoes id={n.id} status={n.status_assinatura} />
                  <EstenderTrial id={n.id} status={n.status_assinatura} />
                  <AtivarManual id={n.id} />
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
                      <div className="text-[11px] text-text-faint">
                        {n.assinatura_em_atraso
                          ? "em atraso"
                          : n.assinatura_ativa_ate
                            ? `até ${dataBR(n.assinatura_ativa_ate)}`
                            : ""}
                      </div>
                    </>
                  ) : (
                    <span className="text-text-faint">—</span>
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
