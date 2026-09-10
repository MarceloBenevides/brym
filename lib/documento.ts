/** Validação de CPF / CNPJ (formato + dígitos verificadores). */

export type TipoDocumento = "cpf" | "cnpj";

export interface DocumentoValidado {
  valido: boolean;
  tipo: TipoDocumento | null;
  /** Só dígitos. */
  limpo: string;
}

function digitos(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

function cpfValido(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (fim: number) => {
    let soma = 0;
    for (let i = 0; i < fim; i++) soma += Number(cpf[i]) * (fim + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function cnpjValido(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (fim: number) => {
    const pesos =
      fim === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < fim; i++) soma += Number(cnpj[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

export function validarCpfCnpj(valor: string | null | undefined): DocumentoValidado {
  const limpo = digitos(valor ?? "");
  if (limpo.length === 11) {
    return { valido: cpfValido(limpo), tipo: "cpf", limpo };
  }
  if (limpo.length === 14) {
    return { valido: cnpjValido(limpo), tipo: "cnpj", limpo };
  }
  return { valido: false, tipo: null, limpo };
}

/** "12345678909" → "123.456.789-09" · CNPJ → "12.345.678/0001-90" */
export function formatarCpfCnpj(valor: string | null | undefined): string {
  const d = digitos(valor ?? "");
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return valor ?? "";
}
