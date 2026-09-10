"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOwner } from "@/lib/guards";
import { INTERVALOS_AGENDAMENTO, MENSAGEM_MAX } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  ok?: boolean;
}

const mensagem = z.preprocess(
  (v) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  },
  z.string().max(MENSAGEM_MAX, `Máximo de ${MENSAGEM_MAX} caracteres.`).nullable(),
);

const ddi = z.preprocess(
  (v) => String(v ?? "").replace(/\D/g, "").slice(0, 4) || "55",
  z.string().min(1).max(4),
);

const dias = z.coerce.number().int().min(1, "Mínimo de 1 dia.").max(3650, "Máximo de 3650 dias.");

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIAS_LABEL = [
  "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado",
];

const horarioFuncionamento = z
  .record(
    z.string(),
    z
      .object({ abre: z.string().regex(HORA_RE), fecha: z.string().regex(HORA_RE) })
      .nullable(),
  )
  .superRefine((mapa, ctx) => {
    for (let d = 0; d < 7; d++) {
      const dia = mapa[String(d)];
      if (dia && dia.abre >= dia.fecha) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `No ${DIAS_LABEL[d]}, o horário de abertura precisa ser antes do de fechamento.`,
        });
      }
    }
  });

function lerHorarioFuncionamento(formData: FormData): Record<
  string,
  { abre: string; fecha: string } | null
> {
  const mapa: Record<string, { abre: string; fecha: string } | null> = {};
  for (let d = 0; d < 7; d++) {
    if (formData.get(`hf_${d}_aberto`) !== "on") {
      mapa[String(d)] = null;
      continue;
    }
    mapa[String(d)] = {
      abre: String(formData.get(`hf_${d}_abre`) ?? "08:00"),
      fecha: String(formData.get(`hf_${d}_fecha`) ?? "20:00"),
    };
  }
  return mapa;
}

const schema = z
  .object({
    intervalo_agendamento_min: z.coerce
      .number()
      .int()
      .refine((n) => (INTERVALOS_AGENDAMENTO as readonly number[]).includes(n), {
        message: "Intervalo inválido.",
      }),
    horario_funcionamento: horarioFuncionamento,
    ddi,
    permitir_cliente_mesmo_telefone: z.boolean(),
    habilitar_estoque: z.boolean(),
    habilitar_fornecedores: z.boolean(),
    habilitar_pacotes: z.boolean(),
    exibir_comandas_pendentes: z.boolean(),
    controlar_dinheiro_caixa: z.boolean(),
    mensagem_confirmacao: mensagem,
    mensagem_aniversario: mensagem,
    crm_dias_ativo: dias,
    crm_dias_atencao: dias,
    crm_dias_inativo: dias,
    mensagem_recuperacao: mensagem,
  })
  .refine(
    (d) => d.crm_dias_ativo < d.crm_dias_atencao && d.crm_dias_atencao < d.crm_dias_inativo,
    {
      message:
        "Os dias do CRM precisam ser crescentes: Ativo < Em atenção < Inativo.",
      path: ["crm_dias_atencao"],
    },
  );

export async function saveSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOwner();

  const on = (name: string) => formData.get(name) === "on";
  const parsed = schema.safeParse({
    intervalo_agendamento_min: formData.get("intervalo_agendamento_min"),
    horario_funcionamento: lerHorarioFuncionamento(formData),
    ddi: formData.get("ddi"),
    permitir_cliente_mesmo_telefone: on("permitir_cliente_mesmo_telefone"),
    habilitar_estoque: on("habilitar_estoque"),
    habilitar_fornecedores: on("habilitar_fornecedores"),
    habilitar_pacotes: on("habilitar_pacotes"),
    exibir_comandas_pendentes: on("exibir_comandas_pendentes"),
    controlar_dinheiro_caixa: on("controlar_dinheiro_caixa"),
    mensagem_confirmacao: formData.get("mensagem_confirmacao"),
    mensagem_aniversario: formData.get("mensagem_aniversario"),
    crm_dias_ativo: formData.get("crm_dias_ativo"),
    crm_dias_atencao: formData.get("crm_dias_atencao"),
    crm_dias_inativo: formData.get("crm_dias_inativo"),
    mensagem_recuperacao: formData.get("mensagem_recuperacao"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenant_settings")
    .update(parsed.data)
    .eq("tenant_id", ctx.tenant.id);
  if (error) {
    return { error: "Não foi possível salvar as configurações." };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
  revalidatePath("/crm");
  revalidatePath("/", "layout");
  return { ok: true };
}
