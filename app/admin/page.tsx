import type { Metadata } from "next";
import Link from "next/link";
import {
  AlarmClockOff,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Store,
} from "lucide-react";

import { SearchInput } from "@/components/ui/search-input";
import { StatCard } from "@/components/ui/stat-card";
import { requirePlataformaAdmin } from "@/lib/guards";
import {
  diasRestantesTrial,
  PLATAFORMA_PANORAMA_VAZIO,
  type PlataformaNegocio,
  type PlataformaPanorama,
} from "@/lib/plataforma";
import { createClient } from "@/lib/supabase/server";
import { EventosOrfaos } from "./eventos-orfaos";
import { FiltroData } from "./filtro-data";
import { NegociosTabela } from "./negocios-tabela";

export const metadata: Metadata = { title: "Plataforma" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type StatusFiltro = "trial" | "ativo" | "trial_expirado" | "em_atraso";

function statusValido(v: string | undefined): StatusFiltro | null {
  return v === "trial" || v === "ativo" || v === "trial_expirado" || v === "em_atraso"
    ? v
    : null;
}

function bateStatus(n: PlataformaNegocio, status: StatusFiltro): boolean {
  switch (status) {
    case "trial":
      return n.status_assinatura === "trial";
    case "ativo":
      return n.status_assinatura === "ativo";
    case "trial_expirado":
      return n.status_assinatura === "trial" && diasRestantesTrial(n.trial_expira_em) < 0;
    case "em_atraso":
      return n.assinatura_em_atraso;
  }
}

function bateBusca(n: PlataformaNegocio, q: string): boolean {
  const alvo = `${n.nome} ${n.dono_nome ?? ""} ${n.dono_email ?? ""}`.toLowerCase();
  return alvo.includes(q.toLowerCase());
}

/** `criado_em` é ISO (`timestamptz`) — comparar só a parte de data (YYYY-MM-DD). */
function bateData(n: PlataformaNegocio, de: string, ate: string): boolean {
  const dia = n.criado_em.slice(0, 10);
  if (de && dia < de) return false;
  if (ate && dia > ate) return false;
  return true;
}

/** Monta a querystring dos filtros atuais, trocando/removendo 1 campo. */
function hrefComFiltro(
  sp: Record<string, string | undefined>,
  patch: Record<string, string | null>,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) params.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) params.delete(k);
    else params.set(k, v);
  }
  // Trocar um filtro de verdade (status/busca/data) invalida a página atual;
  // trocar a própria página (paginador) não deve se auto-apagar.
  if (!("page" in patch)) params.delete("page");
  const qs = params.toString();
  return qs ? `/admin?${qs}` : "/admin";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    de?: string;
    ate?: string;
    page?: string;
  }>;
}) {
  await requirePlataformaAdmin();
  const sp = await searchParams;
  const status = statusValido(sp.status);
  const q = sp.q?.trim() ?? "";
  const de = sp.de ?? "";
  const ate = sp.ate ?? "";

  const supabase = await createClient();
  const { data } = await supabase.rpc("plataforma_panorama");
  const p = (data as PlataformaPanorama | null) ?? PLATAFORMA_PANORAMA_VAZIO;
  const t = p.totais;

  const filtrados = p.negocios.filter(
    (n) =>
      (!q || bateBusca(n, q)) &&
      (!status || bateStatus(n, status)) &&
      (!de && !ate ? true : bateData(n, de, ate)),
  );

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaPedida = Number(sp.page) || 1;
  const pagina = Math.min(Math.max(1, paginaPedida), totalPaginas);
  const negociosPagina = filtrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const filtroAtivo = { q: sp.q, status: sp.status, de: sp.de, ate: sp.ate };
  const cartao = (s: StatusFiltro) =>
    status === s ? hrefComFiltro(filtroAtivo, { status: null }) : hrefComFiltro(filtroAtivo, { status: s });

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-text">
        Negócios no BRYM
      </h1>
      <p className="mb-6 text-[13px] text-text-soft">
        Visão geral e uso de cada negócio cadastrado. Sem dados de clientes
        finais.
      </p>

      <div className="mb-6 flex flex-wrap gap-4">
        <StatCard icon={Store} label="Negócios" value={String(t.negocios)} />
        <StatCard
          icon={Clock}
          label="Em trial"
          value={String(t.trial)}
          href={cartao("trial")}
          active={status === "trial"}
        />
        <StatCard
          icon={Building2}
          label="Ativos"
          value={String(t.ativo)}
          href={cartao("ativo")}
          active={status === "ativo"}
        />
        <StatCard
          icon={AlarmClockOff}
          label="Trial expirado"
          value={String(t.trial_expirado)}
          href={cartao("trial_expirado")}
          active={status === "trial_expirado"}
        />
        <StatCard
          icon={CreditCard}
          label="Em atraso"
          value={String(t.em_atraso)}
          href={cartao("em_atraso")}
          active={status === "em_atraso"}
        />
      </div>

      <EventosOrfaos eventos={p.nao_vinculados} negocios={p.negocios} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Buscar negócio ou dono..." />
        <FiltroData />
        {(q || status || de || ate) && (
          <Link
            href="/admin"
            className="text-[12.5px] font-semibold text-text-faint hover:text-gold-deep"
          >
            Limpar filtros
          </Link>
        )}
      </div>

      <NegociosTabela negocios={negociosPagina} />

      {filtrados.length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-4 text-[12.5px] text-text-soft">
          {pagina > 1 ? (
            <Link
              href={hrefComFiltro(filtroAtivo, { page: String(pagina - 1) })}
              className="flex items-center gap-1 font-semibold hover:text-gold-deep"
            >
              <ChevronLeft size={14} /> Anterior
            </Link>
          ) : (
            <span className="flex items-center gap-1 text-text-faint opacity-50">
              <ChevronLeft size={14} /> Anterior
            </span>
          )}
          <span>
            Página {pagina} de {totalPaginas} · {filtrados.length} negócio
            {filtrados.length === 1 ? "" : "s"}
          </span>
          {pagina < totalPaginas ? (
            <Link
              href={hrefComFiltro(filtroAtivo, { page: String(pagina + 1) })}
              className="flex items-center gap-1 font-semibold hover:text-gold-deep"
            >
              Próxima <ChevronRight size={14} />
            </Link>
          ) : (
            <span className="flex items-center gap-1 text-text-faint opacity-50">
              Próxima <ChevronRight size={14} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
