/**
 * Tipos das tabelas BRYM — escritos à mão para a Fase 1a.
 * Os clientes Supabase ainda são "untyped" nesta fase; use estes tipos
 * nos `.select<...>()` / `.maybeSingle<...>()` e nos componentes.
 *
 * Quando o schema crescer, gere automaticamente:
 *   npx supabase gen types typescript --project-id <ref> > types/database.ts
 */

export type Segmento =
  | "barbearia"
  | "salao"
  | "clinica"
  | "estudio"
  | "outro";

export type PapelUsuario = "owner" | "employee" | "client";

export type StatusAssinatura = "trial" | "ativo" | "suspenso" | "cancelado";

/** Planos pagos. `null` no tenant = trial ou plano ainda desconhecido. */
export type PlanoAssinatura = "essencial" | "profissional" | "gestao";

/** Gateway de pagamento ativo do tenant. `stripe` fica dormente (expansão EU). */
export type GatewayPagamento = "stripe" | "asaas";

export interface TenantRow {
  id: string;
  nome: string;
  slug: string;
  segmento: Segmento;
  telefone: string | null;
  endereco: string | null;
  /** Logo do negócio nas telas públicas (migration 0038). `null` = fallback círculo com inicial. */
  logo_url: string | null;
  plano_assinatura: string;
  status_assinatura: StatusAssinatura;
  trial_expira_em: string | null;
  criado_em: string;
  // Assinatura (migrations 0031 Stripe → 0032 genérico + Asaas → 0033 cpf)
  gateway: GatewayPagamento | null;
  gateway_customer_id: string | null;
  gateway_subscription_id: string | null;
  /** CPF/CNPJ do responsável — exigido pelo Asaas pra criar a assinatura. */
  cpf_cnpj: string | null;
  plano: PlanoAssinatura | null;
  /** Liberação manual do admin da plataforma (migration 0037) — nunca reduz
   * o que o negócio já tem por direito de pagamento, só pode aumentar
   * (ver `lib/planos.ts` `planoEfetivo`). */
  plano_manual: PlanoAssinatura | null;
  /** Acesso pago liberado enquanto `now() < assinatura_ativa_ate`. */
  assinatura_ativa_ate: string | null;
  assinatura_em_atraso: boolean;
  assinatura_cancelar_no_fim: boolean;
}

/** Log de eventos recebidos dos webhooks de pagamento (migration 0032). */
export interface PagamentoEventoRow {
  id: string;
  gateway: GatewayPagamento;
  tipo: string;
  tenant_id: string | null;
  acao: string | null;
  processado: boolean;
  erro: string | null;
  payload: unknown;
  recebido_em: string;
}

export interface ProfileRow {
  id: string;
  tenant_id: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  papel: PapelUsuario;
  permissoes: string[];
  ativo: boolean;
  plataforma_admin: boolean;
  criado_em: string;
}

export type StatusConvite = "pendente" | "aceito" | "revogado";

export interface InvitationRow {
  id: string;
  tenant_id: string;
  email: string;
  nome: string;
  papel: "employee";
  permissoes: string[];
  criar_profissional: boolean;
  token: string;
  status: StatusConvite;
  convidado_por: string | null;
  criado_em: string;
  expira_em: string;
  aceito_em: string | null;
}

/**
 * Horário de funcionamento por dia da semana. Chaves "0".."6" (0 = domingo,
 * casa com `extract(dow)` do Postgres e `Date.getDay()` do JS). Valor `null` =
 * fechado nesse dia.
 */
export type HorarioSemana = Record<
  string,
  { abre: string; fecha: string } | null
>;

export interface TenantSettingsRow {
  tenant_id: string;
  permitir_cliente_mesmo_telefone: boolean;
  controlar_dinheiro_caixa: boolean;
  exibir_comandas_pendentes: boolean;
  habilitar_pacotes: boolean;
  habilitar_estoque: boolean;
  habilitar_fornecedores: boolean;
  intervalo_agendamento_min: number;
  horario_funcionamento: HorarioSemana;
  ddi: string;
  mensagem_aniversario: string | null;
  mensagem_confirmacao: string | null;
  crm_dias_ativo: number;
  crm_dias_atencao: number;
  crm_dias_inativo: number;
  mensagem_recuperacao: string | null;
}

export interface ServiceCategoryRow {
  id: string;
  tenant_id: string;
  nome: string;
  criado_em: string;
}

