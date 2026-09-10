import Link from "next/link";

import { dataBR, diasAte, estadoAssinatura } from "@/lib/assinatura";
import type { TenantRow } from "@/types/database";

/**
 * Faixa de aviso no topo do app, só pro dono:
 *  - pagamento em atraso (carência de 7 dias correndo)
 *  - teste grátis acabando (<= 5 dias)
 * Nos outros casos não renderiza nada. Quem está de fato bloqueado nem chega
 * aqui — o gate de `requireApp` já mandou pra /assinar ou /conta-suspensa.
 */
export function AssinaturaBanner({
  tenant,
  isOwner,
}: {
  tenant: TenantRow;
  isOwner: boolean;
}) {
  if (!isOwner) return null;
  const estado = estadoAssinatura(tenant);

  if (estado === "em_atraso") {
    return (
      <Faixa tom="atencao">
        <span>
          A última cobrança falhou. Regularize até{" "}
          <strong>{dataBR(tenant.assinatura_ativa_ate)}</strong> para não perder
          o acesso.
        </span>
        <form action="/api/stripe/portal" method="post">
          <button type="submit" className="font-semibold underline">
            Atualizar pagamento
          </button>
        </form>
      </Faixa>
    );
  }

  if (estado === "trial") {
    const dias = diasAte(tenant.trial_expira_em);
    if (dias > 5) return null;
    return (
      <Faixa tom="aviso">
        <span>
          {dias <= 1
            ? "Seu teste grátis termina hoje."
            : `Seu teste grátis termina em ${dias} dias.`}
        </span>
        <Link href="/assinar" className="font-semibold underline">
          Ver planos
        </Link>
      </Faixa>
    );
  }

  return null;
}

function Faixa({
  tom,
  children,
}: {
  tom: "aviso" | "atencao";
  children: React.ReactNode;
}) {
  const cor =
    tom === "atencao"
      ? "border-garnet/30 bg-garnet/10 text-garnet"
      : "border-gold/40 bg-gold/10 text-text-soft";
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b px-4 py-2 text-center text-[12.5px] ${cor}`}
    >
      {children}
    </div>
  );
}
