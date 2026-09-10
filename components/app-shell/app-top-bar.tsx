import { Pill } from "@/components/ui/pill";
import { segmentoLabel } from "@/lib/segments";
import type { ProfileRow, TenantRow } from "@/types/database";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

const PLANO_LABEL: Record<string, string> = {
  trial: "avaliação",
  ativo: "ativo",
  suspenso: "suspenso",
  cancelado: "cancelado",
};

export function AppTopBar({
  tenant,
  profile,
  isOwner,
}: {
  tenant: TenantRow;
  profile: ProfileRow;
  isOwner: boolean;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-paper/85 px-8 py-3.5 backdrop-blur">
      <div className="text-[13px] text-text-soft">
        <span className="font-semibold text-text">{tenant.nome}</span>
        <span className="text-text-faint"> · {segmentoLabel(tenant.segmento)}</span>
      </div>
      <div className="flex items-center gap-3">
        {isOwner ? (
          <Pill tone={tenant.status_assinatura === "trial" ? "gold" : "forest"}>
            Plano{" "}
            {PLANO_LABEL[tenant.status_assinatura] ?? tenant.status_assinatura}
          </Pill>
        ) : (
          <Pill tone="neutral">Funcionário</Pill>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-[13px] font-semibold text-ink">
          {initials(profile.nome || profile.email || "?")}
        </div>
      </div>
    </header>
  );
}
