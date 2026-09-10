"use client";

import { useActionState, useEffect, useState } from "react";

import {
  updateEmployeePermissionsAction,
  type EmployeeState,
} from "@/app/(app)/equipe/employee-actions";
import { PermissionsCheckboxes } from "@/components/equipe/permissions-checkboxes";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";

const INITIAL: EmployeeState = {};

export function EditPermissionsButton({
  profileId,
  nome,
  permissoes,
}: {
  profileId: string;
  nome: string;
  permissoes: string[];
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-text-soft hover:border-gold"
      >
        Permissões
      </button>
      {aberto && (
        <PermissionsModal
          profileId={profileId}
          nome={nome}
          permissoes={permissoes}
          onClose={() => setAberto(false)}
        />
      )}
    </>
  );
}

function PermissionsModal({
  profileId,
  nome,
  permissoes,
  onClose,
}: {
  profileId: string;
  nome: string;
  permissoes: string[];
  onClose: () => void;
}) {
  const [state, action] = useActionState(
    updateEmployeePermissionsAction,
    INITIAL,
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal title={`Permissões · ${nome}`} onClose={onClose}>
      <form action={action} className="space-y-4">
        <input type="hidden" name="profile_id" value={profileId} />
        <PermissionsCheckboxes selecionadas={permissoes} />
        {state.error && (
          <p className="text-[12.5px] text-garnet">{state.error}</p>
        )}
        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
      </form>
    </Modal>
  );
}
