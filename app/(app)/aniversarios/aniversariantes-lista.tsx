"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { formatAniversario, iniciais } from "@/lib/format";
import { linkWhatsApp, mensagemParabens, MESES_NOMES } from "@/lib/aniversario";
import { cn } from "@/lib/cn";
import type { ClientRow } from "@/types/database";
import {
  desmarcarFelicitacaoAction,
  marcarFelicitacaoAction,
} from "./actions";

type Cliente = Pick<
  ClientRow,
  "id" | "nome" | "telefone" | "aniversario_dia" | "aniversario_mes"
>;

export function AniversariantesLista({
  clientes,
  parabenizados,
  mensagemTemplate,
  ddi,
  mesAlvo,
  ano,
  soPendentes,
}: {
  clientes: Cliente[];
  parabenizados: string[];
  mensagemTemplate: string | null;
  ddi: string;
  mesAlvo: number;
  ano: number;
  soPendentes: boolean;
}) {
  const feitos = new Set(parabenizados);
  const visiveis = soPendentes
    ? clientes.filter((c) => !feitos.has(c.id))
    : clientes;

  const chip = (ativo: boolean) =>
    cn(
      "rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
      ativo
        ? "border-ink bg-ink text-white"
        : "border-border bg-card text-text-soft hover:border-gold/60",
    );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href={`/aniversarios?mes=${mesAlvo}`} className={chip(!soPendentes)}>
          Todos
        </Link>
        <Link
          href={`/aniversarios?mes=${mesAlvo}&f=pendentes`}
          className={chip(soPendentes)}
        >
          Pendentes
        </Link>
      </div>

      {visiveis.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <p className="text-[13.5px] text-text-soft">
            {soPendentes
              ? "Ninguém pendente de parabéns neste mês."
              : `Ninguém faz aniversário em ${MESES_NOMES[mesAlvo - 1]}.`}
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
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-semibold text-text">
                      {c.nome}
                    </span>
                    {feitos.has(c.id) && <Pill tone="forest">parabenizado</Pill>}
                  </div>
                  <div className="text-[12px] text-text-faint">
                    {formatAniversario(c.aniversario_dia, c.aniversario_mes)}
                    {c.telefone ? ` · ${c.telefone}` : " · sem telefone"}
                  </div>
                </div>
              </div>

              <BotaoParabenizar
                cliente={c}
                ano={ano}
                ddi={ddi}
                mensagemTemplate={mensagemTemplate}
                jaFeito={feitos.has(c.id)}
              />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function BotaoParabenizar({
  cliente,
  ano,
  ddi,
  mensagemTemplate,
  jaFeito,
}: {
  cliente: Cliente;
  ano: number;
  ddi: string;
  mensagemTemplate: string | null;
  jaFeito: boolean;
}) {
  const link = linkWhatsApp(
    cliente.telefone,
    mensagemParabens(cliente.nome, mensagemTemplate),
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

  const abrirWhats = () => window.open(link, "_blank", "noopener,noreferrer");

  if (jaFeito) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <form action={desmarcarFelicitacaoAction}>
          <input type="hidden" name="client_id" value={cliente.id} />
          <input type="hidden" name="ano" value={ano} />
          <ActionButton className="text-[12px] font-semibold text-text-faint hover:text-text-soft">
            desmarcar
          </ActionButton>
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
    <form action={marcarFelicitacaoAction} className="shrink-0">
      <input type="hidden" name="client_id" value={cliente.id} />
      <input type="hidden" name="ano" value={ano} />
      <ActionButton
        onClick={abrirWhats}
        pendingLabel="Marcando…"
        className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-[12.5px] font-semibold text-white"
      >
        <MessageCircle size={14} /> Parabenizar
      </ActionButton>
    </form>
  );
}
