"use client";

import { useActionState, useEffect, useRef } from "react";

import { createInviteAction, type InviteState } from "@/app/(app)/equipe/actions";
import { PermissionsCheckboxes } from "@/components/equipe/permissions-checkboxes";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { PERMISSOES_PADRAO } from "@/lib/permissions";

const INITIAL: InviteState = {};

export function InviteForm() {
  const [state, action] = useActionState(createInviteAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Nome do funcionário"
          name="nome"
          required
          placeholder="Ex.: Renato Alves"
        />
        <TextField
          label="E-mail"
          name="email"
          type="email"
          required
          placeholder="renato@email.com"
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold text-text-soft">
          O que ele pode acessar
        </legend>
        <PermissionsCheckboxes selecionadas={PERMISSOES_PADRAO} />
      </fieldset>

      <label className="flex items-center gap-2 text-[13px] text-text">
        <input
          type="checkbox"
          name="criar_profissional"
          defaultChecked
          className="h-4 w-4 rounded border-border accent-[var(--color-gold-deep)]"
        />
        Cadastrar também como profissional que atende
      </label>

      {state.error && (
        <p className="text-[12.5px] text-garnet">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-[12.5px] text-forest">
          Convite criado. Copie o link abaixo e envie para o funcionário.
        </p>
      )}

      <SubmitButton pendingLabel="Criando convite…">
        Criar convite
      </SubmitButton>
    </form>
  );
}
