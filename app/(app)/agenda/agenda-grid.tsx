"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { ActionButton } from "@/components/ui/action-button";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Pill } from "@/components/ui/pill";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { addMinutos, hojeISO } from "@/lib/agenda";
import { ausenciaCobreSlot, MOTIVO_LABEL } from "@/lib/ausencia";
import { formatDuracao } from "@/lib/format";
import type {
  AppointmentView,
  AusenciaRow,
  ClientRow,
  ProfessionalRow,
  ServiceRow,
  StatusAgendamento,
} from "@/types/database";
import { abrirComandaAction } from "@/app/(app)/financeiro/comanda-actions";
import {
  saveAppointmentAction,
  setAppointmentStatusAction,
  type AgendaState,
} from "./actions";

type ClienteMin = Pick<ClientRow, "id" | "nome" | "telefone">;
const INITIAL: AgendaState = {};

const STATUS: Record<
  StatusAgendamento,
  { label: string; tone: "gold" | "forest" | "garnet" | "neutral" }
> = {
  confirmado: { label: "confirmado", tone: "gold" },
  concluido: { label: "concluído", tone: "forest" },
  cancelado: { label: "cancelado", tone: "neutral" },
  nao_compareceu: { label: "não compareceu", tone: "garnet" },
};

interface SlotAlvo {
  professionalId: string;
  hora: string;
}

