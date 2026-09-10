import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { requireSection } from "@/lib/guards";
import {
  anoAtual,
  mesAtualNum,
  MESES_NOMES,
  normalizarMesNum,
  somarMesNum,
} from "@/lib/aniversario";
import { createClient } from "@/lib/supabase/server";
import type { ClientRow, FelicitacaoRow } from "@/types/database";
import { AniversariantesLista } from "./aniversariantes-lista";

export const metadata: Metadata = { title: "Aniversários" };

// Navegação de mês é via <Link> mudando só a query string; sem isto o roteador
// otimista do Next 16 congela o subtítulo do cabeçalho no mês anterior.
export const dynamic = "force-dynamic";

type Cliente = Pick<ClientRow, "id" | "nome" | "telefone" | "aniversario_dia" | "aniversario_mes">;

export default async function AniversariosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; f?: string }>;
}) {
  const ctx = await requireSection("aniversarios");
  const sp = await searchParams;
  const mesAlvo = normalizarMesNum(sp.mes);
  const soPendentes = sp.f === "pendentes";
  const ano = anoAtual();

  const supabase = await createClient();
  const [{ data: clientes }, { data: felicitacoes }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, nome, telefone, aniversario_dia, aniversario_mes")
      .eq("ativo", true)
      .eq("aniversario_mes", mesAlvo)
      .order("aniversario_dia", { ascending: true })
      .returns<Cliente[]>(),
    supabase
      .from("felicitacoes")
      .select("client_id")
      .eq("ano", ano)
      .returns<Pick<FelicitacaoRow, "client_id">[]>(),
  ]);

  const lista = clientes ?? [];
  const parabenizados = new Set((felicitacoes ?? []).map((f) => f.client_id));
  const pendentes = lista.filter((c) => !parabenizados.has(c.id)).length;

  const qMes = (m: number) =>
    `/aniversarios?mes=${m}${soPendentes ? "&f=pendentes" : ""}`;

  return (
    <div>
      <PageHeader
        title="Aniversariantes"
        subtitle={
          lista.length === 0
            ? `Nenhum em ${MESES_NOMES[mesAlvo - 1]}`
            : `${lista.length} em ${MESES_NOMES[mesAlvo - 1]} · ${pendentes} a parabenizar`
        }
        action={
          <div className="flex items-center gap-2">
            <Link
              href={qMes(somarMesNum(mesAlvo, -1))}
              className="rounded-lg border border-border p-2 text-text-soft"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={15} />
            </Link>
            <Link
              href={qMes(mesAtualNum())}
              className="rounded-lg border border-border px-3 py-2 text-[13px] font-semibold text-text-soft"
            >
              Este mês
            </Link>
            <Link
              href={qMes(somarMesNum(mesAlvo, 1))}
              className="rounded-lg border border-border p-2 text-text-soft"
              aria-label="Próximo mês"
            >
              <ChevronRight size={15} />
            </Link>
          </div>
        }
      />

      <AniversariantesLista
        clientes={lista}
        parabenizados={[...parabenizados]}
        mensagemTemplate={ctx.settings?.mensagem_aniversario ?? null}
        ddi={ctx.settings?.ddi ?? "55"}
        mesAlvo={mesAlvo}
        ano={ano}
        soPendentes={soPendentes}
      />
    </div>
  );
}
