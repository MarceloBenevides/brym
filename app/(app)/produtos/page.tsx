import type { Metadata } from "next";

import { PageHeader } from "@/components/app-shell/page-header";
import { RelatorioProdutosView } from "@/components/produtos/relatorio-produtos-view";
import { Tabs } from "@/components/ui/tabs";
import { requireSection } from "@/lib/guards";
import { RELATORIO_PRODUTOS_VAZIO, type RelatorioProdutos } from "@/lib/produto";
import { resolverPeriodo } from "@/lib/relatorio";
import { createClient } from "@/lib/supabase/server";
import type {
  EstoqueMovimentoRow,
  ProductCategoryRow,
  ProductRow,
  SupplierRow,
} from "@/types/database";
import { ProductsManager } from "./products-manager";

export const metadata: Metadata = { title: "Produtos" };

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{
    aba?: string;
    periodo?: string;
    de?: string;
    ate?: string;
  }>;
}) {
  await requireSection("produtos");
  const sp = await searchParams;
  const aba = sp.aba === "relatorio" ? "relatorio" : "catalogo";
  const supabase = await createClient();

  const tabs = (
    <Tabs
      active={aba}
      items={[
        { key: "catalogo", label: "Catálogo", href: "/produtos" },
        { key: "relatorio", label: "Relatório", href: "/produtos?aba=relatorio" },
      ]}
    />
  );

  if (aba === "relatorio") {
    const p = resolverPeriodo(sp.periodo, sp.de, sp.ate);
    const { data } = await supabase.rpc("relatorio_produtos", {
      p_de: p.de,
      p_ate: p.ate,
    });
    const dados = (data as RelatorioProdutos | null) ?? RELATORIO_PRODUTOS_VAZIO;

    return (
      <div>
        <PageHeader title="Produtos" subtitle={p.label} />
        {tabs}
        <RelatorioProdutosView
          dados={dados}
          periodoAtual={p.key}
          deAtual={p.de}
          ateAtual={p.ate}
        />
      </div>
    );
  }

  const [
    { data: categorias },
    { data: produtos },
    { data: movimentos },
    { data: fornecedores },
  ] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id, nome")
      .order("nome")
      .returns<Pick<ProductCategoryRow, "id" | "nome">[]>(),
    supabase
      .from("products")
      .select("*")
      .eq("ativo", true)
      .order("nome")
      .returns<ProductRow[]>(),
    supabase
      .from("estoque_movimentos")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(80)
      .returns<EstoqueMovimentoRow[]>(),
    supabase
      .from("suppliers")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome")
      .returns<Pick<SupplierRow, "id" | "nome">[]>(),
  ]);

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle={`${produtos?.length ?? 0} produtos · ${categorias?.length ?? 0} categorias`}
      />
      {tabs}
      <ProductsManager
        categorias={categorias ?? []}
        produtos={produtos ?? []}
        movimentos={movimentos ?? []}
        fornecedores={fornecedores ?? []}
      />
    </div>
  );
}
