"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Phone, Trash2, User } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import {
  AGENDA_FIM,
  AGENDA_INICIO,
  addMinutos,
  dataPorExtenso,
  faixasCruzam,
  gerarSlots,
  hojeISO,
  horaEmMinutos,
  somarDias,
} from "@/lib/agenda";
import { MESES_NOMES } from "@/lib/aniversario";
import { formatBRL, formatDuracao } from "@/lib/format";
import {
  buscarDisponibilidadeAction,
  confirmarReservaAction,
  type ConfirmarResultado,
  type Disponibilidade,
} from "./actions";

export interface Categoria {
  id: string;
  nome: string;
}
export interface CatalogoServico {
  id: string;
  nome: string;
  category_id: string | null;
  duracao_min: number;
  preco: number;
}
export interface CatalogoProfissional {
  id: string;
  nome: string;
  cargo: string | null;
  foto_url: string | null;
  servicos: string[];
}
export interface Catalogo {
  encontrado: boolean;
  negocio_nome?: string;
  negocio_logo_url?: string | null;
  intervalo_min?: number;
  categorias?: Categoria[];
  servicos?: CatalogoServico[];
  profissionais?: CatalogoProfissional[];
}

interface ItemCarrinho {
  id: string;
  servico: CatalogoServico;
  profissional: CatalogoProfissional;
  data: string;
  hora_inicio: string;
}

type Passo = "servicos" | "profissional" | "horario" | "carrinho" | "dados" | "confirmado";

const SEM_CATEGORIA = "__sem__";

