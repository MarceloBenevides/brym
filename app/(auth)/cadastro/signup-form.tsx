"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpAction, type AuthState } from "@/app/auth/actions";
import { SegmentPicker } from "@/components/onboarding/segment-picker";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";

const INITIAL: AuthState = {};

export function SignupForm() {
  const [state, action] = useActionState(signUpAction, INITIAL);

  if (state.notice) {
    return (
      <div className="rounded-xl border border-ink-line bg-ink-soft p-5">
        <p className="text-sm text-white">{state.notice}</p>
        <p className="mt-2 text-[12.5px] text-text-faint">
          Depois de confirmar, você volta para escolher o segmento e finalizar o
          cadastro do negócio.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          dark
          label="Seu nome"
          name="nome"
          autoComplete="name"
          required
          placeholder="Como te chamam"
        />
        <TextField
          dark
          label="Nome do negócio"
          name="negocio"
          required
          placeholder="Ex.: Studio Alfa"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          dark
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="voce@negocio.com"
        />
        <TextField
          dark
          label="Senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="Mínimo de 8 caracteres."
        />
      </div>

      <div>
        <span className="mb-1.5 block text-[12.5px] font-semibold text-text-faint">
          Segmento do negócio
        </span>
        <SegmentPicker dark />
      </div>

      {state.error && (
        <p className="text-[12.5px] text-garnet">{state.error}</p>
      )}

      <SubmitButton variant="gold" pendingLabel="Criando sua conta…">
        Criar conta e negócio
      </SubmitButton>

      <p className="pt-1 text-center text-[12.5px] text-text-faint">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-gold">
          Entrar
        </Link>
      </p>
    </form>
  );
}
