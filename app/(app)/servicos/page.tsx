import type { Metadata } from "next";

import { PageHeader } from "@/components/app-shell/page-header";
import { requireSection } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";
import type { ServiceCategoryRow, ServiceRow } from "@/types/database";
import { ServicesManager } from "./services-manager";

export const metadata: Metadata = { title: "Serviços" };

export default async function ServicosPage() {
  await requireSection("servicos");
  const supabase = await createClient();

  const [{ data: categorias }, { data: servicos }] = await Promise.all([
    supabase
      .from("service_categories")
      .select("id, nome")
      .order("nome")
      .returns<Pick<ServiceCategoryRow, "id" | "nome">[]>(),
    supabase
      .from("services")
      .select("*")
      .eq("ativo", true)
      .order("nome")
      .returns<ServiceRow[]>(),
  ]);

  return (
    <div>
      <PageHeader
        title="Serviços"
        subtitle={`${servicos?.length ?? 0} serviços · ${categorias?.length ?? 0} categorias`}
      />
      <ServicesManager
        categorias={categorias ?? []}
        servicos={servicos ?? []}
      />
    </div>
  );
}
