export const CATEGORIAS_DESPESA = [
  "Aluguel",
  "Contas (água/luz/internet)",
  "Produtos e insumos",
  "Marketing",
  "Salários e pró-labore",
  "Impostos e taxas",
  "Equipamentos",
  "Manutenção",
  "Outros",
] as const;

export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number];

const SET = new Set<string>(CATEGORIAS_DESPESA);

export function categoriaValida(v: unknown): v is CategoriaDespesa {
  return typeof v === "string" && SET.has(v);
}