export function AgendaGrid({
  dia,
  slots,
  fechado = false,
  passo,
  profissionais,
  servicos,
  clientes,
  agendamentos,
  ausencias = [],
  meuProfessionalId,
  podeComanda,
}: {
  dia: string;
  slots: string[];
  fechado?: boolean;
  passo: number;
  profissionais: ProfessionalRow[];
  servicos: ServiceRow[];
  clientes: ClienteMin[];
  agendamentos: AppointmentView[];
  ausencias?: AusenciaRow[];
  meuProfessionalId: string | null;
  podeComanda: boolean;
}) {
  const [novo, setNovo] = useState<SlotAlvo | true | null>(null);
  const [editando, setEditando] = useState<AppointmentView | null>(null);

  // funcionário vinculado só mexe na própria coluna
  const somenteLeitura = (profId: string) =>
    meuProfessionalId != null && profId !== meuProfessionalId;

  if (profissionais.length === 0) {
    return (
      <Card className="px-6 py-14 text-center">
        <p className="text-[13.5px] text-text-soft">
          Cadastre um profissional para montar a agenda.
        </p>
        <Link
          href="/equipe?aba=profissionais"
          className="mt-3 inline-block rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Ir para Profissionais
        </Link>
      </Card>
    );
  }

  const semServico = servicos.length === 0;

  return (
    <div>
      {fechado && (
        <div className="mb-4 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-[13px] text-text-soft">
          O negócio está marcado como <strong>fechado</strong> nesse dia. Os
          horários somem da grade, mas você ainda pode criar um agendamento
          manualmente se precisar.
        </div>
      )}
      <div className="mb-5">
        <button
          onClick={() => setNovo(true)}
          disabled={semServico}
          className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Plus size={15} /> Novo agendamento
        </button>
        {semServico && (
          <p className="mt-2 text-[12px] text-text-faint">
            Cadastre ao menos um serviço para poder agendar.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {profissionais.map((p) => {
          const ro = somenteLeitura(p.id);
          return (
            <ColunaProfissional
              key={p.id}
              profissional={p}
              slots={slots}
              passo={passo}
              somenteLeitura={ro}
              agendamentos={agendamentos.filter(
                (a) => a.professional_id === p.id,
              )}
              ausencias={ausencias.filter((a) => a.professional_id === p.id)}
              onSlotLivre={(hora) =>
                !ro && !semServico && setNovo({ professionalId: p.id, hora })
              }
              onAgendamento={(a) => !ro && setEditando(a)}
            />
          );
        })}
      </div>

      {novo && (
        <AppointmentModal
          dia={dia}
          alvo={
            novo === true
              ? meuProfessionalId
                ? { professionalId: meuProfessionalId, hora: "09:00" }
                : null
              : novo
          }
          profissionais={profissionais}
          servicos={servicos}
          clientes={clientes}
          agendamento={null}
          ausencias={ausencias}
          travarProfissionalId={meuProfessionalId}
          onClose={() => setNovo(null)}
        />
      )}
      {editando && (
        <AppointmentModal
          dia={dia}
          alvo={null}
          profissionais={profissionais}
          servicos={servicos}
          clientes={clientes}
          agendamento={editando}
          ausencias={ausencias}
          travarProfissionalId={meuProfessionalId}
          podeComanda={podeComanda}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function ColunaProfissional({
  profissional,
  slots,
  passo,
  somenteLeitura,
  agendamentos,
  ausencias,
  onSlotLivre,
  onAgendamento,
}: {
  profissional: ProfessionalRow;
  slots: string[];
  passo: number;
  somenteLeitura: boolean;
  agendamentos: AppointmentView[];
  ausencias: AusenciaRow[];
  onSlotLivre: (hora: string) => void;
  onAgendamento: (a: AppointmentView) => void;
}) {
  const ativos = agendamentos.filter((a) => a.status !== "cancelado");
  const diaTodo = ausencias.find((a) => a.dia_todo);

  return (
    <Card className={`p-4 ${somenteLeitura ? "opacity-90" : ""}`}>
      <div className="mb-3 flex items-center gap-2.5">
        <Avatar nome={profissional.nome} fotoUrl={profissional.foto_url} size={32} />
        <div>
          <div className="text-[13.5px] font-semibold text-text">
            {profissional.nome}
          </div>
          <div className="text-[11.5px] text-text-faint">
            {somenteLeitura
              ? "só visualização"
              : (profissional.cargo ?? "Profissional")}
          </div>
        </div>
      </div>

      {ausencias.length > 0 && (
        <div className="mb-2 rounded-lg bg-[#fbf1dc] px-2.5 py-1.5 text-[11.5px] font-semibold text-gold-deep">
          {diaTodo
            ? `Ausente o dia todo · ${MOTIVO_LABEL[diaTodo.motivo]}`
            : `Ausente parte do dia · ${ausencias
                .map(
                  (a) =>
                    `${(a.hora_inicio ?? "").slice(0, 5)}–${(a.hora_fim ?? "").slice(0, 5)}`,
                )
                .join(", ")}`}
        </div>
      )}

      <div className="max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
        {slots.map((hora) => {
          const proximo = addMinutos(hora, passo);
          const comeca = ativos.find(
            (a) => a.hora_inicio >= hora && a.hora_inicio < proximo,
          );
          const cobre = ativos.find(
            (a) => a.hora_inicio < hora && a.hora_fim > hora,
          );

          if (comeca) {
            const info = STATUS[comeca.status];
            const conteudo = (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-semibold text-text-soft">
                    {comeca.hora_inicio}–{comeca.hora_fim}
                  </span>
                  <Pill tone={info.tone}>{info.label}</Pill>
                </div>
                <div className="mt-0.5 text-[13px] font-semibold text-text">
                  {comeca.cliente_nome}
                </div>
                <div className="text-[11.5px] text-text-faint">
                  {comeca.servico_nome ?? "Serviço removido"}
                </div>
              </>
            );
            return somenteLeitura ? (
              <div
                key={hora}
                className="w-full rounded-xl bg-[#faf7f0] px-3 py-2"
              >
                {conteudo}
              </div>
            ) : (
              <button
                key={hora}
                onClick={() => onAgendamento(comeca)}
                className="w-full rounded-xl border border-transparent bg-[#faf7f0] px-3 py-2 text-left"
              >
                {conteudo}
              </button>
            );
          }

          if (cobre) {
            return (
              <div
                key={hora}
                className="rounded-xl bg-[#faf7f0]/60 px-3 py-1.5 font-mono text-[11px] text-text-faint"
              >
                {hora}
              </div>
            );
          }

          const ausente = ausencias.find((a) =>
            ausenciaCobreSlot(a, hora, proximo),
          );
          if (ausente) {
            return (
              <div
                key={hora}
                className="flex w-full items-center justify-between rounded-xl bg-[#fbf1dc]/50 px-3 py-2"
              >
                <span className="font-mono text-[12px] font-semibold text-text-faint">
                  {hora}
                </span>
                <span className="text-[11px] font-semibold text-gold-deep">
                  ausente · {MOTIVO_LABEL[ausente.motivo].toLowerCase()}
                </span>
              </div>
            );
          }

          if (somenteLeitura) {
            return (
              <div
                key={hora}
                className="flex w-full items-center justify-between rounded-xl border border-border/50 px-3 py-2"
              >
                <span className="font-mono text-[12px] font-semibold text-text-faint">
                  {hora}
                </span>
                <span className="text-[11px] text-text-faint">livre</span>
              </div>
            );
          }

          return (
            <button
              key={hora}
              onClick={() => onSlotLivre(hora)}
              className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2 text-left hover:border-gold"
            >
              <span className="font-mono text-[12px] font-semibold text-text-faint">
                {hora}
              </span>
              <span className="text-[11px] text-text-faint">livre</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function AppointmentModal({
  dia,
  alvo,
  profissionais,
  servicos,
  clientes,
  agendamento,
  ausencias,
  travarProfissionalId,
  podeComanda = false,
  onClose,
}: {
  dia: string;
  alvo: SlotAlvo | null;
  profissionais: ProfessionalRow[];
  servicos: ServiceRow[];
  clientes: ClienteMin[];
  agendamento: AppointmentView | null;
  ausencias: AusenciaRow[];
  travarProfissionalId: string | null;
  podeComanda?: boolean;
  onClose: () => void;
}) {
  const [state, action] = useActionState(saveAppointmentAction, INITIAL);
  const [novoCliente, setNovoCliente] = useState(false);
  const [profId, setProfId] = useState(
    travarProfissionalId ??
      agendamento?.professional_id ??
      alvo?.professionalId ??
      "",
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const editando = Boolean(agendamento);
  // funcionário vinculado só escolhe cliente da própria lista (RLS) — não cadastra
  const podeCadastrarCliente = travarProfissionalId == null;
  const defServico =
    agendamento?.service_id ?? servicos[0]?.id ?? "";
  const servicoInicial = servicos.find((s) => s.id === defServico);
  const [duracao, setDuracao] = useState(servicoInicial?.duracao_min ?? 30);
  const [data, setData] = useState(agendamento?.data ?? dia);
  const [horaInicio, setHoraInicio] = useState(
    agendamento?.hora_inicio ?? alvo?.hora ?? "09:00",
  );

  const hoje = hojeISO();
  const agoraHHMM = new Date().toTimeString().slice(0, 5);
  const horaOriginal = agendamento
    ? `${agendamento.data}T${agendamento.hora_inicio}`
    : null;
  const escolhido = `${data}T${horaInicio}`;
  const noPassado =
    (data < hoje || (data === hoje && horaInicio < agoraHHMM)) &&
    escolhido !== horaOriginal;

  const clientesOrdenados = useMemo(
    () => [...clientes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [clientes],
  );

  // Aviso (não bloqueia): o profissional está marcado como ausente nesse horário.
  const horaFimSelecionada = addMinutos(horaInicio, duracao);
  const ausenteNoHorario =
    profId !== "" &&
    ausencias.some(
      (a) =>
        a.professional_id === profId &&
        a.data === data &&
        ausenciaCobreSlot(a, horaInicio, horaFimSelecionada),
    );

  return (
    <Modal
      title={editando ? "Agendamento" : "Novo agendamento"}
      onClose={onClose}
      wide
    >
      <form action={action} className="space-y-4">
        {editando && <input type="hidden" name="id" value={agendamento!.id} />}

        {/* Cliente */}
        {!editando && !novoCliente && (
          <div>
            <SelectField label="Cliente" name="client_id" defaultValue="">
              <option value="">Selecione…</option>
              {clientesOrdenados.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.telefone ? ` · ${c.telefone}` : ""}
                </option>
              ))}
            </SelectField>
            {podeCadastrarCliente && (
              <button
                type="button"
                onClick={() => setNovoCliente(true)}
                className="mt-1.5 text-[12px] font-semibold text-gold"
              >
                + cadastrar novo cliente
              </button>
            )}
          </div>
        )}
        {!editando && novoCliente && podeCadastrarCliente && (
          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-text-soft">
                Novo cliente
              </span>
              <button
                type="button"
                onClick={() => setNovoCliente(false)}
                className="text-[12px] font-semibold text-text-faint"
              >
                usar existente
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Nome" name="novo_cliente_nome" required />
              <TextField
                label="Telefone"
                name="novo_cliente_telefone"
                type="tel"
              />
            </div>
          </div>
        )}
        {editando && (
          <div className="rounded-xl bg-[#faf7f0] px-3.5 py-2.5 text-[13px]">
            <span className="font-semibold text-text">
              {agendamento!.cliente_nome}
            </span>
            {agendamento!.cliente_telefone && (
              <span className="text-text-faint">
                {" "}
                · {agendamento!.cliente_telefone}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {travarProfissionalId ? (
            <div>
              <span className="mb-1.5 block text-[12.5px] font-semibold text-text-soft">
                Profissional
              </span>
              <div className="rounded-xl border border-border bg-[#faf7f0] px-3.5 py-2.5 text-sm text-text">
                {profissionais.find((p) => p.id === travarProfissionalId)?.nome ??
                  "Você"}
              </div>
              <input
                type="hidden"
                name="professional_id"
                value={travarProfissionalId}
              />
            </div>
          ) : (
            <SelectField
              label="Profissional"
              name="professional_id"
              value={profId}
              onChange={(e) => setProfId(e.target.value)}
              required
            >
              <option value="">Selecione…</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </SelectField>
          )}
          <SelectField
            label="Serviço"
            name="service_id"
            defaultValue={defServico}
            required
            onChange={(e) => {
              const s = servicos.find((x) => x.id === e.target.value);
              if (s) setDuracao(s.duracao_min);
            }}
          >
            <option value="">Selecione…</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} · {formatDuracao(s.duracao_min)}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Data"
            name="data"
            type="date"
            value={data}
            min={editando ? undefined : hoje}
            onChange={(e) => setData(e.target.value)}
            required
          />
          <TextField
            label="Início"
            name="hora_inicio"
            type="time"
            value={horaInicio}
            min={data === hoje ? agoraHHMM : undefined}
            onChange={(e) => setHoraInicio(e.target.value)}
            required
          />
        </div>
        <p className="text-[12px] text-text-faint">
          Término previsto: {addMinutos(horaInicio, duracao)} ({formatDuracao(duracao)})
        </p>
        {noPassado && (
          <p className="text-[12.5px] text-garnet">
            Esse horário já passou. Escolha uma data/hora futura.
          </p>
        )}
        {ausenteNoHorario && !noPassado && (
          <p className="rounded-lg bg-[#fbf1dc] px-3 py-2 text-[12.5px] text-gold-deep">
            ⚠ Esse profissional está marcado como ausente nesse horário. Você
            ainda pode agendar, mas confira antes.
          </p>
        )}

        <label htmlFor="ag-obs" className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-text-soft">
            Observações
          </span>
          <textarea
            id="ag-obs"
            name="observacoes"
            rows={2}
            defaultValue={agendamento?.observacoes ?? ""}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
          />
        </label>

        {state.error && (
          <p className="text-[12.5px] text-garnet">{state.error}</p>
        )}
        <SubmitButton pendingLabel="Salvando…" disabled={noPassado}>
          {editando ? "Salvar alterações" : "Agendar"}
        </SubmitButton>
      </form>

      {editando && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-text-faint uppercase">
            Situação
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["concluido", "Concluído"],
                ["nao_compareceu", "Não compareceu"],
                ["confirmado", "Reabrir"],
                ["cancelado", "Cancelar"],
              ] as const
            ).map(([status, label]) => (
              <form
                key={status}
                action={setAppointmentStatusAction}
                onSubmit={() => setTimeout(onClose, 250)}
              >
                <input type="hidden" name="id" value={agendamento!.id} />
                <input type="hidden" name="status" value={status} />
                <ActionButton
                  className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-text-soft hover:border-gold"
                >
                  {label}
                </ActionButton>
              </form>
            ))}
          </div>
        </div>
      )}

      {editando &&
        podeComanda &&
        agendamento!.status !== "cancelado" && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 text-[11px] font-semibold tracking-wide text-text-faint uppercase">
              Comanda
            </div>
            {agendamento!.comanda_id ? (
              <Link
                href={`/financeiro/comandas/${agendamento!.comanda_id}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-soft hover:border-gold"
              >
                Ver comanda
                {agendamento!.comanda_status === "fechada" ? " (fechada)" : ""}
              </Link>
            ) : (
              <form action={abrirComandaAction}>
                <input
                  type="hidden"
                  name="appointment_id"
                  value={agendamento!.id}
                />
                <ActionButton
                  pendingLabel="Abrindo…"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
                >
                  Abrir comanda
                </ActionButton>
              </form>
            )}
          </div>
        )}
    </Modal>
  );
}
