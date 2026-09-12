import type { Metadata } from "next";

import { PageHeader } from "@/components/app-shell/page-header";
import { requireApp } from "@/lib/guards";
import { DadosForm, NegocioForm, SenhaForm } from "./conta-forms";

export const metadata: Metadata = { title: "Minha conta" };
export const dynamic = "force-dynamic";

export default async function ContaPage() {
  const ctx = await requireApp();

  return (
    <div>
      <PageHeader title="Minha conta" subtitle="Seus dados de acesso ao BRYM" />
      <div className="mt-6 max-w-lg space-y-6">
        {ctx.isOwner && <NegocioForm nomeAtual={ctx.tenant.nome} />}
        <DadosForm
          nomeAtual={ctx.profile.nome}
          telefoneAtual={ctx.profile.telefone}
        />
        <SenhaForm />
      </div>
    </div>
  );
}
