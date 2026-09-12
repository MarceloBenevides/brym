"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";

import { revokeInviteAction } from "@/app/(app)/equipe/actions";
import { ActionButton } from "@/components/ui/action-button";
import { resumoPermissoes } from "@/lib/permissions";

export interface PendingInvite {
  id: string;
  nome: string;
  email: string;
  token: string;
  permissoes: string[];
  expira_em: string;
}

export function PendingInvites({ invites }: { invites: PendingInvite[] }) {
  if (invites.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-[13px] text-text-faint">
        Nenhum convite pendente.
      </p>
    );
  }

  return (
    <ul>
      {invites.map((inv, i) => (
        <li
          key={inv.id}
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
          style={{
            borderBottom:
              i < invites.length - 1
                ? "1px solid var(--color-border)"
                : undefined,
          }}
        >
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-text">
              {inv.nome || inv.email}
            </div>
            <div className="text-[12px] text-text-faint">
              {inv.email} · {resumoPermissoes(inv.permissoes)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CopyLinkButton token={inv.token} />
            <form action={revokeInviteAction}>
              <input type="hidden" name="id" value={inv.id} />
              <ActionButton
                pendingLabel="Revogando…"
                title="Revogar convite"
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-text-soft transition-colors hover:border-garnet hover:text-garnet"
              >
                <X size={13} /> Revogar
              </ActionButton>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = `${window.location.origin}/convite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copie o link do convite:", url);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copiado" : "Copiar link"}
    </button>
  );
}