export function AgendarWizard({
  slug,
  catalogo,
}: {
  slug: string;
  catalogo: Catalogo;
}) {
  const servicos = catalogo.servicos ?? [];
  const categorias = catalogo.categorias ?? [];
  const profissionais = catalogo.profissionais ?? [];

  const [passo, setPasso] = useState<Passo>("servicos");
  const [servicoAtual, setServicoAtual] = useState<CatalogoServico | null>(null);
  const [profissionalAtual, setProfissionalAtual] =
    useState<CatalogoProfissional | null>(null);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [modalAdicionado, setModalAdicionado] = useState<ItemCarrinho | null>(
    null,
  );
  const [confirmado, setConfirmado] = useState<ConfirmarResultado | null>(null);

  const adicionarAoCarrinho = (data: string, hora: string) => {
    if (!servicoAtual || !profissionalAtual) return;
    const item: ItemCarrinho = {
      id: crypto.randomUUID(),
      servico: servicoAtual,
      profissional: profissionalAtual,
      data,
      hora_inicio: hora,
    };
    setCarrinho((c) => [...c, item]);
    setModalAdicionado(item);
  };

  const removerDoCarrinho = (id: string) =>
    setCarrinho((c) => c.filter((i) => i.id !== id));

  return (
    <div className="flex-1 py-6">
      <h1 className="mb-6 font-display text-2xl font-semibold text-white">
        Agendar horário
      </h1>

      {passo === "servicos" && (
        <EtapaServicos
          servicos={servicos}
          categorias={categorias}
          onReservar={(s) => {
            setServicoAtual(s);
            setPasso("profissional");
          }}
        />
      )}

      {passo === "profissional" && servicoAtual && (
        <EtapaProfissional
          servico={servicoAtual}
          profissionais={profissionais.filter((p) =>
            p.servicos.includes(servicoAtual.id),
          )}
          onVoltar={() => setPasso("servicos")}
          onEscolher={(p) => {
            setProfissionalAtual(p);
            setPasso("horario");
          }}
        />
      )}

      {passo === "horario" && servicoAtual && profissionalAtual && (
        <EtapaHorario
          slug={slug}
          servico={servicoAtual}
          profissional={profissionalAtual}
          intervaloMin={catalogo.intervalo_min ?? 30}
          carrinho={carrinho}
          onVoltar={() => setPasso("profissional")}
          onEscolher={adicionarAoCarrinho}
        />
      )}

      {passo === "carrinho" && (
        <EtapaCarrinho
          carrinho={carrinho}
          onRemover={removerDoCarrinho}
          onAdicionarServico={() => {
            setServicoAtual(null);
            setProfissionalAtual(null);
            setPasso("servicos");
          }}
          onFinalizar={() => setPasso("dados")}
        />
      )}

      {passo === "dados" && (
        <EtapaDados
          slug={slug}
          carrinho={carrinho}
          onVoltar={() => setPasso("carrinho")}
          onRemover={removerDoCarrinho}
          onConfirmado={(resultado) => {
            setConfirmado(resultado);
            setCarrinho([]);
            setPasso("confirmado");
          }}
        />
      )}

      {passo === "confirmado" && confirmado && (
        <EtapaConfirmado slug={slug} resultado={confirmado} />
      )}

      {modalAdicionado && (
        <Modal title="Adicionado ao carrinho" onClose={() => setModalAdicionado(null)}>
          <p className="mb-5 text-[13.5px] text-text-soft">
            <span className="font-semibold text-text">
              {modalAdicionado.servico.nome}
            </span>{" "}
            com {modalAdicionado.profissional.nome} em{" "}
            {dataBRcurta(modalAdicionado.data)} às {modalAdicionado.hora_inicio}.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setModalAdicionado(null);
                setServicoAtual(null);
                setProfissionalAtual(null);
                setPasso("servicos");
              }}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-soft"
            >
              Adicionar mais um serviço
            </button>
            <button
              onClick={() => {
                setModalAdicionado(null);
                setPasso("carrinho");
              }}
              className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"
            >
              Continuar
            </button>
            <button
              onClick={() => {
                setModalAdicionado(null);
                setPasso("carrinho");
              }}
              className="text-[12.5px] font-semibold text-text-faint"
            >
              Ver carrinho ({carrinho.length})
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function dataBRcurta(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// ------------------------------------------------------------------
// Etapa 1 — serviços por categoria
// ------------------------------------------------------------------
function EtapaServicos({
  servicos,
  categorias,
  onReservar,
}: {
  servicos: CatalogoServico[];
  categorias: Categoria[];
  onReservar: (s: CatalogoServico) => void;
}) {
  const grupos = useMemo(() => {
    const porCategoria = new Map<string, CatalogoServico[]>();
    for (const s of servicos) {
      const key = s.category_id ?? SEM_CATEGORIA;
      const lista = porCategoria.get(key) ?? [];
      lista.push(s);
      porCategoria.set(key, lista);
    }
    const g = categorias
      .filter((c) => porCategoria.has(c.id))
      .map((c) => ({ id: c.id, nome: c.nome, servicos: porCategoria.get(c.id)! }));
    if (porCategoria.has(SEM_CATEGORIA)) {
      g.push({
        id: SEM_CATEGORIA,
        nome: "Outros serviços",
        servicos: porCategoria.get(SEM_CATEGORIA)!,
      });
    }
    return g;
  }, [servicos, categorias]);

  const [abertas, setAbertas] = useState<Set<string>>(
    () => new Set(grupos.map((g) => g.id)),
  );
  const toggle = (id: string) =>
    setAbertas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (servicos.length === 0) {
    return (
      <p className="text-[13.5px] text-text-faint">
        Nenhum serviço disponível para agendamento online no momento.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {grupos.map((g) => (
        <div key={g.id} className="rounded-2xl border border-ink-line">
          <button
            onClick={() => toggle(g.id)}
            className="flex w-full items-center justify-between px-4 py-3.5"
          >
            <span className="text-[13.5px] font-semibold text-white">
              {g.nome}{" "}
              <span className="text-text-faint">· {g.servicos.length}</span>
            </span>
            <ChevronDown
              size={16}
              className={`text-text-faint transition-transform ${
                abertas.has(g.id) ? "rotate-180" : ""
              }`}
            />
          </button>
          {abertas.has(g.id) && (
            <div className="border-t border-ink-line">
              {g.servicos.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 border-t border-ink-line px-4 py-3.5 first:border-t-0"
                >
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-white">
                      {s.nome}
                    </div>
                    <div className="text-[12px] text-text-faint">
                      {formatDuracao(s.duracao_min)} · a partir de{" "}
                      {formatBRL(s.preco)}
                    </div>
                  </div>
                  <button
                    onClick={() => onReservar(s)}
                    className="shrink-0 rounded-xl bg-gold-deep px-3.5 py-2 text-[12.5px] font-semibold text-ink"
                  >
                    Reservar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Etapa 2 — profissional
// ------------------------------------------------------------------
function EtapaProfissional({
  servico,
  profissionais,
  onVoltar,
  onEscolher,
}: {
  servico: CatalogoServico;
  profissionais: CatalogoProfissional[];
  onVoltar: () => void;
  onEscolher: (p: CatalogoProfissional) => void;
}) {
  return (
    <div>
      <Cabecalho servico={servico} onVoltar={onVoltar} />
      <p className="mb-3 text-[12.5px] font-semibold tracking-wide text-text-faint uppercase">
        Escolha o profissional
      </p>
      {profissionais.length === 0 ? (
        <p className="text-[13.5px] text-text-faint">
          Nenhum profissional disponível para esse serviço no momento.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {profissionais.map((p) => (
            <button
              key={p.id}
              onClick={() => onEscolher(p)}
              className="rounded-2xl border border-ink-line bg-ink-soft px-4 py-5 text-center"
            >
              <Avatar
                nome={p.nome}
                fotoUrl={p.foto_url}
                size={48}
                tone="ink"
                className="mx-auto mb-2"
              />
              <div className="text-[13px] font-semibold text-white">{p.nome}</div>
              {p.cargo && (
                <div className="text-[11.5px] text-text-faint">{p.cargo}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Etapa 3 — data e horário
// ------------------------------------------------------------------
const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function EtapaHorario({
  slug,
  servico,
  profissional,
  intervaloMin,
  carrinho,
  onVoltar,
  onEscolher,
}: {
  slug: string;
  servico: CatalogoServico;
  profissional: CatalogoProfissional;
  intervaloMin: number;
  carrinho: ItemCarrinho[];
  onVoltar: () => void;
  onEscolher: (data: string, hora: string) => void;
}) {
  const hoje = hojeISO();
  const [inicioSemana, setInicioSemana] = useState(hoje);
  const [diaEscolhido, setDiaEscolhido] = useState(hoje);
  const [disp, setDisp] = useState<Disponibilidade | null>(null);
  const [carregando, startTransition] = useTransition();

  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => somarDias(inicioSemana, i)),
    [inicioSemana],
  );

  const buscarDisponibilidade = (data: string) => {
    startTransition(async () => {
      const r = await buscarDisponibilidadeAction(slug, profissional.id, data);
      setDisp(r);
    });
  };

  const escolherDia = (data: string) => {
    setDiaEscolhido(data);
    buscarDisponibilidade(data);
  };

  // busca a disponibilidade do primeiro dia visível (já selecionado no useState)
  useEffect(() => {
    buscarDisponibilidade(hoje);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const podeVoltarSemana = inicioSemana > hoje;

  const slots = useMemo(() => {
    if (!disp?.ok || disp.fechado || disp.ausente_dia) return [];
    const passo = disp.intervalo_min ?? intervaloMin;
    const abre = disp.abre ?? AGENDA_INICIO;
    const fecha = disp.fecha ?? AGENDA_FIM;
    const todos = gerarSlots(abre, fecha, passo);
    const doCarrinho = carrinho
      .filter((i) => i.profissional.id === profissional.id && i.data === diaEscolhido)
      .map((i) => ({
        inicio: i.hora_inicio,
        fim: addMinutos(i.hora_inicio, i.servico.duracao_min),
      }));
    const bloqueios = [...(disp.ocupados ?? []), ...doCarrinho];
    return todos.filter((hora) => {
      const fim = addMinutos(hora, servico.duracao_min);
      if (fim > fecha) return false;
      if (
        diaEscolhido === (disp.hoje ?? hoje) &&
        horaEmMinutos(hora) < (disp.agora_min ?? 0)
      ) {
        return false;
      }
      return !bloqueios.some((b) => faixasCruzam(hora, fim, b.inicio, b.fim));
    });
  }, [disp, carrinho, profissional.id, diaEscolhido, servico.duracao_min, intervaloMin, hoje]);

  return (
    <div>
      <Cabecalho servico={servico} profissional={profissional} onVoltar={onVoltar} />

      <div className="mb-4 flex items-center justify-between">
        <button
          disabled={!podeVoltarSemana}
          onClick={() => setInicioSemana((d) => somarDias(d, -7))}
          className="rounded-lg border border-ink-line p-2 text-text-faint disabled:opacity-30"
          aria-label="Semana anterior"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-[12.5px] font-semibold text-text-faint">
          {dataPorExtenso(diaEscolhido)}
        </span>
        <button
          onClick={() => setInicioSemana((d) => somarDias(d, 7))}
          className="rounded-lg border border-ink-line p-2 text-text-faint"
          aria-label="Próxima semana"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="mb-5 grid grid-cols-7 gap-1.5">
        {dias.map((d) => {
          const data = new Date(`${d}T12:00:00`);
          const ativo = d === diaEscolhido;
          return (
            <button
              key={d}
              onClick={() => escolherDia(d)}
              className={`rounded-xl border px-1 py-2.5 text-center ${
                ativo
                  ? "border-gold bg-gold-deep text-ink"
                  : "border-ink-line bg-ink-soft text-text-faint"
              }`}
            >
              <div className="text-[10.5px] uppercase">
                {DIAS_SEMANA[data.getDay()]}
              </div>
              <div className="text-[13.5px] font-semibold">{data.getDate()}</div>
            </button>
          );
        })}
      </div>

      {carregando ? (
        <p className="text-[13px] text-text-faint">Carregando horários…</p>
      ) : disp?.ok && disp.fechado ? (
        <p className="text-[13px] text-text-faint">
          Fechado nesse dia. Escolha outra data.
        </p>
      ) : disp?.ok && disp.ausente_dia ? (
        <p className="text-[13px] text-text-faint">
          {profissional.nome} não atende nesse dia. Tente outra data ou
          profissional.
        </p>
      ) : slots.length === 0 ? (
        <p className="text-[13px] text-text-faint">
          Sem horários livres nesse dia. Tente outra data.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {slots.map((hora) => (
            <button
              key={hora}
              onClick={() => onEscolher(diaEscolhido, hora)}
              className="rounded-xl border border-ink-line bg-ink-soft py-2 text-center font-mono text-[12.5px] text-white hover:border-gold"
            >
              {hora}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Cabecalho({
  servico,
  profissional,
  onVoltar,
}: {
  servico: CatalogoServico;
  profissional?: CatalogoProfissional;
  onVoltar: () => void;
}) {
  return (
    <div className="mb-5">
      <button
        onClick={onVoltar}
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-gold"
      >
        <ChevronLeft size={14} /> Voltar
      </button>
      <div className="rounded-xl border border-ink-line bg-ink-soft px-4 py-3">
        <div className="text-[13.5px] font-semibold text-white">{servico.nome}</div>
        <div className="text-[12px] text-text-faint">
          {formatDuracao(servico.duracao_min)} · a partir de{" "}
          {formatBRL(servico.preco)}
          {profissional ? ` · ${profissional.nome}` : ""}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Etapa 4 — carrinho
// ------------------------------------------------------------------
function EtapaCarrinho({
  carrinho,
  onRemover,
  onAdicionarServico,
  onFinalizar,
}: {
  carrinho: ItemCarrinho[];
  onRemover: (id: string) => void;
  onAdicionarServico: () => void;
  onFinalizar: () => void;
}) {
  const total = carrinho.reduce((s, i) => s + i.servico.preco, 0);

  return (
    <div>
      <h2 className="mb-4 text-[13px] font-semibold tracking-wide text-text-faint uppercase">
        Seu carrinho
      </h2>

      {carrinho.length === 0 ? (
        <p className="mb-5 text-[13.5px] text-text-faint">
          Seu carrinho está vazio. Escolha um serviço para começar.
        </p>
      ) : (
        <div className="mb-5 space-y-2">
          {carrinho.map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink-line bg-ink-soft px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-white">
                  {i.servico.nome}
                </div>
                <div className="text-[12px] text-text-faint">
                  {dataBRcurta(i.data)} às {i.hora_inicio} · {i.profissional.nome} ·{" "}
                  {formatBRL(i.servico.preco)}
                </div>
              </div>
              <button
                onClick={() => onRemover(i.id)}
                className="shrink-0 rounded-lg p-1.5 text-text-faint hover:text-garnet"
                aria-label={`Remover ${i.servico.nome}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between px-1 pt-1 text-[13px] text-text-faint">
            <span>Total (a partir de)</span>
            <span className="font-mono font-semibold text-white">
              {formatBRL(total)}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <button
          onClick={onAdicionarServico}
          className="rounded-xl border border-ink-line px-4 py-2.5 text-sm font-semibold text-text-soft"
        >
          Adicionar outro serviço
        </button>
        <button
          disabled={carrinho.length === 0}
          onClick={onFinalizar}
          className="rounded-xl bg-gold-deep px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50"
        >
          Finalizar reserva
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Etapa 5 — dados do cliente (nome + telefone) e confirmação
// ------------------------------------------------------------------
const MOTIVO_LABEL: Record<string, string> = {
  negocio: "Não encontramos esse negócio. Recarregue a página e tente de novo.",
  nome: "Informe seu nome.",
  telefone: "Informe um telefone válido.",
  carrinho_vazio: "Seu carrinho está vazio.",
  carrinho_grande: "Você pode reservar no máximo 5 serviços de uma vez.",
  limite:
    "Você já tem várias reservas em aberto aqui — fale direto com o negócio pra mais horários.",
  item_invalido: "Um dos itens do carrinho ficou inválido. Remova-o e tente de novo.",
  servico_invalido: "Um dos serviços não está mais disponível.",
  profissional_invalido: "Um dos profissionais não está mais disponível.",
  vinculo_invalido: "Um dos profissionais não faz mais esse serviço.",
  passado: "Um dos horários escolhidos já passou.",
  fora_do_horario: "Um dos horários escolhidos ficou fora do expediente.",
  fechado: "O negócio não abre num dos dias escolhidos.",
  ausente: "O profissional ficou indisponível num dos horários escolhidos.",
  ocupado: "Esse horário acabou de ser ocupado por outra pessoa.",
  erro: "Não foi possível confirmar agora. Tente de novo em instantes.",
};

function EtapaDados({
  slug,
  carrinho,
  onVoltar,
  onRemover,
  onConfirmado,
}: {
  slug: string;
  carrinho: ItemCarrinho[];
  onVoltar: () => void;
  onRemover: (id: string) => void;
  onConfirmado: (resultado: ConfirmarResultado) => void;
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [aniversarioDia, setAniversarioDia] = useState("");
  const [aniversarioMes, setAniversarioMes] = useState("");
  const [erro, setErro] = useState<{ msg: string; itemId?: string } | null>(null);
  const [enviando, startTransition] = useTransition();

  const total = carrinho.reduce((s, i) => s + i.servico.preco, 0);
  const valido = nome.trim().length > 0 && telefone.replace(/\D/g, "").length >= 8;

  const confirmar = () => {
    setErro(null);
    startTransition(async () => {
      // Só faz sentido mandar o par completo — um dia sem mês (ou vice-versa)
      // não identifica uma data; o RPC também ignora par incompleto.
      const dia = Number(aniversarioDia) || undefined;
      const mes = Number(aniversarioMes) || undefined;
      const resultado = await confirmarReservaAction(
        slug,
        nome.trim(),
        telefone,
        carrinho.map((i) => ({
          servico_id: i.servico.id,
          professional_id: i.profissional.id,
          data: i.data,
          hora_inicio: i.hora_inicio,
        })),
        dia && mes ? dia : undefined,
        dia && mes ? mes : undefined,
      );
      if (resultado.ok) {
        onConfirmado(resultado);
        return;
      }
      const item =
        typeof resultado.item_index === "number" && resultado.item_index >= 0
          ? carrinho[resultado.item_index]
          : undefined;
      setErro({
        msg: MOTIVO_LABEL[resultado.motivo ?? "erro"] ?? MOTIVO_LABEL.erro,
        itemId: item?.id,
      });
    });
  };

  return (
    <div>
      <button
        onClick={onVoltar}
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-gold"
      >
        <ChevronLeft size={14} /> Voltar pro carrinho
      </button>

      <h2 className="mb-4 text-[13px] font-semibold tracking-wide text-text-faint uppercase">
        Seus dados
      </h2>

      <div className="mb-5 space-y-2">
        {carrinho.map((i) => (
          <div
            key={i.id}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
              erro?.itemId === i.id
                ? "border-garnet bg-garnet/10"
                : "border-ink-line bg-ink-soft"
            }`}
          >
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-white">
                {i.servico.nome}
              </div>
              <div className="text-[12px] text-text-faint">
                {dataBRcurta(i.data)} às {i.hora_inicio} · {i.profissional.nome} ·{" "}
                {formatBRL(i.servico.preco)}
              </div>
              {erro?.itemId === i.id && (
                <div className="mt-1 text-[11.5px] font-semibold text-garnet">
                  {erro.msg}
                </div>
              )}
            </div>
            <button
              onClick={() => onRemover(i.id)}
              className="shrink-0 rounded-lg p-1.5 text-text-faint hover:text-garnet"
              aria-label={`Remover ${i.servico.nome}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <div className="flex items-center justify-between px-1 pt-1 text-[13px] text-text-faint">
          <span>Total (a partir de)</span>
          <span className="font-mono font-semibold text-white">
            {formatBRL(total)}
          </span>
        </div>
      </div>

      <div className="mb-5 space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-ink-line bg-ink-soft px-3.5 py-3">
          <User size={16} className="text-text-faint" />
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-text-faint"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-ink-line bg-ink-soft px-3.5 py-3">
          <Phone size={16} className="text-text-faint" />
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            type="tel"
            autoComplete="tel"
            placeholder="(00) 00000-0000"
            className="flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-text-faint"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-[12px] font-semibold text-text-faint">
            Aniversário (opcional)
          </span>
          <div className="flex gap-2">
            <input
              value={aniversarioDia}
              onChange={(e) => setAniversarioDia(e.target.value.replace(/\D/g, "").slice(0, 2))}
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              placeholder="Dia"
              aria-label="Dia do aniversário"
              className="w-20 rounded-xl border border-ink-line bg-ink-soft px-3.5 py-3 text-sm text-white outline-none placeholder:text-text-faint"
            />
            <select
              value={aniversarioMes}
              onChange={(e) => setAniversarioMes(e.target.value)}
              aria-label="Mês do aniversário"
              className="flex-1 rounded-xl border border-ink-line bg-ink-soft px-3.5 py-3 text-sm text-white outline-none"
            >
              <option value="">Mês</option>
              {MESES_NOMES.map((nomeMes, i) => (
                <option key={nomeMes} value={i + 1}>
                  {nomeMes}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {erro && !erro.itemId && (
        <p className="mb-3 text-[12.5px] text-garnet">{erro.msg}</p>
      )}

      <button
        disabled={!valido || enviando}
        onClick={confirmar}
        className="w-full rounded-xl bg-gold-deep px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50"
      >
        {enviando ? "Confirmando…" : "Confirmar reserva"}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------
// Etapa 6 — confirmação
// ------------------------------------------------------------------
function EtapaConfirmado({
  slug,
  resultado,
}: {
  slug: string;
  resultado: ConfirmarResultado;
}) {
  const agendamentos = resultado.agendamentos ?? [];
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-white">
        Reserva confirmada!
      </h1>
      <p className="mb-6 text-[13.5px] text-text-faint">
        {resultado.cliente_nome ? `Até breve, ${resultado.cliente_nome.split(" ")[0]}. ` : ""}
        Anotamos {agendamentos.length === 1 ? "seu horário" : "seus horários"}:
      </p>

      <div className="mb-6 space-y-2">
        {agendamentos.map((a, i) => (
          <div
            key={i}
            className="rounded-xl border border-ink-line bg-ink-soft p-4"
          >
            <div className="text-[14.5px] font-semibold text-white">
              {a.servico_nome}
            </div>
            <div className="mt-0.5 text-[12.5px] text-text-faint">
              {dataBRcurta(a.data)} às {a.hora_inicio} · com {a.profissional_nome}
            </div>
          </div>
        ))}
      </div>

      <a
        href={`/portal/${slug}`}
        className="inline-flex w-full items-center justify-center rounded-xl border border-ink-line px-4 py-3 text-sm font-semibold text-text-soft"
      >
        Ver meus agendamentos
      </a>
    </div>
  );
}
