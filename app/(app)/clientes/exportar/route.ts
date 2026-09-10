import { NextRequest } from "next/server";

import { requireOwner } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import type { ClientRow } from "@/types/database";

const CABECALHO = ["nome", "telefone", "email", "aniversario", "observacoes", "ativo"];

function aniversarioBR(dia: number | null, mes: number | null): string {
  if (!dia || !mes) return "";
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const ctx = await requireOwner();

  // ?modelo=1 → só o cabeçalho + uma linha de exemplo
  if (request.nextUrl.searchParams.get("modelo") === "1") {
    const csv = toCsv([
      CABECALHO.slice(0, 5),
      ["Maria Silva", "11999990000", "maria@exemplo.com", "15/03", "cliente antiga, prefere manhã"],
    ]);
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="modelo-clientes.csv"',
      },
    });
  }

  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clients")
    .select("nome, telefone, email, aniversario_dia, aniversario_mes, observacoes, ativo")
    .order("nome", { ascending: true })
    .returns<
      Pick<
        ClientRow,
        | "nome"
        | "telefone"
        | "email"
        | "aniversario_dia"
        | "aniversario_mes"
        | "observacoes"
        | "ativo"
      >[]
    >();

  const linhas: (string | null)[][] = [CABECALHO];
  for (const c of clientes ?? []) {
    linhas.push([
      c.nome,
      c.telefone,
      c.email,
      aniversarioBR(c.aniversario_dia, c.aniversario_mes),
      c.observacoes,
      c.ativo ? "sim" : "nao",
    ]);
  }

  const hoje = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(linhas), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="clientes-${ctx.tenant.slug}-${hoje}.csv"`,
    },
  });
}
