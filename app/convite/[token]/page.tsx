import type { Metadata } from "next";
import Link from "next/link";

import { GoldStripe } from "@/components/brand/gold-stripe";
import { Logo } from "@/components/brand/logo";
import { getSessionClaims } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = { title: "Convite para a equipe" };

export const dynamic = "force-dynamic";

const MOTIVO_TEXTO: Record<string, string> = {
  nao_encontrado: "Este link de convite não existe ou foi digitado errado.",
  ja_aceito: "Este convite já foi aceito. Faça login para entrar.",
  revogado: "Este convite foi cancelado pelo dono do negócio.",
  expirado: "Este convite expirou. Peça um novo ao dono do negócio.",
};

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: preview } = await supabase.rpc("invitation_preview", {
    p_token: token,
  });

  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <GoldStripe />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-12">
        <Logo dark />
        <div className="flex flex-1 flex-col justify-center py-10">
          {!preview?.valido ? (
            <Message text={MOTIVO_TEXTO[preview?.motivo] ?? MOTIVO_TEXTO.nao_encontrado} />
          ) : (
            <ValidInvite token={token} preview={preview} />
          )}
        </div>
      </div>
    </div>
  );
}

function Message({ text }: { text: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">Convite</h1>
      <p className="mt-2 text-[13.5px] text-text-faint">{text}</p>
      <Link
        href="/login"
        className="mt-6 inline-block text-[12.5px] font-semibold text-gold"
      >
        Ir para o login
      </Link>
    </div>
  );
}

async function ValidInvite({
  token,
  preview,
}: {
  token: string;
  preview: {
    tenant_nome: string;
    nome: string;
    email: string;
  };
}) {
  const claims = await getSessionClaims();
  const sessionEmail = claims?.email?.toLowerCase();
  const inviteEmail = preview.email.toLowerCase();

  if (claims && sessionEmail && sessionEmail !== inviteEmail) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">
          Você está em outra conta
        </h1>
        <p className="mt-2 text-[13.5px] text-text-faint">
          Este convite é para <strong className="text-white">{preview.email}</strong>,
          mas você está logado como {sessionEmail}. Saia e abra o link de novo.
        </p>
      </div>
    );
  }

  const mode = claims && sessionEmail === inviteEmail ? "finalizar" : "cadastro";

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">
        Entrar na equipe
      </h1>
      <p className="mt-1.5 mb-7 text-[13.5px] text-text-faint">
        Você foi convidado(a) para{" "}
        <strong className="text-white">{preview.tenant_nome}</strong> como
        funcionário(a).
      </p>
      <AcceptForm
        token={token}
        email={preview.email}
        nome={preview.nome}
        mode={mode}
      />
    </div>
  );
}
