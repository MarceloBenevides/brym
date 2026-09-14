/**
 * Marca BRYM discreta no rodapé das telas públicas — antes ficava em
 * destaque no topo (ver `components/brand/negocio-header.tsx`, que tomou
 * esse lugar com a logo do próprio negócio). `mt-auto` empurra sozinho pro
 * fim da página porque o wrapper das páginas públicas já é `flex flex-col`.
 */
export function BrymFooter() {
  return (
    <div className="mt-auto flex items-center justify-center gap-1.5 pt-10 pb-2 text-text-faint">
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-linear-to-br from-gold to-gold-deep">
        <span className="font-display text-[9px] leading-none font-bold text-ink">
          B
        </span>
      </div>
      <span className="text-[11px] tracking-wide">powered by BRYM</span>
    </div>
  );
}
