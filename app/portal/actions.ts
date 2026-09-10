"use server";

import { createClient } from "@/lib/supabase/server";

export interface PortalAgendamento {
  data: string;
  hora_inicio: string;
  servico: string | null;
  profissional: string | null;
  status: string;
}

export interface PortalDados {
  negocio_nome: string;
  cliente_nome: string;
  proximos: PortalAgendamento[];
  historico: PortalAgendamento[];
}

export interface PortalState {
  erro?: string;
  dados?: PortalDados;
}

const MOTIVO: Record<string, string> = {
  telefone: "Digite um número de telefone válido.",
  negocio: "Não encontramos esse negócio.",
  cliente:
    "Não encontramos esse telefone no cadastro. Confirme o número com o estabelecimento.",
};

export async function portalLookupAction(
  _prev: PortalState,
  formData: FormData,
): Promise<PortalState> {
  const slug = String(formData.get("slug") ?? "");
  const telefone = String(formData.get("telefone") ?? "").trim();

  if (!slug) return { erro: "Link inválido." };
  if (telefone.replace(/\D/g, "").length < 8) {
    return { erro: MOTIVO.telefone };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_lookup", {
    p_slug: slug,
    p_telefone: telefone,
  });

  if (error || !data) {
    return { erro: "Não foi possível consultar agora. Tente de novo." };
  }
  if (!data.encontrado) {
    return { erro: MOTIVO[data.motivo as string] ?? "Nada encontrado." };
  }

  return { dados: data as PortalDados };
}
