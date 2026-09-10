import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth";
import { isSegmento } from "@/lib/segments";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Configurar negócio" };

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (ctx.tenant) redirect("/agenda");
  // Admin da plataforma sem negócio próprio não precisa criar um.
  if (ctx.profile?.plataforma_admin) redirect("/admin");

  // Foi convidado como funcionário? Vai para o aceite, não para "criar negócio".
  const supabase = await createClient();
  const { data: token } = await supabase.rpc("my_pending_invitation");
  if (typeof token === "string" && token) redirect(`/convite/${token}`);

  const meta = ctx.claims.user_metadata ?? {};
  const defaultNegocio =
    typeof meta.negocio_nome === "string" ? meta.negocio_nome : "";
  const defaultSegmento = isSegmento(meta.segmento) ? meta.segmento : null;

  return (
    <div className="w-full max-w-lg">
      <h1 className="font-display text-2xl font-semibold text-white">
        Vamos criar seu negócio
      </h1>
      <p className="mt-1.5 mb-7 text-[13.5px] text-text-faint">
        Confirme os dados abaixo. Você pode ajustar tudo depois em Configurações.
      </p>
      <OnboardingForm
        defaultNegocio={defaultNegocio}
        defaultSegmento={defaultSegmento}
      />
    </div>
  );
}
