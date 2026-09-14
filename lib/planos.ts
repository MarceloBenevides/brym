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

// ----------------------------------------------------------------
// Régua de acesso por plano — o que cada nível libera. Espelha o texto de
// `recursos` acima (Profissional = "Comandas e financeiro"; Gestão =
// "Estoque e fornecedores" + "CRM de recuperação") — mantenha os dois em
// sincronia se o texto mudar.
// ----------------------------------------------------------------

const ORDEM_PLANO: Record<PlanoAssinatura, number> = {
  essencial: 0,
  profissional: 1,
  gestao: 2,
};

/** Seções da navegação (chave = `NavItem.section` / `requireSection`). */
const PLANO_MINIMO_SECAO: Partial<Record<string, PlanoAssinatura>> = {
  produtos: "gestao",
  fornecedores: "gestao",
  crm: "gestao",
};

/**
 * Capacidades **dentro** de uma seção já liberada, que ainda dependem do
 * plano — hoje só as abas avançadas de Financeiro (Comandas fica de fora
 * de propósito: é a única aba livre desde o Essencial). Mesmo espírito de
 * `PERMISSOES_EXTRAS` em `lib/permissions.ts` (seção vs. capacidade extra
 * que não é seção), só que no eixo do plano do negócio em vez da permissão
 * do funcionário.
 */
const PLANO_MINIMO_CAPACIDADE: Partial<Record<string, PlanoAssinatura>> = {
  financeiro_avancado: "profissional",
};

function liberadoPeloPlano(
  minimo: PlanoAssinatura | undefined,
  plano: PlanoAssinatura | null,
): boolean {
  if (!minimo) return true;
  // Sem plano definido (trial, ou ativação manual pelo /admin sem gateway)
  // libera tudo — só um plano pago específico restringe.
  if (!plano) return true;
  return ORDEM_PLANO[plano] >= ORDEM_PLANO[minimo];
}

/** A seção está liberada pelo plano do negócio? */
export function secaoLiberadaPeloPlano(
  secao: string,
  plano: PlanoAssinatura | null,
): boolean {
  return liberadoPeloPlano(PLANO_MINIMO_SECAO[secao], plano);
}

/** A capacidade (recorte dentro de uma seção já liberada) está liberada? */
export function capacidadeLiberadaPeloPlano(
  capacidade: string,
  plano: PlanoAssinatura | null,
): boolean {
  return liberadoPeloPlano(PLANO_MINIMO_CAPACIDADE[capacidade], plano);
}

/**
 * O plano que realmente vale pra régua de acesso: o maior entre o que está
 * sendo cobrado de verdade (`plano`) e uma liberação manual do admin da
 * plataforma (`planoManual`, `/admin` — cortesia, sem mexer no que é
 * cobrado). Uma liberação manual nunca **reduz** o que o negócio já tem
 * por direito de pagamento, só pode aumentar.
 */
export function planoEfetivo(
  plano: PlanoAssinatura | null,
  planoManual: PlanoAssinatura | null,
): PlanoAssinatura | null {
  if (!planoManual) return plano;
  if (!plano) return planoManual;
  return ORDEM_PLANO[planoManual] > ORDEM_PLANO[plano] ? planoManual : plano;
}
