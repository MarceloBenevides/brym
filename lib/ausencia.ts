/** Rótulos e helpers de ausência de profissional. */

import { faixasCruzam, hhmm } from "@/lib/agenda";
import type { MotivoAusencia } from "@/types/database";

export const MOTIVOS_AUSENCIA: MotivoAusencia[] = [
  "folga",
  "falta",
  "atraso",
  "outro",
];

export const MOTIVO_LABEL: Record<MotivoAusencia, string> = {
  folga: "Folga",
  falta: "Falta",
  atraso: "Atraso",
  outro: "Ausente",
};

export const MOTIVO_TOM: Record<
  MotivoAusencia,
  "neutral" | "gold" | "garnet" | "forest"
> = {
  folga: "gold",
  falta: "garnet",
  atraso: "gold",
  outro: "neutral",
};

export function isMotivoAusencia(v: unknown): v is MotivoAusencia {
  return v === "folga" || v === "falta" || v === "atraso" || v === "outro";
}

type AusenciaMin = {
  dia_todo: boolean;
  hora_inicio: string | null;
  hora_fim: string | null;
};

/** A ausência cobre a faixa [hora, horaFim)? Dia todo sempre cobre. */
export function ausenciaCobreSlot(
  a: AusenciaMin,
  hora: string,
  horaFim: string,
): boolean {
  if (a.dia_todo) return true;
  if (!a.hora_inicio || !a.hora_fim) return false;
  return faixasCruzam(hora, horaFim, hhmm(a.hora_inicio), hhmm(a.hora_fim));
}

/** "dia inteiro" | "09:00-11:00" */
export function ausenciaJanela(a: AusenciaMin): string {
  if (a.dia_todo || !a.hora_inicio || !a.hora_fim) return "dia inteiro";
  return `${hhmm(a.hora_inicio)}-${hhmm(a.hora_fim)}`;
}
