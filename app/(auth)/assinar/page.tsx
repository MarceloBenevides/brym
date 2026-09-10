import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";

import { signOutAction } from "@/app/auth/actions";
import { getAppContext } from "@/lib/auth";
import { acessoLiberado, assinaturaResumo, dataBR } from "@/lib/assinatura";
import { formatarCpfCnpj } from "@/lib/documento";
import { PLANOS, PLANOS_ORDEM } from "@/lib/planos";
import {
  assinarPlanoAction,
  cancelarAssinaturaAction,
  salvarCpfAction,
} from "./actions";

export const metadata: Metadata = { title: "Assinatura" };
export const dynamic = "force-dynamic";

export default async function AssinarPage({
  searchParams,
}: {
  searchParams: Promise<{
    pago?: string;
    portal?: string;
    cancelada?: string;
    erro?: string;
  }>;
}) {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (!ctx.profile || !ctx.tenant) redirect("/onboarding");

  const { pago, portal, cancelada, erro } = await searchParams;
  const tenant = ctx.tenant;
  const precisaCpf = !tenant.cpf_cnpj;
  const resumo = assinaturaResumo(tenant);
  const liberado = acessoLiberado(tenant);
  const temAssinaturaAsaas =
    tenant.gateway === "asaas" && Boolean(tenant.gateway_subscription_id);
  const temPortalStripe =
    tenant.gateway === "stripe" && Boolean(tenant.gateway_customer_id);

  if (!ctx.isOwner) {
    return (
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold text-white">
          Assinatura pendente
        </h1>
        <p className="mt-3 text-[13.5px] text-text-faint">
          A assinatura de <span className="text-white">{tenant.nome}</span>{" "}
          precisa ser regularizada pelo responsável pelo negócio.
        </p>
        {liberado && (
          <Link
            href="/agenda"
            className="mt-6 inline-block rounded-xl border border-ink-line px-4 py-2.5 text-sm font-semibold text-text-soft hover:border-gold"
          >
            Voltar
          </Link>
        )}
        <form action={signOutAction} className="mt-3">
          <button
            type="submit"
            className="text-[12.5px] font-semibold text-text-faint hover:text-white"
          >
            Sair
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <h1 className="font-display text-2xl font-semibold text-white">
        {tenant.nome}
      </h1>

      <div className="mt-4 rounded-xl border border-ink-line bg-ink-soft px-4 py-3">
        <div className="text-[13.5px] font-semibold text-white">
          {resumo.titulo}
        </div>
        <div className="text-[12.5px] text-text-faint">{resumo.detalhe}</div>
      </div>

      {pago === "1" && (
        <p className="mt-3 rounded-xl bg-gold-deep/15 px-4 py-2.5 text-[12.5px] text-gold">
          Pagamento recebido. Pode levar alguns segundos para liberar o acesso —
          atualize a página em instantes.
        </p>
      )}
      {portal === "erro" && (
        <p className="mt-3 rounded-xl bg-garnet/15 px-4 py-2.5 text-[12.5px] text-garnet">
          Não foi possível abrir o portal de assinatura agora. Tente de novo em
          instantes.
        </p>
      )}
      {cancelada === "1" && (
        <p className="mt-3 rounded-xl bg-garnet/15 px-4 py-2.5 text-[12.5px] text-garnet">
          Assinatura cancelada. O acesso continua até{" "}
          {dataBR(tenant.assinatura_ativa_ate) || "o fim do período pago"}.
        </p>
      )}
      {erro === "cpf" && (
        <p className="mt-3 rounded-xl bg-garnet/15 px-4 py-2.5 text-[12.5px] text-garnet">
          CPF ou CNPJ inválido. Confira os números e tente de novo.
        </p>
      )}

      {precisaCpf ? (
        <div className="mt-6 rounded-2xl border border-ink-line bg-ink-soft p-5">
          <div className="text-[13.5px] font-semibold text-white">
            Antes de escolher o plano
          </div>
          <p className="mt-1 mb-4 text-[12.5px] text-text-faint">
            O pagamento é feito pelo Asaas, que precisa do CPF ou CNPJ do
            responsável pelo negócio.
          </p>
          <form action={salvarCpfAction} className="flex flex-wrap gap-2">
            <input
              name="cpf_cnpj"
              inputMode="numeric"
              required
              placeholder="CPF ou CNPJ"
              defaultValue={formatarCpfCnpj(tenant.cpf_cnpj)}
              className="flex-1 rounded-xl border border-ink-line bg-ink px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-text-faint focus:border-gold"
            />
            <button
              type="submit"
              className="rounded-xl bg-gold-deep px-4 py-2.5 text-sm font-semibold text-ink"
            >
              Continuar
            </button>
          </form>
        </div>
      ) : (
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {PLANOS_ORDEM.map((id) => {
          const p = PLANOS[id];
          const atual = tenant.plano === id;
          return (
            <div
              key={id}
              className={`flex flex-col rounded-2xl border p-4 ${
                p.destaque ? "border-gold bg-ink-soft" : "border-ink-line"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13.5px] font-semibold text-white">
                  {p.nome}
                </span>
                {p.destaque && (
                  <span className="rounded-full bg-gold-deep px-2 py-0.5 text-[10.5px] font-semibold text-ink">
                    popular
                  </span>
                )}
              </div>
              <div className="mt-1 text-[15px] font-semibold text-white">
                {p.precoLabel}
              </div>
              <ul className="mt-3 flex-1 space-y-1.5">
                {p.recursos.map((r) => (
                  <li
                    key={r}
                    className="flex items-start gap-1.5 text-[12px] text-text-faint"
                  >
                    <Check size={13} className="mt-0.5 shrink-0 text-gold" />
                    {r}
                  </li>
                ))}
              </ul>
              {atual ? (
                <div className="mt-4 rounded-xl border border-ink-line px-3 py-2 text-center text-[12.5px] font-semibold text-text-faint">
                  Seu plano atual
                </div>
              ) : (
                <form action={assinarPlanoAction} className="mt-4">
                  <input type="hidden" name="plano" value={id} />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gold-deep px-3 py-2 text-center text-[12.5px] font-semibold text-ink"
                  >
                    {temAssinaturaAsaas ? "Trocar pra esse" : "Assinar"}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
      )}

      {!precisaCpf && (
        <p className="mt-3 text-[11.5px] text-text-faint">
          Pagamento por Pix, boleto ou cartão — você escolhe na página do Asaas.
          Documento: {formatarCpfCnpj(tenant.cpf_cnpj)}.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {temPortalStripe && (
          <form action="/api/stripe/portal" method="post">
            <button
              type="submit"
              className="rounded-xl border border-ink-line px-4 py-2.5 text-sm font-semibold text-text-soft hover:border-gold"
            >
              Gerenciar assinatura
            </button>
          </form>
        )}
        {temAssinaturaAsaas && (
          <form action={cancelarAssinaturaAction}>
            <button
              type="submit"
              className="rounded-xl border border-ink-line px-4 py-2.5 text-sm font-semibold text-text-soft hover:border-garnet hover:text-garnet"
            >
              Cancelar assinatura
            </button>
          </form>
        )}
        {liberado && (
          <Link
            href="/agenda"
            className="text-[13px] font-semibold text-gold hover:underline"
          >
            Voltar pro painel
          </Link>
        )}
        <form action={signOutAction} className="ml-auto">
          <button
            type="submit"
            className="text-[12.5px] font-semibold text-text-faint hover:text-white"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
