import type { Metadata } from "next";
import {
  AlarmClockOff,
  Building2,
  Clock,
  CreditCard,
  Store,
} from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import { requirePlataformaAdmin } from "@/lib/guards";
import {
  PLATAFORMA_PANORAMA_VAZIO,
  type PlataformaPanorama,
} from "@/lib/plataforma";
import { createClient } from "@/lib/supabase/server";
import { EventosOrfaos } from "./eventos-orfaos";
import { NegociosTabela } from "./negocios-tabela";

export const metadata: Metadata = { title: "Plataforma" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requirePlataformaAdmin();
  const supabase = await createClient();
  const { data } = await supabase.rpc("plataforma_panorama");
  const p = (data as PlataformaPanorama | null) ?? PLATAFORMA_PANORAMA_VAZIO;
  const t = p.totais;

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
        <StatCard icon={Clock} label="Em trial" value={String(t.trial)} />
        <StatCard icon={Building2} label="Ativos" value={String(t.ativo)} />
        <StatCard
          icon={AlarmClockOff}
          label="Trial expirado"
          value={String(t.trial_expirado)}
        />
        <StatCard
          icon={CreditCard}
          label="Em atraso"
          value={String(t.em_atraso)}
        />
      </div>

      <EventosOrfaos eventos={p.nao_vinculados} negocios={p.negocios} />

      <NegociosTabela negocios={p.negocios} />
    </div>
  );
}
