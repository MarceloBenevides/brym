import type { Metadata } from "next";
import { Clock, Hourglass, Sparkles, UserCheck, UserX } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { requireSection } from "@/lib/guards";
import {
  CRM_PANORAMA_VAZIO,
  CRM_STATUS,
  CRM_STATUS_LABEL,
  statusRecuperavel,
  totalClassificados,
  type CrmPanorama,
  type CrmStatus,
} from "@/lib/crm";
import { createClient } from "@/lib/supabase/server";
import { CrmLista } from "./crm-lista";

export const metadata: Metadata = { title: "CRM" };
export const dynamic = "force-dynamic";

const ICONE = {
  novo: Sparkles,
  ativo: UserCheck,
  em_atencao: Clock,
  inativo: Hourglass,
  perdido: UserX,
} as const;

function statusValido(v: string | undefined): CrmStatus | null {
  return (CRM_STATUS as readonly string[]).includes(v ?? "")
    ? (v as CrmStatus)
    : null;
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; f?: string }>;
}) {
  const ctx = await requireSection("crm");
  const sp = await searchParams;
  const status = statusValido(sp.status);
  const soAContatar = sp.f !== "todos";

  const supabase = await createClient();
  const { data } = await supabase.rpc("crm_panorama", { p_status: status });
  const panorama = (data as CrmPanorama | null) ?? CRM_PANORAMA_VAZIO;
  const c = panorama.contagem;
  const total = totalClassificados(c);
  const recuperaveis = c.em_atencao + c.inativo;

  const ddi = ctx.settings?.ddi ?? "55";
  const mensagemTemplate = ctx.settings?.mensagem_recuperacao ?? null;

  return (
    <div>
      <PageHeader
        title="CRM"
        subtitle={
          total === 0
            ? "Nenhum cliente com atendimento concluído ainda"
            : `${total} clientes na régua · ${recuperaveis} para recuperar`
        }
      />

      <div className="flex flex-wrap gap-4">
        {CRM_STATUS.map((s) => (
          <StatCard
            key={s}
            icon={ICONE[s]}
            label={CRM_STATUS_LABEL[s]}
            value={String(c[s])}
            href={status === s ? "/crm" : `/crm?status=${s}`}
            active={status === s}
          />
        ))}
      </div>

      {c.sem_visita > 0 && (
        <p className="mt-3 text-[12px] text-text-faint">
          + {c.sem_visita} cliente(s) sem atendimento concluído registrado (fora
          da régua).
        </p>
      )}

      {status ? (
        <CrmLista
          titulo={CRM_STATUS_LABEL[status]}
          itens={panorama.clientes ?? []}
          ddi={ddi}
          mensagemTemplate={mensagemTemplate}
          recuperavel={statusRecuperavel(status)}
          soAContatar={soAContatar}
          chipHrefBase={`/crm?status=${status}`}
        />
      ) : (
        <CrmLista
          titulo="Para recuperar"
          itens={panorama.recuperar ?? []}
          ddi={ddi}
          mensagemTemplate={mensagemTemplate}
          recuperavel
          soAContatar={soAContatar}
          chipHrefBase="/crm"
        />
      )}
    </div>
  );
}
