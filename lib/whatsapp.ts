export function primeiroNome(nome: string): string {
  return (nome ?? "").trim().split(/\s+/)[0] || nome || "";
}

/**
 * Link `wa.me` com o DDI do negócio à frente do telefone.
 * `null` quando não dá pra montar (sem número ou número curto demais).
 */
export function linkWhatsApp(
  telefone: string | null | undefined,
  mensagem: string,
  ddi: string,
): string | null {
  const tel = (telefone ?? "").replace(/\D/g, "");
  const cod = (ddi ?? "").replace(/\D/g, "") || "55";
  if (tel.length < 8) return null;
  const numero = tel.startsWith(cod) ? tel : `${cod}${tel}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
