import { agoraNoFuso, somarDias } from "@/lib/agenda";

export const PERIODOS = [
  { key: "hoje", label: "Hoje" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "tudo", label: "Tempo todo" },
] as const;

export type PeriodoKey = (typeof PERIODOS)[number]["key"] | "custom";

export function resolverPeriodo(
  key: string | undefined,
  de?: string,
  ate?: string,
): { key: PeriodoKey; de: string; ate: string; label: string } {
  const hoje = agoraNoFuso().dataISO;
  const isoOk = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

  if (key === "custom" && isoOk(de) && isoOk(ate)) {
    const d = de!;
    const a = ate!;
    return {
      key: "custom",
      de: d <= a ? d : a,
      ate: d <= a ? a : d,
      label: `${d.split("-").reverse().join("/")} – ${a.split("-").reverse().join("/")}`,
    };
  }

  switch (key) {
    case "hoje":
      return { key: "hoje", de: hoje, ate: hoje, label: "Hoje" };
    case "7d":
      return { key: "7d", de: somarDias(hoje, -6), ate: hoje, label: "Últimos 7 dias" };
    case "tudo":
      return { key: "tudo", de: "2000-01-01", ate: hoje, label: "Tempo todo" };
    case "30d":
    default:
      return { key: "30d", de: somarDias(hoje, -29), ate: hoje, label: "Últimos 30 dias" };
  }
}

export interface RelatorioVendas {
  total: number;
  num_comandas: number;
  num_clientes: number;
  num_servicos: number;
  num_produtos: number;
  total_produtos: number;
  ticket_medio: number;
  por_dia: { dia: string; valor: number }[];
  por_servico: { nome: string; qtd: number; valor: number }[];
  por_produto: { nome: string; qtd: number; valor: number }[];
  por_pagamento: { forma: string; valor: number }[];
}

export const RELATORIO_VAZIO: RelatorioVendas = {
  total: 0,
  num_comandas: 0,
  num_clientes: 0,
  num_servicos: 0,
  num_produtos: 0,
  total_produtos: 0,
  ticket_medio: 0,
  por_dia: [],
  por_servico: [],
  por_produto: [],
  por_pagamento: [],
};
