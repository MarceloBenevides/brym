"use client";

import { useActionState } from "react";

import { createTenantAction, type AuthState } from "@/app/auth/actions";
import { SegmentPicker } from "@/components/onboarding/segment-picker";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import type { Segmento } from "@/types/database";

const INITIAL: AuthState = {};

export function OnboardingForm({
  defaultNegocio,
  defaultSegmento,
}: {
  defaultNegocio: string;
  defaultSegmento: Segmento | null;
}) {
  const [state, action] = useActionState(createTenantAction, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <TextField
        dark
        label="Nome do negócio"
        name="negocio"
        required
        defaultValue={defaultNegocio}
        placeholder="Ex.: Studio Alfa"
      />
      <TextField
        dark
        label="Telefone (opcional)"
        name="telefone"
        type="tel"
        autoComplete="tel"
        placeholder="(00) 00000-0000"
      />

      <div>
        <span className="mb-1.5 block text-[12.5px] font-semibold text-text-faint">
          Tipo de negócio
        </span>
        <SegmentPicker dark defaultValue={defaultSegmento} />
      </div>

      {state.error && (
        <p className="text-[12.5px] text-garnet">{state.error}</p>
      )}

      <SubmitButton variant="gold" pendingLabel="Preparando seu painel…">
        Criar meu negócio
      </SubmitButton>
    </form>
  );
}
