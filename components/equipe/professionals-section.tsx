"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  saveProfessionalAction,
  toggleProfessionalAction,
  type ProfState,
} from "@/app/(app)/equipe/professionals-actions";
import {
  removerAusenciaAction,
  salvarAusenciaAction,
  type AusenciaState,
} from "@/app/(app)/equipe/ausencia-actions";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Pill } from "@/components/ui/pill";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { dataPorExtenso, hojeISO } from "@/lib/agenda";
import {
  MOTIVOS_AUSENCIA,
  MOTIVO_LABEL,
  MOTIVO_TOM,
  ausenciaJanela,
} from "@/lib/ausencia";
import type { AusenciaRow, ProfessionalRow } from "@/types/database";

const INITIAL: ProfState = {};
const INITIAL_AUSENCIA: AusenciaState = {};

export interface FuncionarioVinculavel {
  id: string;
  nome: string;
  email: string | null;
  /** `professionals.id` a que já está vinculado, ou `null`. */
  professionalId: string | null;
}

type ServicoMin = { id: string; nome: string };

export function ProfessionalsSection({
  profissionais,
  funcionarios,
  servicos,
  servicosPorProf,
  ausenciasPorProf,
}: {
  profissionais: ProfessionalRow[];
  funcionarios: FuncionarioVinculavel[];
  servicos: ServicoMin[];
  servicosPorProf: Record<string, string[]>;
  ausenciasPorProf: Record<string, AusenciaRow[]>;
}) {
  const [editing, setEditing] = useState<ProfessionalRow | "novo" | null>(null);

  const contaLabel = (userId: string | null) => {
    if (!userId) return null;
    const f = funcionarios.find((x) => x.id === userId);
    return f ? `conta: ${f.email ?? f.nome}` : "conta vinculada";
  };

  return (
    <div>
      <div className="mb-5">
        <button
          onClick={() => setEditing("novo")}
          className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={15} /> Adicionar profissional
        </button>
      </div>

      {profissionais.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <p className="text-[13.5px] text-text-soft">
            Nenhum profissional cadastrado. Adicione quem atende para poder montar
            a agenda.
          </p>
        </Card>
      ) : (
        <Card>
          {profissionais.map((p, i) => (
            <div
              key={p.id}
              className="px-5 py-4"
              style={{
                borderBottom:
                  i < profissionais.length - 1
                    ? "1px solid var(--color-border)"
                    : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-text">
                      {p.nome}
                    </span>
                    {!p.ativo && <Pill tone="neutral">inativo</Pill>}
                    {p.user_id && <Pill tone="forest">com login</Pill>}
                  </div>
                  <div className="text-[12px] text-text-faint">
                    {[
                      p.cargo,
                      p.telefone,
                      p.recebe_comissao
                        ? `comissão ${p.percentual_comissao}%`
                        : null,
                      contaLabel(p.user_id),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing(p)}
                    className="rounded-lg p-1.5 text-text-faint hover:bg-[#f1ece1] hover:text-text-soft"
                    aria-label={`Editar ${p.nome}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <form action={toggleProfessionalAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="ativo" value={String(p.ativo)} />
                    <button
                      type="submit"
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-text-soft"
                    >
                      {p.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </form>
                </div>
              </div>
              <AusenciasProf
                professionalId={p.id}
                nome={p.nome}
                ausencias={ausenciasPorProf[p.id] ?? []}
              />
            </div>
          ))}
        </Card>
      )}

      {editing && (
        <ProfessionalFormModal
          professional={editing === "novo" ? null : editing}
          funcionarios={funcionarios}
          servicos={servicos}
          servicosAtuais={
            editing !== "novo" && editing
              ? (servicosPorProf[editing.id] ?? [])
              : servicos.map((s) => s.id)
          }
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function AusenciasProf({
  professionalId,
  nome,
  ausencias,
}: {
  professionalId: string;
  nome: string;
  ausencias: AusenciaRow[];
}) {
  const [state, action] = useActionState(salvarAusenciaAction, INITIAL_AUSENCIA);
  const [diaTodo, setDiaTodo] = useState(true);
  const hoje = hojeISO();

  return (
    <details className="group mt-2">
      <summary className="cursor-pointer list-none text-[12px] font-semibold text-gold-deep">
        Ausências ({ausencias.length})
        <span className="text-text-faint group-open:hidden"> · abrir</span>
      </summary>

      <div className="mt-2 rounded-xl border border-border bg-[#faf7f0]/50 p-3">
        {ausencias.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {ausencias.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 text-[12.5px]"
              >
                <span className="min-w-0 text-text-soft">
                  {dataPorExtenso(a.data)}{" "}
                  <Pill tone={MOTIVO_TOM[a.motivo]}>
                    {MOTIVO_LABEL[a.motivo]}
                  </Pill>{" "}
                  <span className="text-text-faint">· {ausenciaJanela(a)}</span>
                  {a.observacoes ? (
                    <span className="text-text-faint"> · {a.observacoes}</span>
                  ) : null}
                </span>
                <form action={removerAusenciaAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg p-1 text-text-faint hover:text-garnet"
                    aria-label="Remover ausência"
                  >
                    <Trash2 size={13} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={action} className="space-y-2.5">
          <input type="hidden" name="professional_id" value={professionalId} />
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-text-soft">
                Data
              </span>
              <input
                type="date"
                name="data"
                required
                min={hoje}
                defaultValue={hoje}
                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-gold"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-text-soft">
                Motivo
              </span>
              <select
                name="motivo"
                defaultValue="folga"
                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-gold"
              >
                {MOTIVOS_AUSENCIA.map((m) => (
                  <option key={m} value={m}>
                    {MOTIVO_LABEL[m]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2 text-[12.5px] text-text">
            <input
              type="checkbox"
              name="dia_todo"
              checked={diaTodo}
              onChange={(e) => setDiaTodo(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[var(--color-gold-deep)]"
            />
            Dia inteiro
          </label>

          {!diaTodo && (
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold text-text-soft">
                  Início
                </span>
                <input
                  type="time"
                  name="hora_inicio"
                  className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-gold"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold text-text-soft">
                  Fim
                </span>
                <input
                  type="time"
                  name="hora_fim"
                  className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-gold"
                />
              </label>
            </div>
          )}

          <input
            type="text"
            name="observacoes"
            maxLength={300}
            placeholder="Observação (opcional)"
            className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-gold"
          />

          {state.error && (
            <p className="text-[12px] text-garnet">{state.error}</p>
          )}
          {state.ok && (
            <p className="text-[12px] font-semibold text-forest">
              Ausência registrada.
            </p>
          )}

          <SubmitButton pendingLabel="Salvando…">
            Registrar ausência de {nome.split(" ")[0]}
          </SubmitButton>
        </form>
      </div>
    </details>
  );
}

function ProfessionalFormModal({
  professional,
  funcionarios,
  servicos,
  servicosAtuais,
  onClose,
}: {
  professional: ProfessionalRow | null;
  funcionarios: FuncionarioVinculavel[];
  servicos: ServicoMin[];
  servicosAtuais: string[];
  onClose: () => void;
}) {
  const [state, action] = useActionState(saveProfessionalAction, INITIAL);
  const [comissao, setComissao] = useState(
    professional?.recebe_comissao ?? false,
  );
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const marcados = new Set(servicosAtuais);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  // funcionários que podem ser vinculados a ESTE profissional
  const disponiveis = funcionarios.filter(
    (f) =>
      f.professionalId === null ||
      (professional && f.professionalId === professional.id),
  );

  return (
    <Modal
      title={professional ? "Editar profissional" : "Novo profissional"}
      onClose={onClose}
    >
      <form action={action} className="space-y-4">
        {professional && <input type="hidden" name="id" value={professional.id} />}
        <input type="hidden" name="remover_foto" value={removerFoto ? "1" : ""} />

        <div className="flex items-center gap-3">
          <Avatar
            nome={professional?.nome}
            fotoUrl={
              fotoPreview ?? (removerFoto ? null : (professional?.foto_url ?? null))
            }
            size={56}
          />
          <div className="flex flex-col gap-1.5">
            <label className="cursor-pointer text-[12.5px] font-semibold text-gold-deep">
              {fotoPreview || (professional?.foto_url && !removerFoto)
                ? "Trocar foto"
                : "Adicionar foto"}
              <input
                type="file"
                name="foto"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setRemoverFoto(false);
                  setFotoPreview(URL.createObjectURL(file));
                }}
              />
            </label>
            {(professional?.foto_url || fotoPreview) && !removerFoto && (
              <button
                type="button"
                onClick={() => {
                  setRemoverFoto(true);
                  setFotoPreview(null);
                }}
                className="text-left text-[12.5px] font-semibold text-text-faint"
              >
                Remover foto
              </button>
            )}
          </div>
        </div>

        <TextField
          label="Nome"
          name="nome"
          required
          defaultValue={professional?.nome ?? ""}
          placeholder="Ex.: Renato Alves"
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Cargo"
            name="cargo"
            defaultValue={professional?.cargo ?? ""}
            placeholder="Profissional sênior"
          />
          <TextField
            label="Telefone"
            name="telefone"
            type="tel"
            defaultValue={professional?.telefone ?? ""}
            placeholder="(00) 00000-0000"
          />
        </div>

        <SelectField
          label="Conta de acesso"
          name="user_id"
          defaultValue={professional?.user_id ?? ""}
        >
          <option value="">Nenhuma (não usa o sistema)</option>
          {disponiveis.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
              {f.email ? ` · ${f.email}` : ""}
            </option>
          ))}
        </SelectField>
        {disponiveis.length === 0 && (
          <p className="-mt-2 text-[11.5px] text-text-faint">
            Nenhum funcionário disponível para vincular. Convide um em “Acesso ao
            sistema”.
          </p>
        )}

        <label className="flex items-center gap-2 text-[13px] text-text">
          <input
            type="checkbox"
            name="recebe_comissao"
            checked={comissao}
            onChange={(e) => setComissao(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--color-gold-deep)]"
          />
          Recebe comissão
        </label>
        {comissao && (
          <TextField
            label="Percentual de comissão (%)"
            name="percentual_comissao"
            type="number"
            min={0}
            max={100}
            step="0.5"
            defaultValue={professional?.percentual_comissao ?? 0}
          />
        )}

        <label className="flex items-center gap-2 text-[13px] text-text">
          <input
            type="checkbox"
            name="mostrar_no_link_online"
            defaultChecked={professional?.mostrar_no_link_online ?? true}
            className="h-4 w-4 rounded border-border accent-[var(--color-gold-deep)]"
          />
          Mostrar no link de agendamento online
        </label>

        <div>
          <span className="mb-1.5 block text-[12.5px] font-semibold text-text-soft">
            Serviços que faz
          </span>
          {servicos.length === 0 ? (
            <p className="text-[11.5px] text-text-faint">
              Nenhum serviço cadastrado ainda — cadastre em Serviços.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {servicos.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 text-[13px] text-text"
                >
                  <input
                    type="checkbox"
                    name="servicos"
                    value={s.id}
                    defaultChecked={marcados.has(s.id)}
                    className="h-4 w-4 rounded border-border accent-[var(--color-gold-deep)]"
                  />
                  {s.nome}
                </label>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-[11.5px] text-text-faint">
            Controla quem aparece na etapa “escolher profissional” do link de
            agendamento online.
          </p>
        </div>

        {state.error && (
          <p className="text-[12.5px] text-garnet">{state.error}</p>
        )}
        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
      </form>
    </Modal>
  );
}
