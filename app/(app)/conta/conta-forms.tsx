"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import {
  salvarDadosAction,
  salvarNegocioAction,
  trocarSenhaAction,
  type FormState,
} from "./actions";

const INITIAL: FormState = {};

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 font-display text-lg font-semibold text-text">
        {titulo}
      </h2>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Rodape({ state }: { state: FormState }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-40">
        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
      </div>
      {state.error && (
        <span className="text-[12.5px] text-garnet">{state.error}</span>
      )}
      {state.ok && (
        <span className="text-[12.5px] font-semibold text-forest">Salvo.</span>
      )}
    </div>
  );
}

export function NegocioForm({ nomeAtual }: { nomeAtual: string }) {
  const [state, action] = useActionState(salvarNegocioAction, INITIAL);
  return (
    <Secao titulo="Nome do negócio">
      <form action={action} className="space-y-4">
        <TextField name="nome" label="Nome" defaultValue={nomeAtual} required minLength={2} />
        <Rodape state={state} />
      </form>
    </Secao>
  );
}

export function DadosForm({
  nomeAtual,
  telefoneAtual,
}: {
  nomeAtual: string;
  telefoneAtual: string | null;
}) {
  const [state, action] = useActionState(salvarDadosAction, INITIAL);
  return (
    <Secao titulo="Meus dados">
      <form action={action} className="space-y-4">
        <TextField name="nome" label="Nome" defaultValue={nomeAtual} required minLength={2} />
        <TextField
          name="telefone"
          label="Telefone (opcional)"
          type="tel"
          inputMode="numeric"
          defaultValue={telefoneAtual ?? ""}
          placeholder="(11) 99999-9999"
        />
        <Rodape state={state} />
      </form>
    </Secao>
  );
}

export function SenhaForm() {
  const [state, action] = useActionState(trocarSenhaAction, INITIAL);
  return (
    <Secao titulo="Trocar senha">
      <form action={action} className="space-y-4" autoComplete="off">
        <TextField
          name="senhaAtual"
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          required
        />
        <TextField
          name="novaSenha"
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <TextField
          name="confirmarSenha"
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <Rodape state={state} />
      </form>
    </Secao>
  );
}
