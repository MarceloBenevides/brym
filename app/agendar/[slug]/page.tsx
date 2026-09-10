import type { Metadata } from "next";

import { GoldStripe } from "@/components/brand/gold-stripe";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import { AgendarWizard, type Catalogo } from "./agendar-wizard";

export const metadata: Metadata = { title: "Agendar horário" };

export const dynamic = "force-dynamic";

export default async function AgendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("agendar_catalogo", { p_slug: slug });
  const catalogo = data as Catalogo | null;

  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <GoldStripe />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10">
        <Logo dark />
        {!catalogo?.encontrado ? (
          <div className="flex flex-1 flex-col justify-center py-10">
            <h1 className="font-display text-2xl font-semibold text-white">
              Negócio não encontrado
            </h1>
            <p className="mt-2 text-[13.5px] text-text-faint">
              Confira o link que você recebeu do estabelecimento.
            </p>
          </div>
        ) : (
          <AgendarWizard slug={slug} catalogo={catalogo} />
        )}
      </div>
    </div>
  );
}
