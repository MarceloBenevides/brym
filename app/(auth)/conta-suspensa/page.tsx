import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/auth/actions";
import { getAppContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Conta suspensa" };
export const dynamic = "force-dynamic";

export default async function ContaSuspensaPage() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  const status = ctx.tenant?.status_assinatura;
  // Não ficou preso aqui: se o negócio voltou a funcionar, volta pro app.
  if (status !== "suspenso" && status !== "cancelado") redirect("/agenda");

  return (
    <div className="w-full max-w-md text-center">
      <h1 className="font-display text-2xl font-semibold text-white">
        Conta suspensa
      </h1>
      <p className="mt-3 text-[13.5px] text-text-faint">
        O acesso a <span className="text-white">{ctx.tenant?.nome}</span> está
        temporariamente bloqueado. Fale com o BRYM para regularizar e reativar a
        conta.
      </p>
      <form action={signOutAction} className="mt-8">
        <button
          type="submit"
          className="rounded-xl border border-ink-line px-4 py-2.5 text-sm font-semibold text-text-soft hover:border-gold"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
