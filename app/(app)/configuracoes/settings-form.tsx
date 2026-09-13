"use client";

import { useActionState, useState } from "react";

import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { DIAS_SEMANA_LONGO } from "@/lib/agenda";
import { secaoLiberadaPeloPlano } from "@/lib/planos";
import { INTERVALOS_AGENDAMENTO, MENSAGEM_MAX } from "@/lib/settings";
import type { PlanoAssinatura, TenantSettingsRow } from "@/types/database";
import { saveSettingsAction, type FormState } from "./actions";

const INITIAL: FormState = {};

export function SettingsForm({
  settings,
  plano,
}: {
  settings: TenantSettingsRow;
  plano: PlanoAssinatura | null;
}) {
  const [state, action] = useActionState(saveSettingsAction, INITIAL);
  const temProdutos = secaoLiberadaPeloPlano("produtos", plano);
  const temFornecedores = secaoLiberadaPeloPlano("fornecedores", plano);
  const temCrm = secaoLiberadaPeloPlano("crm", plano);

  return (
    <form action={action} className="space-y-6">
      <Secao titulo="Agenda">
        <SelectField
          label="Intervalo entre horários"
          name="intervalo_agendamento_min"
          defaultValue={String(settings.intervalo_agendamento_min)}
          className="max-w-[200px]"
        >
          {INTERVALOS_AGENDAMENTO.map((m) => (
            <option key={m} value={m}>
              {m} min
            </option>
          ))}
        </SelectField>
        <p className="mt-1.5 text-[12px] text-text-faint">
          Define de quanto em quanto tempo a grade da Agenda mostra um horário.
        </p>
      </Secao>

      <Secao titulo="Horário de funcionamento">
        <p className="text-[12px] text-text-faint">
          Vale para o link público de agendamento (o cliente não consegue marcar
          fora disso) e some da grade da Agenda os horários fora do expediente.
        </p>
        <HorarioFuncionamento horarios={settings.horario_funcionamento} />
      </Secao>

      <Secao titulo="Clientes">
        <LinhaToggle
          name="permitir_cliente_mesmo_telefone"
          defaultChecked={settings.permitir_cliente_mesmo_telefone}
          label="Permitir clientes com o mesmo telefone"
          caption="Sem isso, o telefone precisa ser único no cadastro de clientes."
        />
      </Secao>

      <Secao titulo="Recursos">
        {temProdutos ? (
          <LinhaToggle
            name="habilitar_estoque"
            defaultChecked={settings.habilitar_estoque}
            label="Controle de estoque"
            caption="Mostra a seção Produtos e o controle de entrada/saída."
          />
        ) : (
          // Fora do plano: some o toggle, mas preserva o valor atual no
          // salvar (senão o campo some do FormData e a action lê como "off").
          settings.habilitar_estoque && (
            <input type="hidden" name="habilitar_estoque" value="on" />
          )
        )}
        {temFornecedores ? (
          <LinhaToggle
            name="habilitar_fornecedores"
            defaultChecked={settings.habilitar_fornecedores}
            label="Fornecedores"
            caption="Mostra a seção Fornecedores (contatos e compras de reposição)."
          />
        ) : (
          settings.habilitar_fornecedores && (
            <input type="hidden" name="habilitar_fornecedores" value="on" />
          )
        )}
        <LinhaToggle
          name="habilitar_pacotes"
          defaultChecked={settings.habilitar_pacotes}
          label="Pacotes de sessões"
          caption="Passa a valer quando os Pacotes forem lançados."
        />
      </Secao>

      <Secao titulo="Comandas">
        <LinhaToggle
          name="exibir_comandas_pendentes"
          defaultChecked={settings.exibir_comandas_pendentes}
          label="Destacar comandas pendentes"
          caption="Passa a valer com o painel inicial."
        />
        <LinhaToggle
          name="controlar_dinheiro_caixa"
          defaultChecked={settings.controlar_dinheiro_caixa}
          label="Controlar dinheiro em caixa"
          caption="Passa a valer com o fechamento de caixa."
        />
      </Secao>

      {temCrm ? (
        <Secao titulo="Recuperação de clientes (CRM)">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              label="Ativo até (dias)"
              name="crm_dias_ativo"
              type="number"
              min={1}
              max={3650}
              defaultValue={settings.crm_dias_ativo}
            />
            <TextField
              label="Em atenção até (dias)"
              name="crm_dias_atencao"
              type="number"
              min={1}
              max={3650}
              defaultValue={settings.crm_dias_atencao}
            />
            <TextField
              label="Inativo até (dias)"
              name="crm_dias_inativo"
              type="number"
              min={1}
              max={3650}
              defaultValue={settings.crm_dias_inativo}
            />
          </div>
          <p className="mt-1.5 text-[12px] text-text-faint">
            Dias sem vir (desde o último atendimento concluído) que separam os
            status. Acima do último limite, o cliente é considerado “Perdido”.
          </p>
          <CampoTexto
            name="mensagem_recuperacao"
            label="Mensagem de recuperação (WhatsApp)"
            defaultValue={settings.mensagem_recuperacao ?? ""}
          />
        </Secao>
      ) : (
        // Fora do plano: some a seção, mas preserva os valores atuais no
        // salvar — o schema da action exige esses 3 campos sempre.
        <>
          <input type="hidden" name="crm_dias_ativo" value={settings.crm_dias_ativo} />
          <input type="hidden" name="crm_dias_atencao" value={settings.crm_dias_atencao} />
          <input type="hidden" name="crm_dias_inativo" value={settings.crm_dias_inativo} />
          <input
            type="hidden"
            name="mensagem_recuperacao"
            value={settings.mensagem_recuperacao ?? ""}
          />
        </>
      )}

      <Secao titulo="Mensagens">
        <div>
          <TextField
            label="Código do país (DDI) para o WhatsApp"
            name="ddi"
            inputMode="numeric"
            defaultValue={settings.ddi}
            className="max-w-[140px]"
          />
          <p className="mt-1.5 text-[12px] text-text-faint">
            Usado nos links de WhatsApp (aniversário, recuperação). 55 Brasil ·
            351 Portugal · 34 Espanha.
          </p>
        </div>
        <CampoTexto
          name="mensagem_confirmacao"
          label="Confirmação de agendamento"
          defaultValue={settings.mensagem_confirmacao ?? ""}
        />
        <CampoTexto
          name="mensagem_aniversario"
          label="Aniversário do cliente"
          defaultValue={settings.mensagem_aniversario ?? ""}
        />
      </Secao>

      <div className="flex items-center gap-3">
        <div className="w-40">
          <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
        </div>
        {state.error && (
          <span className="text-[12.5px] text-garnet">{state.error}</span>
        )}
        {state.ok && (
          <span className="text-[12.5px] font-semibold text-forest">Salvo.</span>
        )}
      </div>
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
    <Card className="p-6">
      <h2 className="mb-4 font-display text-lg font-semibold text-text">
        {titulo}
      </h2>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function HorarioFuncionamento({
  horarios,
}: {
  horarios: TenantSettingsRow["horario_funcionamento"];
}) {
  return (
    <div className="space-y-2">
      {DIAS_SEMANA_LONGO.map((rotulo, d) => (
        <LinhaHorario
          key={d}
          dia={d}
          rotulo={rotulo}
          valor={horarios?.[String(d)] ?? null}
        />
      ))}
    </div>
  );
}

function LinhaHorario({
  dia,
  rotulo,
  valor,
}: {
  dia: number;
  rotulo: string;
  valor: { abre: string; fecha: string } | null;
}) {
  const [aberto, setAberto] = useState(valor != null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex w-32 shrink-0 items-center gap-2">
        <input
          type="checkbox"
          name={`hf_${dia}_aberto`}
          checked={aberto}
          onChange={(e) => setAberto(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-[var(--color-gold-deep)]"
        />
        <span className="text-[13px] text-text">{rotulo}</span>
      </label>
      {aberto ? (
        <div className="flex items-center gap-2">
          <input
            type="time"
            name={`hf_${dia}_abre`}
            defaultValue={valor?.abre ?? "08:00"}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm outline-none focus:border-gold"
          />
          <span className="text-[12px] text-text-faint">até</span>
          <input
            type="time"
            name={`hf_${dia}_fecha`}
            defaultValue={valor?.fecha ?? "20:00"}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm outline-none focus:border-gold"
          />
        </div>
      ) : (
        <span className="text-[12.5px] text-text-faint">Fechado</span>
      )}
    </div>
  );
}

function LinhaToggle({
  name,
  label,
  caption,
  defaultChecked,
}: {
  name: string;
  label: string;
  caption: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-border accent-[var(--color-gold-deep)]"
      />
      <span>
        <span className="block text-[13.5px] text-text">{label}</span>
        <span className="block text-[12px] text-text-faint">{caption}</span>
      </span>
    </label>
  );
}

function CampoTexto({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label htmlFor={name} className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-text-soft">
        {label}
      </span>
      <textarea
        id={name}
        name={name}
        rows={3}
        maxLength={MENSAGEM_MAX}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
      />
    </label>
  );
}
