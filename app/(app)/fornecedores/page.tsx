import type { Metadata } from "next";

import { PageHeader } from "@/components/app-shell/page-header";
import { requireSection } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";
import type { SupplierRow } from "@/types/database";
import { SuppliersManager } from "./suppliers-manager";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function FornecedoresPage() {
  await requireSection("fornecedores");
  const supabase = await createClient();

  const { data: fornecedores } = await supabase
    .from("suppliers")
    .select("*")
    .eq("ativo", true)
    .order("nome")
    .returns<SupplierRow[]>();

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle={`${fornecedores?.length ?? 0} fornecedores`}
      />
      <SuppliersManager fornecedores={fornecedores ?? []} />
    </div>
  );
}
