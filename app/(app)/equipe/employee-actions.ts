"use server";

import { revalidatePath } from "next/cache";

import { requireOwner } from "@/lib/guards";
import { sanitizarPermissoes } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export interface EmployeeState {
  error?: string;
  ok?: boolean;
}

export async function updateEmployeePermissionsAction(
  _prev: EmployeeState,
  formData: FormData,
): Promise<EmployeeState> {
  await requireOwner();

  const profileId = formData.get("profile_id");
  if (typeof profileId !== "string" || !profileId) {
    return { error: "Funcionário inválido." };
  }

  const permissoes = sanitizarPermissoes(formData.getAll("permissoes"));

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_employee_permissions", {
    p_profile_id: profileId,
    p_permissoes: permissoes,
  });

  if (error) {
    return { error: "Não foi possível salvar as permissões." };
  }

  revalidatePath("/equipe");
  return { ok: true };
}
