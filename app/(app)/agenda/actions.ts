"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApp } from "@/lib/guards";
import { addMinutos, agoraNoFuso, horaEmMinutos } from "@/lib/agenda";
import { createClient } from "@/lib/supabase/server";
import type { StatusAgendamento } from "@/types/database";

export interface AgendaState {
  error?: string;
  ok?: boolean;
}

const schema = z.object({
  professional_id: z.uuid("Escolha o profissional."),
  service_id: z.uuid("Escolha o serviço."),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
  observacoes: z.string().trim().optional(),
});

export async function saveAppointmentAction(
  _prev: AgendaState,
  formData: FormData,
): Promise<AgendaState> {
  const supabase = await createClient();

  const parsed = schema.safeParse({
    professional_id: formData.get("professional_id"),
    service_id: formData.get("service_id"),
    data: formData.get("data"),
    hora_inicio: formData.get("hora_inicio"),
    observacoes: formData.get("observacoes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // A duração do serviço só depende do `service_id` já validado acima — não
  // precisa esperar o `requireApp()` terminar pra ser buscada. 1 round-trip
  // a menos numa ação bem clicada (salvar agendamento).
  const [ctx, { data: servico }] = await Promise.all([
    requireApp(),
    supabase
      .from("services")
      .select("duracao_min")
      .eq("id", parsed.data.service_id)
      .single(),
  ]);

  const supabaseId = formData.get("id");
  const editandoId =
    typeof supabaseId === "string" && supabaseId ? supabaseId : null;

  // não deixa marcar (nem mover para) um horário que já passou
  {
    const agora = agoraNoFuso();
    const noPassado =
      parsed.data.data < agora.dataISO ||
      (parsed.data.data === agora.dataISO &&
        horaEmMinutos(parsed.data.hora_inicio) < agora.minutos);

    if (noPassado) {
      let mudouHorario = true;
      if (editandoId) {
        const { data: atual } = await supabase
          .from("appointments")
          .select("data, hora_inicio")
          .eq("id", editandoId)
          .maybeSingle<{ data: string; hora_inicio: string }>();
        mudouHorario =
          !atual ||
          atual.data !== parsed.data.data ||
          atual.hora_inicio.slice(0, 5) !== parsed.data.hora_inicio;
      }
      if (mudouHorario) {
        return { error: "Não dá para agendar num horário que já passou." };
      }
    }
  }

  // cliente: existente ou novo
  let clientId = String(formData.get("client_id") ?? "");
  const novoNome = String(formData.get("novo_cliente_nome") ?? "").trim();

  // profissional vinculado (barbeiro) não cadastra cliente novo
  if (ctx.professionalId && !clientId) {
    return {
      error:
        "Selecione um cliente da lista. Cadastro de cliente novo é feito pela recepção.",
    };
  }

  if (!clientId && novoNome.length >= 2) {
    const { data: novo, error: eCli } = await supabase
      .from("clients")
      .insert({
        tenant_id: ctx.tenant.id,
        nome: novoNome,
        telefone: String(formData.get("novo_cliente_telefone") ?? "").trim() || null,
      })
      .select("id")
      .single();
    if (eCli) {
      return {
        error:
          eCli.code === "23505"
            ? "Já existe um cliente com esse telefone. Busque pelo nome."
            : "Não foi possível cadastrar o cliente.",
      };
    }
    clientId = novo.id as string;
  }

  if (!clientId) return { error: "Escolha um cliente ou cadastre um novo." };

  // duração do serviço (buscada em paralelo com requireApp() lá em cima) → hora_fim
  const duracao = (servico?.duracao_min as number | undefined) ?? 30;
  const horaFim = addMinutos(parsed.data.hora_inicio, duracao);

  const payload = {
    tenant_id: ctx.tenant.id,
    client_id: clientId,
    professional_id: parsed.data.professional_id,
    service_id: parsed.data.service_id,
    data: parsed.data.data,
    hora_inicio: parsed.data.hora_inicio,
    hora_fim: horaFim,
    observacoes: parsed.data.observacoes || null,
  };

  const { error } = editandoId
    ? await supabase.from("appointments").update(payload).eq("id", editandoId)
    : await supabase.from("appointments").insert(payload);

  if (error) {
    if (error.code === "23P01") {
      return { error: "Esse profissional já tem agendamento nesse horário." };
    }
    return { error: "Não foi possível salvar o agendamento." };
  }

  revalidatePath("/agenda");
  return { ok: true };
}

const STATUS_VALIDOS: StatusAgendamento[] = [
  "confirmado",
  "concluido",
  "cancelado",
  "nao_compareceu",
];

export async function setAppointmentStatusAction(formData: FormData) {
  await requireApp();
  const id = formData.get("id");
  const status = String(formData.get("status") ?? "");
  if (typeof id !== "string" || !STATUS_VALIDOS.includes(status as StatusAgendamento)) {
    return;
  }

  const supabase = await createClient();
  await supabase.from("appointments").update({ status }).eq("id", id);
  revalidatePath("/agenda");
}