export interface ProfessionalRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  nome: string;
  telefone: string | null;
  cargo: string | null;
  recebe_comissao: boolean;
  percentual_comissao: number;
  mostrar_no_link_online: boolean;
  foto_url: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface ProfessionalServiceRow {
  tenant_id: string;
  professional_id: string;
  service_id: string;
}

export type MotivoAusencia = "folga" | "falta" | "atraso" | "outro";

export interface AusenciaRow {
  id: string;
  tenant_id: string;
  professional_id: string;
  data: string;
  dia_todo: boolean;
  hora_inicio: string | null;
  hora_fim: string | null;
  motivo: MotivoAusencia;
  observacoes: string | null;
  criado_por: string | null;
  criado_em: string;
}

export interface ServiceRow {
  id: string;
  tenant_id: string;
  category_id: string | null;
  nome: string;
  duracao_min: number;
  preco: number;
  ativo: boolean;
  criado_em: string;
}

export interface ProductCategoryRow {
  id: string;
  tenant_id: string;
  nome: string;
  criado_em: string;
}

export interface ProductRow {
  id: string;
  tenant_id: string;
  category_id: string | null;
  nome: string;
  marca: string | null;
  codigo: string | null;
  preco: number;
  custo: number;
  controla_estoque: boolean;
  estoque_min: number;
  estoque_atual: number;
  comissao_percentual: number;
  ativo: boolean;
  criado_em: string;
}

export type TipoMovimento =
  | "entrada"
  | "saida"
  | "venda"
  | "devolucao"
  | "ajuste";

export interface EstoqueMovimentoRow {
  id: string;
  tenant_id: string;
  product_id: string;
  tipo: TipoMovimento;
  quantidade: number;
  saldo_apos: number | null;
  motivo: string | null;
  comanda_id: string | null;
  supplier_id: string | null;
  criado_por: string | null;
  criado_em: string;
}

export interface SupplierRow {
  id: string;
  tenant_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface ClientRow {
  id: string;
  tenant_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  aniversario_dia: number | null;
  aniversario_mes: number | null;
  observacoes: string | null;
  saldo_credito: number;
  ativo: boolean;
  criado_em: string;
}

export type StatusAgendamento =
  | "confirmado"
  | "concluido"
  | "cancelado"
  | "nao_compareceu";

export interface AppointmentRow {
  id: string;
  tenant_id: string;
  client_id: string;
  professional_id: string;
  service_id: string | null;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: StatusAgendamento;
  observacoes: string | null;
  criado_em: string;
}

export type StatusComanda = "aberta" | "fechada";
export type FormaPagamento =
  | "pix"
  | "debito"
  | "credito"
  | "dinheiro"
  | "saldo";

export interface ComandaRow {
  id: string;
  tenant_id: string;
  /** null = venda avulsa (balcão), sem agendamento */
  appointment_id: string | null;
  client_id: string | null;
  professional_id: string | null;
  status: StatusComanda;
  aberta_em: string;
  fechada_em: string | null;
  criado_em: string;
}

export interface ComandaItemRow {
  id: string;
  comanda_id: string;
  tipo: "servico" | "produto" | "pacote";
  service_id: string | null;
  product_id: string | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  custo_unitario: number | null;
  criado_em: string;
}

export interface PaymentRow {
  id: string;
  comanda_id: string;
  forma: FormaPagamento;
  valor: number;
  criado_em: string;
}

/** Linha de agendamento com os nomes já resolvidos (para a grade). */
export interface AppointmentView extends AppointmentRow {
  cliente_nome: string;
  cliente_telefone: string | null;
  servico_nome: string | null;
  comanda_id: string | null;
  comanda_status: StatusComanda | null;
}

export interface FelicitacaoRow {
  id: string;
  tenant_id: string;
  client_id: string;
  ano: number;
  criado_por: string | null;
  criado_em: string;
}

export interface CrmContatoRow {
  id: string;
  tenant_id: string;
  client_id: string;
  criado_por: string | null;
  criado_em: string;
}

export type StatusComissao = "a_pagar" | "pago";

export interface CommissionRow {
  id: string;
  tenant_id: string;
  comanda_id: string | null;
  professional_id: string | null;
  profissional_nome: string;
  base_servicos: number;
  percentual: number;
  valor: number;
  status: StatusComissao;
  fechada_em: string;
  pago_em: string | null;
  criado_em: string;
}

export type StatusDespesa = "pago" | "pendente";

export interface ExpenseRow {
  id: string;
  tenant_id: string;
  categoria: string;
  descricao: string | null;
  valor: number;
  data: string;
  status: StatusDespesa;
  criado_em: string;
}
