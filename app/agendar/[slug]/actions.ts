"use server";

import { createClient } from "@/lib/supabase/server";

export interface Disponibilidade {
  ok: boolean;
  intervalo_min?: number;
  hoje?: string;
  agora_min?: number;
  abre?: string;
  fecha?: string;
  fechado?: boolean;
  ausente_dia?: boolean;
  ocupados?: { inicio: string; fim: string }[];
}

export async function buscarDisponibilidadeAction(
  slug: string,
  professionalId: string,
  data: string,
): Promise<Disponibilidade> {
  const supabase = await createClient();
  const { data: resultado, error } = await supabase.rpc(
    "agendar_disponibilidade",
    { p_slug: slug, p_professional_id: professionalId, p_data: data },
  );
  if (error || !resultado) return { ok: false };
  return resultado as Disponibilidade;
}

export interface ItemConfirmar {
  servico_id: string;
  professional_id: string;
  data: string;
  hora_inicio: string;
}

export interface AgendamentoCriado {
  servico_nome: string;
  profissional_nome: string;
  data: string;
  hora_inicio: string;
}

export interface ConfirmarResultado {
  ok: boolean;
  motivo?: string;
  item_index?: number;
  cliente_nome?: string;
  agendamentos?: AgendamentoCriado[];
}

export async function confirmarReservaAction(
  slug: string,
  nome: string,
  telefone: string,
  itens: ItemConfirmar[],
): Promise<ConfirmarResultado> {
  const supabase = await createClient();
  const { data: resultado, error } = await supabase.rpc("agendar_confirmar", {
    p_slug: slug,
    p_nome: nome,
    p_telefone: telefone,
    p_itens: itens,
  });
  if (error || !resultado) return { ok: false, motivo: "erro" };
  return resultado as ConfirmarResultado;
}
