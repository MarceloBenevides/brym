"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInAction, type AuthState } from "@/app/auth/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";

const INITIAL: AuthState = {};

export function LoginForm() {
  const [state, action] = useActionState(signInAction, INITIAL);

  return (
    <form action={action} className="space-y-4">
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
        autoComplete="current-password"
        required
      />

      {state.error && (
        <p className="text-[12.5px] text-garnet">{state.error}</p>
      )}

      <SubmitButton variant="gold" pendingLabel="Entrando…">
        Entrar
      </SubmitButton>

      <p className="pt-1 text-center text-[12.5px] text-text-faint">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-gold">
          Cadastre seu negócio
        </Link>
      </p>
    </form>
  );
}
