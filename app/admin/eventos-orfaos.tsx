import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import type {
  PlataformaEventoOrfao,
  PlataformaNegocio,
} from "@/lib/plataforma";
import { vincularPagamentoAction } from "./actions";

function dataBR(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Stripe grava o valor em centavos; Asaas em reais. */
function formatarValor(gateway: string, valor: string | null): string {
  if (!valor) return "valor ?";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "valor ?";
  const reais = gateway === "asaas" ? n : n / 100;
  return `R$ ${reais.toFixed(2)}`;
}

/**
 * Pagamentos que chegaram do Stripe mas não deram pra amarrar num negócio
 * (link aberto sem `client_reference_id`, e-mail do dono não bateu). O admin
 * escolhe o negócio e o `stripe_vincular_evento` reaplica a ativação.
 */
export function EventosOrfaos({
  eventos,
  negocios,
}: {
  eventos: PlataformaEventoOrfao[];
  negocios: PlataformaNegocio[];
}) {
  if (eventos.length === 0) return null;

  return (
    <Card className="mb-6 border-garnet/40 p-5">
      <h2 className="font-display text-lg font-semibold text-text">
        Pagamentos para vincular ({eventos.length})
      </h2>
      <p className="mt-1 mb-4 text-[12.5px] text-text-soft">
        Um pagamento chegou do Stripe sem identificar o negócio. Confira o e-mail
        e ligue ao negócio certo.
      </p>
      <div className="space-y-3">
        {eventos.map((e) => (
          <form
            key={e.id}
            action={vincularPagamentoAction}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
          >
            <input type="hidden" name="event_id" value={e.id} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-text">
                {e.email ?? "sem e-mail"}
              </div>
              <div className="text-[11.5px] text-text-faint">
                {e.gateway === "asaas" ? "Asaas" : "Stripe"} · {e.plano ?? "plano ?"}{" "}
                · {formatarValor(e.gateway, e.valor)} · {dataBR(e.recebido_em)}
              </div>
            </div>
            <select
              name="tenant_id"
              defaultValue=""
              required
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-gold"
            >
              <option value="" disabled>
                Escolher negócio…
              </option>
              {negocios.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nome}
                  {n.dono_email ? ` · ${n.dono_email}` : ""}
                </option>
              ))}
            </select>
            <ActionButton
              pendingLabel="Vinculando…"
              className="rounded-lg bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-white"
            >
              Vincular
            </ActionButton>
          </form>
        ))}
      </div>
    </Card>
  );
}
