"use client";

import { useActionState } from "react";

import { acceptInviteAction, type AcceptState } from "@/app/convite/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";

const INITIAL: AcceptState = {};

export function AcceptForm({
  token,
  email,
  nome,
  mode,
}: {
  token: string;
  email: string;
  nome: string;
  mode: "cadastro" | "finalizar";
}) {
  const [state, action] = useActionState(acceptInviteAction, INITIAL);

  if (state.notice) {
    return (
      <div className="rounded-xl border border-ink-line bg-ink-soft p-5 text-sm text-white">
        {state.notice}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="mode" value={mode} />

      <div>
        <span className="mb-1.5 block text-[12.5px] font-semibold text-text-faint">
          E-mail do convite
        </span>
        <div className="rounded-xl border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-text-faint">
          {email}
        </div>
      </div>

      {mode === "cadastro" && (
        <>
          <TextField
            dark
            label="Seu nome"
            name="nome"
            defaultValue={nome}
            required
            autoComplete="name"
          />
          <TextField
            dark
            label="Crie uma senha"
            name="senha"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            hint="Mínimo de 8 caracteres."
          />
          <TextField
            dark
            label="Confirme a senha"
            name="confirmar"
            type="password"
            required
            autoComplete="new-password"
          />
        </>
      )}

      {state.error && (
        <p className="text-[12.5px] text-garnet">{state.error}</p>
      )}

      <SubmitButton variant="gold" pendingLabel="Entrando…">
        {mode === "cadastro" ? "Criar conta e entrar" : "Entrar na equipe"}
      </SubmitButton>
    </form>
  );
}
