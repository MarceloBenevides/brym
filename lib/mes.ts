/** Navegação por mês — "YYYY-MM", horário local, sem timezone. */

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Mês atual como "YYYY-MM". */
export function mesAtualISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Valida/normaliza "YYYY-MM"; inválido → mês atual. */
export function normalizarMes(iso: string | undefined): string {
  if (iso && /^\d{4}-\d{2}$/.test(iso)) {
    const m = Number(iso.slice(5, 7));
    if (m >= 1 && m <= 12) return iso;
  }
  return mesAtualISO();
}

/** "2026-08" + n meses → "YYYY-MM". */
export function somarMeses(iso: string, n: number): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-08" → "agosto de 2026". */
export function mesPorExtenso(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MESES[m - 1]} de ${y}`;
}

/** Primeiro e último dia do mês, como "YYYY-MM-DD". */
export function intervaloDoMes(iso: string): { inicio: string; fim: string } {
  const [y, m] = iso.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return {
    inicio: `${iso}-01`,
    fim: `${iso}-${String(ultimo).padStart(2, "0")}`,
  };
}
