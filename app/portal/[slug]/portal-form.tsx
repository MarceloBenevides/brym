"use client";

import { useActionState } from "react";
import { Phone } from "lucide-react";

import { SubmitButton } from "@/components/ui/submit-button";
import {
  portalLookupAction,
  type PortalAgendamento,
  type PortalState,
} from "@/app/portal/actions";

const INITIAL: PortalState = {};

const STATUS_LABEL: Record<string, string> = {
  confirmado: "confirmado",
  concluido: "concluído",
  nao_compareceu: "não compareceu",
  cancelado: "cancelado",
};

function dataBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function PortalForm({ slug }: { slug: string }) {
  const [state, action] = useActionState(portalLookupAction, INITIAL);

  if (state.dados) {
    const { dados } = state;
    return (
      <div>
        <div className="mb-6">
          <div className="text-[12px] text-text-faint">Olá,</div>
          <div className="font-display text-2xl font-semibold text-white">
            {dados.cliente_nome.split(" ")[0]}
          </div>
        </div>

        <Secao titulo="Próximos agendamentos">
          {dados.proximos.length === 0 ? (
            <Vazio>Nenhum agendamento futuro.</Vazio>
          ) : (
            dados.proximos.map((a, i) => <ItemFuturo key={i} a={a} />)
          )}
        </Secao>

        <Secao titulo="Serviços já realizados">
          {dados.historico.length === 0 ? (
            <Vazio>Nada por aqui ainda.</Vazio>
          ) : (
            dados.historico.map((a, i) => <ItemHistorico key={i} a={a} />)
          )}
        </Secao>

        <a
          href={`/portal/${slug}`}
          className="mt-6 inline-block text-[12.5px] font-semibold text-gold"
        >
          Consultar outro número
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div className="flex items-center gap-2 rounded-xl border border-ink-line bg-ink-soft px-3.5 py-3">
        <Phone size={16} className="text-text-faint" />
        <input
          name="telefone"
          type="tel"
          autoComplete="tel"
          required
          placeholder="(00) 00000-0000"
          className="flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-text-faint"
        />
      </div>
      {state.erro && (
        <p className="text-[12.5px] text-garnet">{state.erro}</p>
      )}
      <SubmitButton variant="gold" pendingLabel="Consultando…">
        Ver meus agendamentos
      </SubmitButton>
    </form>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 first:mt-0">
      <div className="mb-2 text-[11.5px] font-semibold tracking-wide text-text-faint uppercase">
        {titulo}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-text-faint">{children}</p>;
}

function ItemFuturo({ a }: { a: PortalAgendamento }) {
  return (
    <div className="rounded-xl border border-ink-line bg-ink-soft p-4">
      <div className="text-[14.5px] font-semibold text-white">
        {a.servico ?? "Serviço"}
      </div>
      <div className="mt-0.5 text-[12.5px] text-text-faint">
        {dataBR(a.data)} às {a.hora_inicio}
        {a.profissional ? ` · com ${a.profissional}` : ""}
      </div>
    </div>
  );
}

function ItemHistorico({ a }: { a: PortalAgendamento }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-ink-line bg-ink-soft px-4 py-3">
      <div>
        <div className="text-[13px] font-semibold text-white">
          {a.servico ?? "Serviço"}
        </div>
        <div className="text-[11.5px] text-text-faint">
          {dataBR(a.data)}
          {a.profissional ? ` · ${a.profissional}` : ""}
        </div>
      </div>
      {a.status !== "concluido" && (
        <span className="text-[11px] text-text-faint">
          {STATUS_LABEL[a.status] ?? a.status}
        </span>
      )}
    </div>
  );
}
