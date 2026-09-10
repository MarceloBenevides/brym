import type { Metadata } from "next";

import { PageHeader } from "@/components/app-shell/page-header";
import { ImportarExportar } from "@/components/clientes/importar-exportar";
import { PortalLink } from "@/components/clientes/portal-link";
import { podeGerenciarClientes, requireApp } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";
import type { ClientRow } from "@/types/database";
import { ClientsManager } from "./clients-manager";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireApp();
  // a RLS já restringe a lista (barbeiro vê só os clientes que atendeu);
  // gerência de cadastro é só do dono / recepção (sem vínculo de profissional)
  const podeEditar = podeGerenciarClientes(ctx);

  const { q } = await searchParams;
  const busca = (q ?? "").trim();

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true })
    .limit(200);

  if (busca) {
    // remove caracteres que quebram a sintaxe do filtro PostgREST
    const termo = busca.replace(/[,()"*%]/g, " ").trim();
    if (termo) {
      const like = `%${termo}%`;
      query = query.or(
        `nome.ilike.${like},telefone.ilike.${like},email.ilike.${like}`,
      );
    }
  }

  const { data: clientes } = await query.returns<ClientRow[]>();

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={
          busca
            ? `${clientes?.length ?? 0} resultado(s) para "${busca}"`
            : `${clientes?.length ?? 0} clientes`
        }
      />
      {ctx.isOwner && <PortalLink slug={ctx.tenant.slug} />}
      {ctx.isOwner && (
        <div className="mb-5">
          <ImportarExportar />
        </div>
      )}
      <ClientsManager
        clientes={clientes ?? []}
        podeEditar={podeEditar}
      />
    </div>
  );
}
