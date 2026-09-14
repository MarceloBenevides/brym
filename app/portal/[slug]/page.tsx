import type { Metadata } from "next";

import { BrymFooter } from "@/components/brand/brym-footer";
import { GoldStripe } from "@/components/brand/gold-stripe";
import { Logo } from "@/components/brand/logo";
import { NegocioHeader } from "@/components/brand/negocio-header";
import { createClient } from "@/lib/supabase/server";
import { PortalForm } from "./portal-form";

export const metadata: Metadata = { title: "Meus agendamentos" };

export const dynamic = "force-dynamic";

interface NegocioInfo {
  nome: string;
  logo_url: string | null;
}

export default async function PortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("portal_tenant_nome", { p_slug: slug });
  const negocio = data as NegocioInfo | null;

  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <GoldStripe />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-12">
        {!negocio?.nome ? (
          <>
            <Logo dark />
            <div className="flex flex-1 flex-col justify-center py-10">
              <h1 className="font-display text-2xl font-semibold text-white">
                Negócio não encontrado
              </h1>
              <p className="mt-2 text-[13.5px] text-text-faint">
                Confira o link que você recebeu do estabelecimento.
              </p>
            </div>
          </>
        ) : (
          <>
            <NegocioHeader nome={negocio.nome} logoUrl={negocio.logo_url} />
            <div className="flex flex-1 flex-col justify-center py-10">
              <h1 className="font-display text-2xl font-semibold text-white">
                Meus agendamentos
              </h1>
              <p className="mt-1.5 mb-7 text-[13.5px] text-text-faint">
                {negocio.nome} · digite seu telefone para ver seus horários e
                o histórico.
              </p>
              <PortalForm slug={slug} />
            </div>
          </>
        )}
        <BrymFooter />
      </div>
    </div>
  );
}
