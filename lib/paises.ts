/** Países aceitos no seletor de telefone do cadastro (Brasil + UE principais). */

export interface Pais {
  /** ISO 3166-1 alpha-2, usado pelo libphonenumber-js. */
  iso2: string;
  nome: string;
  bandeira: string;
}

export const PAISES: Pais[] = [
  { iso2: "BR", nome: "Brasil", bandeira: "🇧🇷" },
  { iso2: "PT", nome: "Portugal", bandeira: "🇵🇹" },
  { iso2: "ES", nome: "Espanha", bandeira: "🇪🇸" },
  { iso2: "FR", nome: "França", bandeira: "🇫🇷" },
  { iso2: "IT", nome: "Itália", bandeira: "🇮🇹" },
  { iso2: "DE", nome: "Alemanha", bandeira: "🇩🇪" },
  { iso2: "NL", nome: "Países Baixos", bandeira: "🇳🇱" },
  { iso2: "BE", nome: "Bélgica", bandeira: "🇧🇪" },
  { iso2: "IE", nome: "Irlanda", bandeira: "🇮🇪" },
];

export const PAIS_PADRAO = "BR";

export function isPaisSuportado(iso2: string): boolean {
  return PAISES.some((p) => p.iso2 === iso2);
}
