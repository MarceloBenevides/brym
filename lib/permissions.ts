/**
 * Permissões de funcionário — cada chave é ou uma **seção** da navegação, ou uma
 * **capacidade extra**. Tudo é guardado no mesmo `profiles.permissoes text[]`.
 * O dono (owner) sempre tem tudo; `permissoes` só vale para employees.
 */

/** Seções que podem ser liberadas para um funcionário (viram itens de menu). */
export const SECOES_LIBERAVEIS = [
  "clientes",
  "crm",
  "servicos",
  "produtos",
  "financeiro",
  "fornecedores",
  "aniversarios",
] as const;

export type SecaoLiberavel = (typeof SECOES_LIBERAVEIS)[number];

/** Capacidades extras — não são seções/rotas, só flags de comportamento. */
export const PERMISSOES_EXTRAS = ["ver_agenda_equipe"] as const;

export type PermissaoExtra = (typeof PERMISSOES_EXTRAS)[number];

/** Todas as permissões concedíveis (seções + extras). */
export const PERMISSOES_CONCEDIVEIS: readonly string[] = [
  ...SECOES_LIBERAVEIS,
  ...PERMISSOES_EXTRAS,
];

/** Seções exclusivas do dono — nunca aparecem para funcionário. */
export const SECOES_SO_DONO = ["equipe", "configuracoes"] as const;

/** Todo funcionário enxerga a própria agenda. */
export const SECAO_SEMPRE = "agenda";

export const SECAO_LABEL: Record<string, string> = {
  agenda: "Agenda",
  clientes: "Clientes",
  crm: "CRM",
  servicos: "Serviços",
  produtos: "Produtos",
  financeiro: "Financeiro",
  fornecedores: "Fornecedores",
  aniversarios: "Aniversários",
  equipe: "Equipe",
  configuracoes: "Configurações",
  ver_agenda_equipe: "Ver agenda da equipe",
};

/** Marcadas por padrão ao abrir o formulário de convite. */
export const PERMISSOES_PADRAO: string[] = ["clientes", "ver_agenda_equipe"];

export function isSecaoLiberavel(value: unknown): value is SecaoLiberavel {
  return (
    typeof value === "string" &&
    (SECOES_LIBERAVEIS as readonly string[]).includes(value)
  );
}

/** Filtra uma lista arbitrária para só as permissões concedíveis válidas. */
export function sanitizarPermissoes(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values.filter(
        (v): v is string =>
          typeof v === "string" && PERMISSOES_CONCEDIVEIS.includes(v),
      ),
    ),
  );
}

/** Um contexto com `isOwner` e `permissoes` pode acessar a seção? */
export function podeAcessarSecao(
  ctx: { isOwner: boolean; permissoes: string[] },
  secao: string,
): boolean {
  if (ctx.isOwner) return true;
  if (secao === SECAO_SEMPRE) return true;
  if ((SECOES_SO_DONO as readonly string[]).includes(secao)) return false;
  return ctx.permissoes.includes(secao);
}

/** Pode ver a agenda dos outros profissionais (não só a própria)? */
export function podeVerAgendaEquipe(ctx: {
  isOwner: boolean;
  permissoes: string[];
}): boolean {
  return ctx.isOwner || ctx.permissoes.includes("ver_agenda_equipe");
}

export function resumoPermissoes(permissoes: string[]): string {
  const rotulos = [
    "Agenda",
    ...permissoes
      .filter((p) => p !== "ver_agenda_equipe")
      .map((p) => SECAO_LABEL[p] ?? p),
  ];
  if (permissoes.includes("ver_agenda_equipe")) rotulos.push("agenda da equipe");
  return rotulos.join(" · ");
}
