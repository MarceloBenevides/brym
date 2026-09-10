import type { Metadata } from "next";

import { requireComanda } from "@/lib/guards";
import { podeAcessarSecao } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type {
  ComandaItemRow,
  PaymentRow,
  ProductRow,
  ServiceRow,
} from "@/types/database";
import { ComandaDetail } from "@/components/financeiro/comanda-detail";

export const metadata: Metadata = { title: "Comanda" };

export default async function ComandaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, comanda } = await requireComanda(id);
  const supabase = await createClient();

  const [
    { data: itens },
    { data: pagamentos },
    { data: cliente },
    { data: ag },
    { data: servicos },
    { data: produtos },
  ] =
    await Promise.all([
      supabase
        .from("comanda_items")
        .select("*")
        .eq("comanda_id", id)
        .order("criado_em")
        .returns<ComandaItemRow[]>(),
      supabase
        .from("payments")
        .select("*")
        .eq("comanda_id", id)
        .order("criado_em")
        .returns<PaymentRow[]>(),
      comanda.client_id
        ? supabase
            .from("clients")
            .select("nome, saldo_credito")
            .eq("id", comanda.client_id)
            .maybeSingle<{ nome: string; saldo_credito: number }>()
        : Promise.resolve({ data: null }),
      comanda.appointment_id
        ? supabase
            .from("appointments")
            .select("data, hora_inicio, servico:services(nome), profissional:professionals(nome)")
            .eq("id", comanda.appointment_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("services")
        .select("id, nome, preco")
        .eq("tenant_id", ctx.tenant.id)
        .eq("ativo", true)
        .order("nome")
        .returns<Pick<ServiceRow, "id" | "nome" | "preco">[]>(),
      supabase
        .from("products")
        .select("id, nome, preco, controla_estoque, estoque_atual")
        .eq("tenant_id", ctx.tenant.id)
        .eq("ativo", true)
        .order("nome")
        .returns<
          Pick<
            ProductRow,
            "id" | "nome" | "preco" | "controla_estoque" | "estoque_atual"
          >[]
        >(),
    ]);

  const agRow = ag as
    | { data: string; hora_inicio: string; servico: { nome: string } | null; profissional: { nome: string } | null }
    | null;

  const avulsa = comanda.appointment_id === null;

  return (
    <ComandaDetail
      comanda={comanda}
      itens={itens ?? []}
      pagamentos={pagamentos ?? []}
      clienteNome={cliente?.nome ?? null}
      clienteSaldo={cliente?.saldo_credito ?? 0}
      agendamento={
        avulsa
          ? null
          : {
              data: agRow?.data ?? "",
              hora: agRow?.hora_inicio?.slice(0, 5) ?? "",
              profissional: agRow?.profissional?.nome ?? null,
            }
      }
      avulsa={avulsa}
      servicos={servicos ?? []}
      produtos={produtos ?? []}
      podeFinanceiro={ctx.isOwner || podeAcessarSecao(ctx, "financeiro")}
    />
  );
}
