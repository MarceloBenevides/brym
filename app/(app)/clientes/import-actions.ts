"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOwner } from "@/lib/guards";
import { parseCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

export interface ImportResult {
  ok?: boolean;
  /** Erro geral que impede a importação (arquivo inválido, cabeçalho errado…). */
  error?: string;
  importados?: number;
  /** Telefone já cadastrado (ou repetido no próprio arquivo). */
  pulados?: number;
  /** Aniversário em formato inválido — a linha entrou, só sem a data. */
  avisos?: number;
  erros?: { linha: number; motivo: string }[];
}

const MAX_LINHAS = 5000;
const MAX_BYTES = 2 * 1024 * 1024;

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // tira acentos

const ALIASES: Record<string, string[]> = {
  nome: ["nome", "cliente"],
  telefone: ["telefone", "celular", "fone", "whatsapp"],
  email: ["email", "e-mail"],
  aniversario: ["aniversario", "nascimento", "data de nascimento"],
  observacoes: ["observacoes", "obs", "observacao", "notas"],
};

const emailSchema = z.string().trim().pipe(z.email());

function parseAniversario(v: string): { dia: number; mes: number } | null {
  const m = v.trim().match(/^(\d{1,2})[/\-.](\d{1,2})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
  return { dia, mes };
}

type Linha = {
  tenant_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  aniversario_dia: number | null;
  aniversario_mes: number | null;
  observacoes: string | null;
};

export async function importarClientesAction(
  _prev: ImportResult,
  formData: FormData,
): Promise<ImportResult> {
  const ctx = await requireOwner();

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Escolha um arquivo CSV." };
  }
  if (arquivo.size > MAX_BYTES) {
    return { error: "O arquivo precisa ter no máximo 2MB." };
  }

  let matriz: string[][];
  try {
    matriz = parseCsv(await arquivo.text());
  } catch {
    return { error: "Não foi possível ler o arquivo. Confira se é um CSV válido." };
  }
  if (matriz.length < 2) {
    return { error: "O arquivo não tem linhas de dados." };
  }

  const cabecalho = matriz[0].map(norm);
  const idx: Record<string, number> = {};
  for (const [campo, nomes] of Object.entries(ALIASES)) {
    idx[campo] = cabecalho.findIndex((h) => nomes.includes(h));
  }
  if (idx.nome < 0) {
    return { error: 'O cabeçalho precisa ter uma coluna "nome".' };
  }

  const dados = matriz.slice(1);
  if (dados.length > MAX_LINHAS) {
    return {
      error: `Máximo de ${MAX_LINHAS} linhas por importação (o arquivo tem ${dados.length}).`,
    };
  }

  const supabase = await createClient();
  const { data: existentes } = await supabase
    .from("clients")
    .select("telefone")
    .eq("ativo", true)
    .returns<{ telefone: string | null }[]>();
  const telefonesUsados = new Set(
    (existentes ?? [])
      .map((c) => (c.telefone ?? "").replace(/\D/g, ""))
      .filter((t) => t.length >= 8),
  );

  const erros: { linha: number; motivo: string }[] = [];
  let pulados = 0;
  let avisos = 0;
  const paraInserir: Linha[] = [];

  dados.forEach((linha, i) => {
    const nLinha = i + 2; // 1 = cabeçalho
    const get = (k: string) =>
      idx[k] >= 0 ? (linha[idx[k]] ?? "").trim() : "";

    const nome = get("nome");
    if (nome.length < 2) {
      erros.push({ linha: nLinha, motivo: "sem nome" });
      return;
    }

    let email: string | null = null;
    const emailRaw = get("email");
    if (emailRaw) {
      const parsed = emailSchema.safeParse(emailRaw);
      if (!parsed.success) {
        erros.push({ linha: nLinha, motivo: "e-mail inválido" });
        return;
      }
      email = parsed.data;
    }

    const telRaw = get("telefone");
    const telDigitos = telRaw.replace(/\D/g, "");
    const telefone = telDigitos.length >= 8 ? telRaw : null;

    if (telefone) {
      if (telefonesUsados.has(telDigitos)) {
        pulados++;
        return;
      }
      telefonesUsados.add(telDigitos);
    }

    let aniversario_dia: number | null = null;
    let aniversario_mes: number | null = null;
    const anivRaw = get("aniversario");
    if (anivRaw) {
      const a = parseAniversario(anivRaw);
      if (a) {
        aniversario_dia = a.dia;
        aniversario_mes = a.mes;
      } else {
        avisos++;
      }
    }

    paraInserir.push({
      tenant_id: ctx.tenant.id,
      nome,
      telefone,
      email,
      aniversario_dia,
      aniversario_mes,
      observacoes: get("observacoes") || null,
    });
  });

  let importados = 0;
  try {
    for (let i = 0; i < paraInserir.length; i += 500) {
      const lote = paraInserir.slice(i, i + 500);
      const r = await inserirLote(supabase, lote);
      importados += r.importados;
      pulados += r.pulados;
    }
  } catch {
    return {
      error:
        "Erro ao gravar os clientes. Parte pode ter sido importada — recarregue a lista.",
      importados,
      pulados,
      avisos,
      erros: erros.slice(0, 20),
    };
  }

  revalidatePath("/clientes");
  return { ok: true, importados, pulados, avisos, erros: erros.slice(0, 20) };
}

async function inserirLote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lote: Linha[],
): Promise<{ importados: number; pulados: number }> {
  const { error } = await supabase.from("clients").insert(lote);
  if (!error) return { importados: lote.length, pulados: 0 };
  if (error.code !== "23505") throw error;

  // Corrida com o trigger `clients_check_telefone` — insere uma a uma.
  let importados = 0;
  let pulados = 0;
  for (const row of lote) {
    const { error: e } = await supabase.from("clients").insert(row);
    if (!e) importados++;
    else if (e.code === "23505") pulados++;
    else throw e;
  }
  return { importados, pulados };
}
