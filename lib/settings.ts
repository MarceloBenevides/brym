import type { TenantSettingsRow } from "@/types/database";

/** Seções da navegação que dependem de uma flag do `tenant_settings`. */
export const SECAO_FLAG: Record<string, keyof TenantSettingsRow> = {
  produtos: "habilitar_estoque",
  fornecedores: "habilitar_fornecedores",
};

/**
 * A seção está habilitada? `true` quando ela não tem flag, ou a flag está ligada.
 * Sem `settings` (ex.: antes de carregar), assume habilitado.
 */
export function secaoHabilitada(
  secao: string,
  settings: TenantSettingsRow | null | undefined,
): boolean {
  const flag = SECAO_FLAG[secao];
  if (!flag) return true;
  if (!settings) return true;
  return Boolean(settings[flag]);
}

/** Opções do intervalo entre horários da agenda (minutos). */
export const INTERVALOS_AGENDAMENTO = [10, 15, 20, 30, 45, 60] as const;

/** Limite de caracteres das mensagens configuráveis. */
export const MENSAGEM_MAX = 500;
