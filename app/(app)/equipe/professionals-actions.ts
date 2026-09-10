"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOwner } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";

export interface ProfState {
  error?: string;
  ok?: boolean;
}

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do profissional."),
  cargo: z.string().trim().optional(),
  telefone: z.string().trim().optional(),
  recebe_comissao: z.boolean(),
  percentual_comissao: z.coerce
    .number()
    .min(0, "Percentual inválido.")
    .max(100, "Percentual não pode passar de 100.")
    .catch(0),
  mostrar_no_link_online: z.boolean(),
  user_id: z.uuid().nullable().catch(null),
});

export async function saveProfessionalAction(
  _prev: ProfState,
  formData: FormData,
): Promise<ProfState> {
  const ctx = await requireOwner();

  const rawUserId = formData.get("user_id");
  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    cargo: formData.get("cargo"),
    telefone: formData.get("telefone"),
    recebe_comissao: formData.get("recebe_comissao") === "on",
    percentual_comissao: formData.get("percentual_comissao"),
    mostrar_no_link_online: formData.get("mostrar_no_link_online") === "on",
    user_id: rawUserId === "" ? null : rawUserId,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();

  // Se vinculou a uma conta, ela precisa ser um funcionário deste negócio.
  if (parsed.data.user_id) {
    const { data: alvo } = await supabase
      .from("profiles")
      .select("papel")
      .eq("id", parsed.data.user_id)
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle<{ papel: string }>();
    if (!alvo || alvo.papel !== "employee") {
      return { error: "Conta de acesso inválida." };
    }
  }

  const id = formData.get("id");
  const payload = {
    tenant_id: ctx.tenant.id,
    nome: parsed.data.nome,
    cargo: parsed.data.cargo || null,
    telefone: parsed.data.telefone || null,
    recebe_comissao: parsed.data.recebe_comissao,
    percentual_comissao: parsed.data.recebe_comissao
      ? parsed.data.percentual_comissao
      : 0,
    mostrar_no_link_online: parsed.data.mostrar_no_link_online,
    user_id: parsed.data.user_id,
  };

  const { data: salvo, error } =
    typeof id === "string" && id
      ? await supabase
          .from("professionals")
          .update(payload)
          .eq("id", id)
          .select("id")
          .single()
      : await supabase.from("professionals").insert(payload).select("id").single();

  if (error || !salvo) {
    if (error?.code === "23505") {
      return { error: "Essa conta de acesso já está vinculada a outro profissional." };
    }
    return { error: "Não foi possível salvar o profissional." };
  }

  // foto: um novo arquivo tem prioridade sobre "remover foto"
  const fotoPath = `${ctx.tenant.id}/${salvo.id}`;
  const foto = formData.get("foto");
  if (foto instanceof File && foto.size > 0) {
    if (foto.size > 5 * 1024 * 1024) {
      return { error: "A foto precisa ter no máximo 5MB." };
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(foto.type)) {
      return { error: "Envie uma foto em JPEG, PNG ou WEBP." };
    }
    const { error: eUpload } = await supabase.storage
      .from("fotos-profissionais")
      .upload(fotoPath, foto, { upsert: true, contentType: foto.type });
    if (eUpload) {
      return { error: "Não foi possível enviar a foto." };
    }
    const { data: pub } = supabase.storage
      .from("fotos-profissionais")
      .getPublicUrl(fotoPath);
    await supabase
      .from("professionals")
      .update({ foto_url: `${pub.publicUrl}?v=${Date.now()}` })
      .eq("id", salvo.id);
  } else if (formData.get("remover_foto") === "1") {
    await supabase.storage.from("fotos-profissionais").remove([fotoPath]);
    await supabase.from("professionals").update({ foto_url: null }).eq("id", salvo.id);
  }

  // sincroniza os serviços que este profissional faz (usado no link público)
  const servicosIds = formData
    .getAll("servicos")
    .map(String)
    .filter((v) => z.uuid().safeParse(v).success);
  await supabase.from("professional_services").delete().eq("professional_id", salvo.id);
  if (servicosIds.length > 0) {
    await supabase.from("professional_services").insert(
      servicosIds.map((service_id) => ({
        tenant_id: ctx.tenant.id,
        professional_id: salvo.id,
        service_id,
      })),
    );
  }

  revalidatePath("/equipe");
  return { ok: true };
}

export async function toggleProfessionalAction(formData: FormData) {
  await requireOwner();
  const id = formData.get("id");
  const ativo = formData.get("ativo") === "true";
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("professionals").update({ ativo: !ativo }).eq("id", id);
  revalidatePath("/equipe");
}
