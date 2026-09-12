import type { TenantRow } from "@/types/database";

/**
 * Régua de acesso do negócio. Puro — sem I/O — pra ser testável isolada e
 * usável tanto no servidor (`requireApp`) quanto em componentes.
 *
 * `status_assinatura` (trial/ativo/suspenso/cancelado) é o override manual do
 * `/admin`. O acesso pago de verdade é governado por `assinatura_ativa_ate`.
 */

export type EstadoAssinatura =
  | "trial" // teste grátis rolando
  | "trial_expirado" // teste acabou, nunca assinou
  | "ativa" // assinatura paga em dia
  | "em_atraso" // cobrança falhou, dentro dos 7 dias de carência
  | "vencida" // assinatura paga que lapsou (carência esgotada / cancelada)
  | "suspensa_admin" // BRYM suspendeu/cancelou pelo painel
  | "comp"; // conta cortesia: status 'ativo' sem Stripe

type TenantAssinatura = Pick<
  TenantRow,
  | "status_assinatura"
  | "trial_expira_em"
  | "assinatura_ativa_ate"
  | "assinatura_em_atraso"
  | "gateway"
>;

export function estadoAssinatura(
  t: TenantAssinatura,
  agora: Date = new Date(),
): EstadoAssinatura {
  if (t.status_assinatura === "suspenso" || t.status_assinatura === "cancelado") {
    return "suspensa_admin";
  }

  if (t.status_assinatura === "ativo") {
    if (!t.assinatura_ativa_ate) return "comp";
    const ativa = agora.getTime() < new Date(t.assinatura_ativa_ate).getTime();
    if (!ativa) return "vencida";
    // Sem gateway vinculado = concessão manual do /admin (cortesia,
    // parceria, ajuste pontual) — mesmo com prazo, não é uma assinatura
    // paga de verdade, então continua "comp" em vez de "ativa".
    if (!t.gateway) return "comp";
    return t.assinatura_em_atraso ? "em_atraso" : "ativa";
  }

  // status_assinatura === 'trial'
  if (
    t.trial_expira_em &&
    agora.getTime() < new Date(t.trial_expira_em).getTime()
  ) {
    return "trial";
  }
  return "trial_expirado";
}

const ESTADOS_LIBERADOS: EstadoAssinatura[] = [
  "trial",
  "ativa",
  "em_atraso",
  "comp",
];

export function acessoLiberado(t: TenantAssinatura, agora?: Date): boolean {
  return ESTADOS_LIBERADOS.includes(estadoAssinatura(t, agora));
}

/**
 * Rota pra onde mandar quem não tem acesso, ou `null` se o acesso está ok.
 * `/conta-suspensa` = ação do BRYM · `/assinar` = o dono resolve pagando.
 */
export function destinoBloqueio(
  t: TenantAssinatura,
  agora?: Date,
): "/conta-suspensa" | "/assinar" | null {
  const estado = estadoAssinatura(t, agora);
  if (estado === "suspensa_admin") return "/conta-suspensa";
  if (estado === "trial_expirado" || estado === "vencida") return "/assinar";
  return null;
}

/** Dias inteiros até `iso` (arredonda pra cima). Passado → 0. */
export function diasAte(iso: string | null, agora: Date = new Date()): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - agora.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

const FMT_DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

/** "2026-03-09T12:00:00Z" → "09/03/2026" */
export function dataBR(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return FMT_DATA.format(d);
}

export interface AssinaturaResumo {
  estado: EstadoAssinatura;
  titulo: string;
  detalhe: string;
}

export function assinaturaResumo(
  t: TenantAssinatura,
  agora: Date = new Date(),
): AssinaturaResumo {
  const estado = estadoAssinatura(t, agora);
  switch (estado) {
    case "trial": {
      const dias = diasAte(t.trial_expira_em, agora);
      return {
        estado,
        titulo: "Teste grátis",
        detalhe:
          dias === 1
            ? "Termina amanhã. Assine para não perder o acesso."
            : `Terminam ${dias} dias. Assine para não perder o acesso.`,
      };
    }
    case "trial_expirado":
      return {
        estado,
        titulo: "Teste encerrado",
        detalhe: "Escolha um plano para voltar a usar o BRYM.",
      };
    case "ativa":
      return {
        estado,
        titulo: "Assinatura ativa",
        detalhe: `Renova em ${dataBR(t.assinatura_ativa_ate)}.`,
      };
    case "em_atraso":
      return {
        estado,
        titulo: "Pagamento pendente",
        detalhe: `Regularize até ${dataBR(t.assinatura_ativa_ate)} para não perder o acesso.`,
      };
    case "vencida":
      return {
        estado,
        titulo: "Assinatura vencida",
        detalhe: "Renove o pagamento para reativar o acesso.",
      };
    case "comp":
      return {
        estado,
        titulo: "Conta liberada",
        detalhe: t.assinatura_ativa_ate
          ? `Cortesia até ${dataBR(t.assinatura_ativa_ate)}.`
          : "Acesso concedido pelo BRYM.",
      };
    case "suspensa_admin":
      return {
        estado,
        titulo: "Conta suspensa",
        detalhe: "Fale com o BRYM para regularizar.",
      };
  }
}
