"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatBRL } from "@/lib/format";

function diaCurto(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function GraficoLinhaValor({
  dados,
  label = "Faturado",
  vazioMsg = "Sem vendas no período.",
}: {
  dados: { dia: string; valor: number }[];
  label?: string;
  vazioMsg?: string;
}) {
  if (dados.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-[13px] text-text-faint">
        {vazioMsg}
      </div>
    );
  }

  return (
    <div style={{ height: 240, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="dia"
            tickFormatter={diaCurto}
            tick={{ fontSize: 11, fill: "var(--color-text-faint)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-text-faint)" }}
            axisLine={false}
            tickLine={false}
            width={64}
            tickFormatter={(v) => formatBRL(Number(v))}
          />
          <Tooltip
            formatter={(v) => [formatBRL(Number(v)), label]}
            labelFormatter={(l) => diaCurto(String(l))}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="valor"
            stroke="var(--color-gold-deep)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--color-gold-deep)" }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
