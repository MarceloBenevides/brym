import { cn } from "@/lib/cn";

interface LogoProps {
  /** Usa cores claras (para fundo ink). */
  dark?: boolean;
  /** Esconde a linha de assinatura embaixo da marca. */
  compact?: boolean;
  className?: string;
}

export function Logo({ dark = false, compact = false, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-gold to-gold-deep">
        <span className="font-display text-[17px] leading-none font-bold text-ink">
          B
        </span>
      </div>
      <div>
        <div
          className={cn(
            "font-display text-xl leading-none font-semibold",
            dark ? "text-white" : "text-text",
          )}
        >
          BRYM
        </div>
        {!compact && (
          <div
            className={cn(
              "text-[10.5px] tracking-[0.14em]",
              dark ? "text-text-faint" : "text-text-soft",
            )}
          >
            GESTÃO PARA NEGÓCIOS DE ATENDIMENTO
          </div>
        )}
      </div>
    </div>
  );
}
