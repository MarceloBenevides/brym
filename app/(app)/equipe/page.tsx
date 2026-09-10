import type { Metadata } from "next";

import { PageHeader } from "@/components/app-shell/page-header";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Tabs } from "@/components/ui/tabs";
import { EditPermissionsButton } from "@/components/equipe/edit-permissions";
import { InviteForm } from "@/components/equipe/invite-form";
import {
  PendingInvites,
  type PendingInvite,
} from "@/components/equipe/pending-invites";
import {
  ProfessionalsSection,
  type FuncionarioVinculavel,
} from "@/components/equipe/professionals-section";
import { requireOwner } from "@/lib/guards";
import { resumoPermissoes } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { hojeISO, somarDias } from "@/lib/agenda";
import type {
  AusenciaRow,
  ProfessionalRow,
  ProfessionalServiceRow,
  ProfileRow,
  ServiceRow,
} from "@/types/database";

export const metadata: Metadata = { title: "Equipe" };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba } = await searchParams;
  const abaAtiva = aba === "profissionais" ? "profissionais" : "acesso";
  const ctx = await requireOwner();
  const supabase = await createClient();

  return (
    <div>
      <PageHeader
        title="Equipe"
        subtitle="Acesso ao sistema e profissionais que atendem"
      />
      <Tabs
        active={abaAtiva}
        items={[
          { key: "acesso", label: "Acesso ao sistema", href: "/equipe" },
          {
            key: "profissionais",
            label: "Profissionais",
            href: "/equipe?aba=profissionais",
          },
        ]}
      />

      {abaAtiva === "acesso" ? (
        <AcessoSection tenantId={ctx.tenant.id} supabase={supabase} />
      ) : (
        <ProfissionaisTab tenantId={ctx.tenant.id} supabase={supabase} />
      )}
    </div>
  );
}

type SB = Awaited<ReturnType<typeof createClient>>;

async function AcessoSection({
  tenantId,
  supabase,
}: {
  tenantId: string;
  supabase: SB;
}) {
  const [{ data: membros }, { data: convites }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nome, email, papel, permissoes, ativo")
      .eq("tenant_id", tenantId)
      .order("papel", { ascending: true })
      .order("nome", { ascending: true })
      .returns<ProfileRow[]>(),
    supabase
      .from("invitations")
      .select("id, nome, email, token, permissoes, expira_em")
      .eq("status", "pendente")
      .order("criado_em", { ascending: false })
      .returns<PendingInvite[]>(),
  ]);

  return (
    <>
      <Card className="mb-6">
        {(membros ?? []).map((m, i) => (
          <div
            key={m.id}
            className="flex items-center justify-between px-5 py-4"
            style={{
              borderBottom:
                i < (membros?.length ?? 0) - 1
                  ? "1px solid var(--color-border)"
                  : undefined,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fbf1dc] text-[13px] font-semibold text-gold-deep">
                {initials(m.nome || m.email || "?")}
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-text">
                  {m.nome || m.email}
                </div>
                <div className="text-[12px] text-text-faint">
                  {m.papel === "owner"
                    ? "Dono · acesso total"
                    : resumoPermissoes(m.permissoes)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {m.papel === "employee" && (
                <EditPermissionsButton
                  profileId={m.id}
                  nome={m.nome || m.email || "funcionário"}
                  permissoes={m.permissoes}
                />
              )}
              <Pill tone={m.papel === "owner" ? "gold" : "forest"}>
                {m.papel === "owner" ? "Dono" : "Funcionário"}
              </Pill>
            </div>
          </div>
        ))}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-text">
            Convidar funcionário
          </h2>
          <InviteForm />
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="font-display text-lg font-semibold text-text">
              Convites pendentes
            </h2>
          </div>
          <PendingInvites invites={convites ?? []} />
        </Card>
      </div>
    </>
  );
}

async function ProfissionaisTab({
  tenantId,
  supabase,
}: {
  tenantId: string;
  supabase: SB;
}) {
  const desde = somarDias(hojeISO(), -7);
  const [
    { data: profissionais },
    { data: employees },
    { data: servicos },
    { data: vinculos },
    { data: ausencias },
  ] = await Promise.all([
    supabase
      .from("professionals")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("ativo", { ascending: false })
      .order("nome", { ascending: true })
      .returns<ProfessionalRow[]>(),
    supabase
      .from("profiles")
      .select("id, nome, email")
      .eq("tenant_id", tenantId)
      .eq("papel", "employee")
      .order("nome")
      .returns<Pick<ProfileRow, "id" | "nome" | "email">[]>(),
    supabase
      .from("services")
      .select("id, nome")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .order("nome")
      .returns<Pick<ServiceRow, "id" | "nome">[]>(),
    supabase
      .from("professional_services")
      .select("professional_id, service_id")
      .eq("tenant_id", tenantId)
      .returns<Pick<ProfessionalServiceRow, "professional_id" | "service_id">[]>(),
    supabase
      .from("ausencias")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("data", desde)
      .order("data", { ascending: true })
      .returns<AusenciaRow[]>(),
  ]);

  const ausenciasPorProf: Record<string, AusenciaRow[]> = {};
  for (const a of ausencias ?? []) {
    (ausenciasPorProf[a.professional_id] ??= []).push(a);
  }

  const servicosPorProf: Record<string, string[]> = {};
  for (const v of vinculos ?? []) {
    (servicosPorProf[v.professional_id] ??= []).push(v.service_id);
  }

  const vinculoPorUser = new Map<string, string>();
  for (const p of profissionais ?? []) {
    if (p.user_id) vinculoPorUser.set(p.user_id, p.id);
  }

  const funcionarios: FuncionarioVinculavel[] = (employees ?? []).map((e) => ({
    id: e.id,
    nome: e.nome || e.email || "funcionário",
    email: e.email,
    professionalId: vinculoPorUser.get(e.id) ?? null,
  }));

  return (
    <ProfessionalsSection
      profissionais={profissionais ?? []}
      funcionarios={funcionarios}
      servicos={servicos ?? []}
      servicosPorProf={servicosPorProf}
      ausenciasPorProf={ausenciasPorProf}
    />
  );
}
