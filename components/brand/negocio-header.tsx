import { Avatar } from "@/components/ui/avatar";

/**
 * Topo das telas públicas (/agendar/[slug], /portal/[slug]): logo do
 * negócio + nome, no lugar da marca BRYM (que migrou pro rodapé —
 * `components/brand/brym-footer.tsx`). Sem logo cadastrada, `Avatar` já
 * cai sozinho no círculo com a inicial — mesmo fallback de profissional
 * sem foto, sem lógica nova aqui.
 */
export function NegocioHeader({
  nome,
  logoUrl,
}: {
  nome: string;
  logoUrl?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar nome={nome} fotoUrl={logoUrl} size={44} tone="ink" />
      <div className="font-display text-lg font-semibold text-white">
        {nome}
      </div>
    </div>
  );
}
