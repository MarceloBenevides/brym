import type { Metadata } from "next";

import { PageHeader } from "@/components/app-shell/page-header";
import { requireOwner } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";
import type { TenantSettingsRow } from "@/types/database";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const ctx = await requireOwner();

  let settings = ctx.settings;
  if (!settings) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("tenant_settings")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle<TenantSettingsRow>();
    settings = data ?? null;
  }

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Preferências do negócio" />
      {settings ? (
        <SettingsForm settings={settings} plano={ctx.tenant.plano} />
      ) : (
        <p className="text-[13.5px] text-text-soft">
          Não foi possível carregar as preferências. Recarregue a página.
        </p>
      )}
    </div>
  );
}
