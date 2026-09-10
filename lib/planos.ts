import type { PlanoAssinatura } from "@/types/database";

export interface PlanoInfo {
  id: PlanoAssinatura;
  nome: string;
  /** Rótulo curto do preço, ex.: "R$ 59/mês". Só exibição. */
  precoLabel: string;
  /** Valor mensal em centavos — usado pra identificar o plano no webhook. */
  valorCentavos: number;
  /** Valor mensal em reais — o que vai pro `value` do checkout Asaas. */
  valorReais: number;
  destaque: boolean;
  recursos: string[];
}

export const PLANOS_ORDEM: PlanoAssinatura[] = [
  "essencial",
  "profissional",
  "gestao",
];

export const PLANOS: Record<PlanoAssinatura, PlanoInfo> = {
  essencial: {
    id: "essencial",
    nome: "Essencial",
    precoLabel: "R$ 35/mês",
    valorCentavos: 3500,
    valorReais: 35,
    destaque: false,
    recursos: [
      "Agenda e clientes",
      "Link de agendamento online",
      "1 profissional",
    ],
  },
  profissional: {
    id: "profissional",
    nome: "Profissional",
    precoLabel: "R$ 59/mês",
    valorCentavos: 5900,
    valorReais: 59,
    destaque: true,
    recursos: [
      "Tudo do Essencial",
      "Equipe com vários profissionais",
      "Comandas e financeiro",
      "Comissões",
    ],
  },
  gestao: {
    id: "gestao",
    nome: "Gestão",
    precoLabel: "R$ 79,90/mês",
    valorCentavos: 7990,
    valorReais: 79.9,
    destaque: false,
    recursos: [
      "Tudo do Profissional",
      "Estoque e fornecedores",
      "Relatórios de margem",
      "CRM de recuperação",
    ],
  },
};

export function planoInfo(plano: PlanoAssinatura): PlanoInfo {
  return PLANOS[plano];
}

/** Nome do plano pra exibição, tolerante a `null`. */
export function planoLabel(plano: PlanoAssinatura | null): string {
  return plano ? PLANOS[plano].nome : "—";
}

export function isPlano(v: unknown): v is PlanoAssinatura {
  return v === "essencial" || v === "profissional" || v === "gestao";
}

/** Descobre o plano pelo valor total em centavos (3500/5900/7990). Stripe. */
export function planoPorValorCentavos(
  valor: number | null | undefined,
): PlanoAssinatura | null {
  if (!valor) return null;
  return PLANOS_ORDEM.find((p) => PLANOS[p].valorCentavos === valor) ?? null;
}

/** Descobre o plano pelo valor em reais (35 / 59 / 79.9). Asaas. */
export function planoPorValorReais(
  valor: number | string | null | undefined,
): PlanoAssinatura | null {
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (!n || !Number.isFinite(n)) return null;
  const centavos = Math.round(n * 100);
  return PLANOS_ORDEM.find((p) => PLANOS[p].valorCentavos === centavos) ?? null;
}
