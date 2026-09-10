import type { Metadata } from "next";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Cadastre seu negócio" };

export default function CadastroPage() {
  return (
    <div className="w-full max-w-xl">
      <h1 className="font-display text-2xl font-semibold text-white">
        Cadastre seu negócio
      </h1>
      <p className="mt-1.5 mb-7 text-[13.5px] text-text-faint">
        Comece com 14 dias de avaliação, sem cartão. Seu painel é criado na hora.
      </p>
      <SignupForm />
    </div>
  );
}
