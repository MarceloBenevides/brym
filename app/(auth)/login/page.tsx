import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-2xl font-semibold text-white">
        Entrar
      </h1>
      <p className="mt-1.5 mb-7 text-[13.5px] text-text-faint">
        Acesse o painel do seu negócio.
      </p>
      <LoginForm />
    </div>
  );
}
