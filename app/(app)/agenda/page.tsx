import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AgendarLink } from "@/components/agenda/agendar-link";
import { PageHeader } from "@/components/app-shell/page-header";
import { requireApp } from "@/lib/guards";
import { podeAcessarSecao, podeVerAgendaEquipe } from "@/lib/permissions";
import {
  addMinutos,
  dataPorExtenso,
  gerarSlots,
  hhmm,
  hojeISO,
  horarioDoDia,
  normalizarData,
  somarDias,
} from "@/lib/agenda";
import { createClient } from "@/lib/supabase/server";
import type {
  AppointmentView,
  AusenciaRow,
  ClientRow,
  HorarioSemana,
  ProfessionalRow,
  ServiceRow,
} from "@/types/database";
import { AgendaGrid } from "./agenda-grid";

export const metadata: Metadata = { title: "Agenda" };

// Navegação de dia é via <Link> mudando só a query string; sem isto o roteador
// otimista do Next 16 reusa o subtree já renderizado e o subtítulo do cabeçalho
// congela na data anterior.
export const dynamic = "force-dynamic";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; equipe?: string }>;
}) {
  const ctx = await requireApp();
  const { dia: diaParam, equipe: equipeParam } = await searchParams;
  const dia = normalizarData(diaParam);

  const vinculado = ctx.professionalId;
  const podeEquipe = podeVerAgendaEquipe(ctx);
  const verEquipe = equipeParam === "1";
  const soMinhaColuna = Boolean(vinculado) && !(podeEquipe && verEquipe);

  const supabase = await createClient();
  const [
    { data: profissionais },
    { data: servicos },
    { data: clientes },
    { data: settings },
    { data: rows },
    { data: ausencias },
  ] = await Promise.all([
    supabase
      .from("professionals")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("ativo", true)
      .order("nome")
      .returns<ProfessionalRow[]>(),
    supabase
      .from("services")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("ativo", true)
      .order("nome")
      .returns<ServiceRow[]>(),
    supabase
      .from("clients")
      .select("id, nome, telefone")
      .eq("tenant_id", ctx.tenant.id)
      .eq("ativo", true)
      .order("nome")
      .limit(500)
      .returns<Pick<ClientRow, "id" | "nome" | "telefone">[]>(),
    supabase
      .from("tenant_settings")
      .select("intervalo_agendamento_min, horario_funcionamento")
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle<{
        intervalo_agendamento_min: number;
        horario_funcionamento: HorarioSemana;
      }>(),
    supabase
      .from("appointments")
      .select(
        "*, cliente:clients(nome, telefone), servico:services(nome), comanda:comandas(id, status)",
      )
      .eq("tenant_id", ctx.tenant.id)
      .eq("data", dia)
      .order("hora_inicio"),
    supabase
      .from("ausencias")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("data", dia)
      .returns<AusenciaRow[]>(),
  ]);

  const agendamentos: AppointmentView[] = (rows ?? []).map(
    (r: Record<string, unknown>) => {
      const comandaEmbed = Array.isArray(r.comanda)
        ? (r.comanda[0] as { id: string; status: "aberta" | "fechada" } | undefined)
        : (r.comanda as { id: string; status: "aberta" | "fechada" } | null);
      return {
        ...(r as unknown as AppointmentView),
        hora_inicio: hhmm(r.hora_inicio as string),
        hora_fim: hhmm(r.hora_fim as string),
        cliente_nome:
          (r.cliente as { nome?: string } | null)?.nome ?? "Cliente removido",
        cliente_telefone:
          (r.cliente as { telefone?: string | null } | null)?.telefone ?? null,
        servico_nome: (r.servico as { nome?: string } | null)?.nome ?? null,
        comanda_id: comandaEmbed?.id ?? null,
        comanda_status: comandaEmbed?.status ?? null,
      };
    },
  );

  const podeComanda =
    ctx.isOwner ||
    podeAcessarSecao(ctx, "financeiro") ||
    ctx.professionalId != null;

  const passo = Math.min(
    Math.max(settings?.intervalo_agendamento_min ?? 30, 5),
    120,
  );
  const hj = horarioDoDia(settings?.horario_funcionamento, dia);

  // Slots do expediente do dia; se houver agendamento fora dessa janela (marcado
  // antes de o dia virar fechado, ou digitado à mão pelo dono), a grade se
  // estende pra ele não sumir.
  const horasAg = agendamentos
    .filter((a) => a.status !== "cancelado")
    .map((a) => a.hora_inicio);
  let inicio = hj?.abre ?? null;
  let fim = hj?.fecha ?? null;
  if (horasAg.length > 0) {
    const menor = horasAg.reduce((m, h) => (h < m ? h : m));
    const maior = horasAg.reduce((m, h) => (h > m ? h : m));
    inicio = inicio && inicio <= menor ? inicio : menor;
    const limite = addMinutos(maior, passo);
    fim = fim && fim >= limite ? fim : limite;
  }
  const slots = inicio && fim ? gerarSlots(inicio, fim, passo) : [];

  const todosProfissionais = profissionais ?? [];
  const colunas = soMinhaColuna
    ? todosProfissionais.filter((p) => p.id === vinculado)
    : todosProfissionais;
  const linkDia = (d: string) =>
    `/agenda?dia=${d}${verEquipe ? "&equipe=1" : ""}`;

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle={dataPorExtenso(dia)}
        action={
          <div className="flex items-center gap-2">
            {vinculado && podeEquipe && (
              <Link
                href={
                  verEquipe
                    ? `/agenda?dia=${dia}`
                    : `/agenda?dia=${dia}&equipe=1`
                }
                className="rounded-lg border border-border px-3 py-2 text-[13px] font-semibold text-text-soft hover:border-gold"
              >
                {verEquipe ? "Minha agenda" : "Ver equipe"}
              </Link>
            )}
            <Link
              href={linkDia(somarDias(dia, -1))}
              className="rounded-lg border border-border p-2 text-text-soft"
              aria-label="Dia anterior"
            >
              <ChevronLeft size={15} />
            </Link>
            <Link
              href={linkDia(hojeISO())}
              className="rounded-lg border border-border px-3 py-2 text-[13px] font-semibold text-text-soft"
            >
              Hoje
            </Link>
            <Link
              href={linkDia(somarDias(dia, 1))}
              className="rounded-lg border border-border p-2 text-text-soft"
              aria-label="Próximo dia"
            >
              <ChevronRight size={15} />
            </Link>
          </div>
        }
      />

      {ctx.isOwner && <AgendarLink slug={ctx.tenant.slug} />}

      <AgendaGrid
        dia={dia}
        slots={slots}
        fechado={!hj}
        passo={passo}
        profissionais={colunas}
        servicos={servicos ?? []}
        clientes={clientes ?? []}
        agendamentos={agendamentos}
        ausencias={ausencias ?? []}
        meuProfessionalId={ctx.professionalId}
        podeComanda={podeComanda}
      />
    </div>
  );
}
