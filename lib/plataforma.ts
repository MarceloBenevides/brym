import type {
  GatewayPagamento,
  PlanoAssinatura,
  Segmento,
  StatusAssinatura,
} from "@/types/database";

export const STATUS_ASSINATURA_LABEL: Record<StatusAssinatura, string> = {
  trial: "Trial",
  ativo: "Ativo",
  suspenso: "Suspenso",
  cancelado: "Cancelado",
};

export const STATUS_ASSINATURA_TOM: Record<
  StatusAssinatura,
  "neutral" | "gold" | "garnet" | "forest"
> = {
  trial: "gold",
  ativo: "forest",
  suspenso: "neutral",
  cancelado: "garnet",
};

export interface PlataformaTotais {
  negocios: number;
  trial: number;
  ativo: number;
  suspenso: number;
  cancelado: number;
  trial_expirado: number;
  em_atraso: number;
  eventos_nao_vinculados: number;
}

export interface PlataformaNegocio {
  id: string;
  nome: string;
  segmento: Segmento;
  status_assinatura: StatusAssinatura;
  trial_expira_em: string | null;
  criado_em: string;
  dono_nome: string | null;
  dono_email: string | null;
  plano: PlanoAssinatura | null;
  /** Liberação manual do admin da plataforma (migration 0037). */
  plano_manual: PlanoAssinatura | null;
  gateway: GatewayPagamento | null;
  assinatura_ativa_ate: string | null;
  assinatura_em_atraso: boolean;
  tem_gateway: boolean;
  n_clientes: number;
  n_profissionais: number;
  n_servicos: number;
  n_agendamentos: number;
  n_comandas: number;
  n_agendamentos_30d: number;
  n_comandas_30d: number;
  ultimo_agendamento: string | null;
}

export interface PlataformaEventoOrfao {
  id: string;
  gateway: GatewayPagamento;
  tipo: string;
  recebido_em: string;
  email: string | null;
  plano: string | null;
  valor: string | null;
}

export interface PlataformaPanorama {
  totais: PlataformaTotais;
  negocios: PlataformaNegocio[];
  nao_vinculados: PlataformaEventoOrfao[];
}

export const PLATAFORMA_PANORAMA_VAZIO: PlataformaPanorama = {
  totais: {
    negocios: 0,
    trial: 0,
    ativo: 0,
    suspenso: 0,
    cancelado: 0,
    trial_expirado: 0,
    em_atraso: 0,
    eventos_nao_vinculados: 0,
  },
  negocios: [],
  nao_vinculados: [],
};

/** Dias que faltam pro trial acabar. Negativo = já expirou. `null` → 0. */
export function diasRestantesTrial(trialExpiraEm: string | null): number {
  if (!trialExpiraEm) return 0;
  const ms = new Date(trialExpiraEm).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}
