/**
 * Parser/serializer CSV mínimo — sem dependência externa.
 * Cobre o suficiente pra planilha de clientes (Excel / Google Sheets).
 */

/** Detecta o delimitador (`,` ou `;`) pela 1ª linha não-vazia. */
function detectarDelim(texto: string): "," | ";" {
  const primeira = texto.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const virgulas = (primeira.match(/,/g) ?? []).length;
  const pontos = (primeira.match(/;/g) ?? []).length;
  return pontos > virgulas ? ";" : ",";
}

/**
 * Lê um CSV em matriz de strings. Trata BOM, aspas duplas (`"a,b"`, `""` escape),
 * quebras `\r\n`/`\n`. Linhas totalmente vazias são descartadas.
 */
export function parseCsv(texto: string): string[][] {
  const semBom = texto.replace(/^﻿/, "");
  const delim = detectarDelim(semBom);

  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroAspas = false;

  for (let i = 0; i < semBom.length; i++) {
    const c = semBom[i];

    if (dentroAspas) {
      if (c === '"') {
        if (semBom[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      dentroAspas = true;
    } else if (c === delim) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && semBom[i + 1] === "\n") i++;
      linha.push(campo);
      campo = "";
      if (linha.some((v) => v.trim() !== "")) linhas.push(linha);
      linha = [];
    } else {
      campo += c;
    }
  }
  // último campo/linha (arquivo sem quebra no fim)
  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    if (linha.some((v) => v.trim() !== "")) linhas.push(linha);
  }

  return linhas;
}

function escapar(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serializa uma matriz em CSV (delimitador `;`, com BOM pro Excel). */
export function toCsv(linhas: (string | number | null)[][]): string {
  return "﻿" + linhas.map((l) => l.map(escapar).join(";")).join("\r\n");
}
