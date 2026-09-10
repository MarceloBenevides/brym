import { agoraNoFuso } from "@/lib/agenda";
import { linkWhatsApp, primeiroNome } from "@/lib/whatsapp";

export { linkWhatsApp, primeiroNome };

export const MESES_NOMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

/** Mês (1–12) e ano de "hoje" no fuso do negócio. */
function hojeBR() {
  const iso = agoraNoFuso().dataISO;
  return { ano: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)) };
}

export function mesAtualNum(): number {
  return hojeBR().mes;
}

export function anoAtual(): number {
  return hojeBR().ano;
}

/** "3" → 3; inválido / fora de 1–12 → mês atual. */
export function normalizarMesNum(v: string | undefined): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : mesAtualNum();
}

/** Soma meses com wrap em 1–12 (aniversário não tem ano). */
export function somarMesNum(mes: number, delta: number): number {
  return ((((mes - 1 + delta) % 12) + 12) % 12) + 1;
}

export function mensagemParabens(
  nome: string,
  template: string | null,
): string {
  const t = (template ?? "").trim();
  return `Olá ${primeiroNome(nome)}, ${t || "feliz aniversário! 🎉"}`;
}

