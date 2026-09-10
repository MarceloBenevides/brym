"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import {
  CRM_STATUS_LABEL,
  CRM_STATUS_TOM,
  mensagemPorStatus,
  type CrmRecuperarItem,
} from "@/lib/crm";
import { iniciais } from "@/lib/format";
import { linkWhatsApp } from "@/lib/whatsapp";
import { desfazerContatoAction, registrarContatoAction } from "./actions";

function dataBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return d ? `${d}/${m}/${y}` : iso;
}

export function CrmLista({
  titulo,
  itens,
  ddi,
  mensagemTemplate,
  recuperavel,
  soAContatar,
  chipHrefBase,
}: {
  titulo: string;
  itens: CrmRecuperarItem[];
  ddi: string;
  mensagemTemplate: string | null;
  /** Em atenção / Inativo: registra o contato e esconde por 30 dias. */
  recuperavel: boolean;
  soAContatar: boolean;
  chipHrefBase: string;
}) {
  const visiveis =
    recuperavel && soAContatar
      ? itens.filter((i) => i.contatado_em == null)
      : itens;

  const chip = (ativo: boolean) =>
    cn(
      "rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
      ativo
        ? "border-ink bg-ink text-white"
        : "border-border bg-card text-text-soft hover:border-gold/60",
    );

  const hrefTodos =
    chipHrefBase + (chipHrefBase.includes("?") ? "&" : "?") + "f=todos";

  return (
    <div>
      <h2 className="mt-8 mb-3 font-display text-lg font-semibold text-text">
        {titulo}
      </h2>

      {recuperavel && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Link href={chipHrefBase} className={chip(soAContatar)}>
            A contatar
          </Link>
          <Link href={hrefTodos} className={chip(!soAContatar)}>
            Todos
          </Link>
        </div>
      )}

      {visiveis.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <p className="text-[13.5px] text-text-soft">
            {recuperavel && soAContatar
              ? "Ninguém pendente de contato agora. 👏"
              : "Nenhum cliente neste status."}
          </p>
        </Card>
      ) : (
        <Card>
          {visiveis.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 px-5 py-4"
              style={{
                borderBottom:
                  i < visiveis.length - 1
                    ? "1px solid var(--color-border)"
                    : undefined,
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fbf1dc] text-[13px] font-semibold text-gold-deep">
                  {iniciais(c.nome)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[13.5px] font-semibold text-text">
                      {c.nome}
                    </span>
                    <Pill tone={CRM_STATUS_TOM[c.status]}>
                      {CRM_STATUS_LABEL[c.status]}
                    </Pill>
                    {recuperavel && c.contatado_em && (
                      <Pill tone="forest">contatado</Pill>
                    )}
                  </div>
                  <div className="text-[12px] text-text-faint">
                    última visita {dataBR(c.ultimo_atendimento)} · {c.dias} dias
                    {c.telefone ? ` · ${c.telefone}` : " · sem telefone"}
                  </div>
                </div>
              </div>

              <BotaoContatar
                cliente={c}
                ddi={ddi}
                mensagemTemplate={mensagemTemplate}
                recuperavel={recuperavel}
              />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function BotaoContatar({
  cliente,
  ddi,
  mensagemTemplate,
  recuperavel,
}: {
  cliente: CrmRecuperarItem;
  ddi: string;
  mensagemTemplate: string | null;
  recuperavel: boolean;
}) {
  const link = linkWhatsApp(
    cliente.telefone,
    mensagemPorStatus(cliente.status, cliente.nome, mensagemTemplate),
    ddi,
  );

  if (!link) {
    return (
      <button
        type="button"
        disabled
        title="Cliente sem telefone"
        className="shrink-0 rounded-xl border border-border px-3.5 py-2 text-[12.5px] font-semibold text-text-faint"
      >
        Sem telefone
      </button>
    );
  }

  // Novo/Ativo/Perdido: só abre o WhatsApp, não registra nada (contato geral).
  if (!recuperavel) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-[12.5px] font-semibold text-white"
      >
        <MessageCircle size={14} /> Contatar
      </a>
    );
  }

  const abrirWhats = () => window.open(link, "_blank", "noopener,noreferrer");

  if (cliente.contatado_em) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <form action={desfazerContatoAction}>
          <input type="hidden" name="client_id" value={cliente.id} />
          <button
            type="submit"
            className="text-[12px] font-semibold text-text-faint hover:text-text-soft"
          >
            desmarcar
          </button>
        </form>
        <button
          type="button"
          onClick={abrirWhats}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-[12.5px] font-semibold text-text-soft"
        >
          <MessageCircle size={14} /> Reenviar
        </button>
      </div>
    );
  }

  return (
    <form action={registrarContatoAction} className="shrink-0">
      <input type="hidden" name="client_id" value={cliente.id} />
      <button
        type="submit"
        onClick={abrirWhats}
        className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-[12.5px] font-semibold text-white"
      >
        <MessageCircle size={14} /> Contatar
      </button>
    </form>
  );
}
