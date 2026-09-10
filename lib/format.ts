const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** `45` → "R$ 45,00" */
export function formatBRL(valor: number | string | null | undefined): string {
  const n = typeof valor === "string" ? Number(valor) : (valor ?? 0);
  return BRL.format(Number.isFinite(n) ? n : 0);
}

/** `75` → "1h15" · `45` → "45min" · `60` → "1h" */
export function formatDuracao(min: number | null | undefined): string {
  const total = Math.max(0, Math.round(min ?? 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** `(20, 3)` → "20/03" · faltando → "" */
export function formatAniversario(
  dia: number | null | undefined,
  mes: number | null | undefined,
): string {
  if (!dia || !mes) return "";
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}

/** Iniciais para avatar: "Marcos Vinícius" → "MV" */
export function iniciais(nome: string | null | undefined): string {
  const parts = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
