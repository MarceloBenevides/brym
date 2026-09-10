import { primeiroNome } from "@/lib/whatsapp";

export const CRM_STATUS = [
  "novo",
  "ativo",
  "em_atencao",
  "inativo",
  "perdido",
] as const;

export type CrmStatus = (typeof CRM_STATUS)[number];

export const CRM_STATUS_LABEL: Record<CrmStatus, string> = {
  novo: "Novo",
  ativo: "Ativo",
  em_atencao: "Em atenção",
  inativo: "Inativo",
  perdido: "Perdido",
};

/** Tom do <Pill> por status (tons disponíveis: neutral | gold | garnet | forest). */
export const CRM_STATUS_TOM: Record<CrmStatus, "neutral" | "gold" | "garnet" | "forest"> = {
  novo: "gold",
  ativo: "forest",
  em_atencao: "gold",
  inativo: "neutral",
  perdido: "garnet",
};

export const CRM_DIAS_PADRAO = { ativo: 35, atencao: 70, inativo: 140 } as const;

export interface CrmContagem {
  novo: number;
  ativo: number;
  em_atencao: number;
  inativo: number;
  perdido: number;
  sem_visita: number;
}

export interface CrmRecuperarItem {
  id: string;
  nome: string;
  telefone: string | null;
  ultimo_atendimento: string;
  dias: number;
  visitas: number;
  status: CrmStatus;
  contatado_em: string | null;
}

export interface CrmPanorama {
  contagem: CrmContagem;
  recuperar: CrmRecuperarItem[];
  /** lista completa de um status específico (quando pedida); senão null */
  clientes: CrmRecuperarItem[] | null;
}

export const CRM_PANORAMA_VAZIO: CrmPanorama = {
  contagem: {
    novo: 0,
    ativo: 0,
    em_atencao: 0,
    inativo: 0,
    perdido: 0,
    sem_visita: 0,
  },
  recuperar: [],
  clientes: null,
};

/** Em atenção e Inativo têm o controle de "esconder por 30 dias após contatar". */
export function statusRecuperavel(s: CrmStatus): boolean {
  return s === "em_atencao" || s === "inativo";
}

/** Total de clientes que entraram na régua (exclui os sem atendimento). */
export function totalClassificados(c: CrmContagem): number {
  return c.novo + c.ativo + c.em_atencao + c.inativo + c.perdido;
}

export function mensagemRecuperacao(nome: string, template: string | null): string {
  const t = (template ?? "").trim();
  return `Olá ${primeiroNome(nome)}, ${
    t || "faz um tempo que você não aparece por aqui! Bora marcar um horário?"
  }`;
}

/** Contato geral (Novo/Ativo) — fallback neutro; usa o mesmo template se houver. */
export function mensagemContato(nome: string, template: string | null): string {
  const t = (template ?? "").trim();
  return `Olá ${primeiroNome(nome)}, ${t || "tudo bem? "}`.trimEnd();
}

/** Mensagem certa pro status: recuperação pra quem sumiu, contato pra quem é recente. */
export function mensagemPorStatus(
  status: CrmStatus,
  nome: string,
  template: string | null,
): string {
  return status === "novo" || status === "ativo"
    ? mensagemContato(nome, template)
    : mensagemRecuperacao(nome, template);
}
