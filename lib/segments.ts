import {
  Scissors,
  Sparkles,
  Stethoscope,
  PenTool,
  Store,
  type LucideIcon,
} from "lucide-react";

import type { Segmento } from "@/types/database";

export interface SegmentoInfo {
  value: Segmento;
  label: string;
  descricao: string;
  icon: LucideIcon;
}

/** Opções mostradas no cadastro do dono (SegmentPicker). */
export const SEGMENTOS: SegmentoInfo[] = [
  {
    value: "barbearia",
    label: "Barbearia",
    descricao: "Cortes, barba e cuidados masculinos.",
    icon: Scissors,
  },
  {
    value: "salao",
    label: "Salão de beleza",
    descricao: "Cabelo, unhas, estética e maquiagem.",
    icon: Sparkles,
  },
  {
    value: "clinica",
    label: "Clínica / consultório",
    descricao: "Estética, fisioterapia, odontologia e saúde.",
    icon: Stethoscope,
  },
  {
    value: "estudio",
    label: "Estúdio",
    descricao: "Tatuagem, piercing, pilates, yoga e afins.",
    icon: PenTool,
  },
  {
    value: "outro",
    label: "Outro",
    descricao: "Qualquer negócio de atendimento com hora marcada.",
    icon: Store,
  },
];

const SEGMENTO_VALUES = new Set<string>(SEGMENTOS.map((s) => s.value));

export function isSegmento(value: unknown): value is Segmento {
  return typeof value === "string" && SEGMENTO_VALUES.has(value);
}

export function segmentoLabel(value: Segmento): string {
  return SEGMENTOS.find((s) => s.value === value)?.label ?? "Negócio";
}
