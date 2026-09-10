/** Utilidades de data/hora para a agenda. Tudo em horário local, sem timezone. */

export const AGENDA_INICIO = "08:00";
export const AGENDA_FIM = "20:00";

/** Fuso de referência do negócio (pt-BR). Server pode rodar em UTC. */
export const FUSO_BR = "America/Sao_Paulo";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Rótulos longos por dia da semana (0 = domingo), pra Configurações. */
export const DIAS_SEMANA_LONGO = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
];

export type HorarioDia = { abre: string; fecha: string } | null;
export type Horarios = Record<string, HorarioDia>;

/** Horário padrão: os 7 dias abertos 08:00–20:00 (comportamento antigo). */
export const HORARIO_PADRAO: Horarios = {
  "0": { abre: AGENDA_INICIO, fecha: AGENDA_FIM },
  "1": { abre: AGENDA_INICIO, fecha: AGENDA_FIM },
  "2": { abre: AGENDA_INICIO, fecha: AGENDA_FIM },
  "3": { abre: AGENDA_INICIO, fecha: AGENDA_FIM },
  "4": { abre: AGENDA_INICIO, fecha: AGENDA_FIM },
  "5": { abre: AGENDA_INICIO, fecha: AGENDA_FIM },
  "6": { abre: AGENDA_INICIO, fecha: AGENDA_FIM },
};

/**
 * Horário de funcionamento de um dia específico ("YYYY-MM-DD").
 * Retorna `{ abre, fecha }` ou `null` (fechado). Chave inexistente cai no padrão.
 */
export function horarioDoDia(
  horarios: Horarios | null | undefined,
  dataISO: string,
): HorarioDia {
  const dow = new Date(`${dataISO}T12:00:00`).getDay();
  const chave = String(dow);
  const fonte = horarios ?? HORARIO_PADRAO;
  const dia = chave in fonte ? fonte[chave] : HORARIO_PADRAO[chave];
  if (!dia || !dia.abre || !dia.fecha) return null;
  return { abre: hhmm(dia.abre), fecha: hhmm(dia.fecha) };
}

/** "09:00:00" | "09:00" → "09:00" */
export function hhmm(t: string): string {
  return t.slice(0, 5);
}

function toMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/** "09:30" | "09:30:00" → minutos desde 00:00. */
export function horaEmMinutos(t: string): number {
  return toMinutes(t);
}

/**
 * Data e hora "de agora" no fuso do negócio — seguro no servidor (que roda em UTC).
 * `minutos` = minutos desde a meia-noite local.
 */
export function agoraNoFuso(): { dataISO: string; minutos: number } {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSO_BR,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const hora = partes.hour === "24" ? "00" : partes.hour;
  return {
    dataISO: `${partes.year}-${partes.month}-${partes.day}`,
    minutos: Number(hora) * 60 + Number(partes.minute),
  };
}

function fromMinutes(total: number): string {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** "09:00" + 45 → "09:45" */
export function addMinutos(t: string, min: number): string {
  return fromMinutes(toMinutes(t) + min);
}

/** Todos os horários de `start` a `end` (exclusivo) no passo dado. */
export function gerarSlots(start: string, end: string, passoMin: number): string[] {
  const out: string[] = [];
  const fim = toMinutes(end);
  for (let m = toMinutes(start); m < fim; m += passoMin) out.push(fromMinutes(m));
  return out;
}

/** Duas faixas [aInicio,aFim) e [bInicio,bFim) se cruzam? */
export function faixasCruzam(
  aInicio: string,
  aFim: string,
  bInicio: string,
  bFim: string,
): boolean {
  return toMinutes(aInicio) < toMinutes(bFim) && toMinutes(aFim) > toMinutes(bInicio);
}

/** Data de hoje em "YYYY-MM-DD" (local). */
export function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Valida/normaliza uma string "YYYY-MM-DD"; inválida → hoje. */
export function normalizarData(iso: string | undefined): string {
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const d = new Date(`${iso}T12:00:00`);
    if (!Number.isNaN(d.getTime())) return iso;
  }
  return hojeISO();
}

/** "2026-08-27" + delta dias → "YYYY-MM-DD" */
export function somarDias(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-08-27" → "qui, 27 de agosto de 2026" */
export function dataPorExtenso(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
