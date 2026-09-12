import { Menu } from "lucide-react";

import { AvatarMenu } from "@/components/app-shell/avatar-menu";
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
  onMenuClick,
  signOut,
}: {
  tenant: TenantRow;
  profile: ProfileRow;
  isOwner: boolean;
  onMenuClick?: () => void;
  signOut: () => Promise<void>;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-paper/85 px-4 py-3.5 backdrop-blur md:px-8">
      <div className="flex items-center gap-3 text-[13px] text-text-soft">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            aria-label="Abrir menu"
            className="-ml-1 rounded-lg p-1.5 text-text-soft hover:bg-[#f1ece1] md:hidden"
          >
            <Menu size={19} />
          </button>
        )}
        <div>
          <span className="font-semibold text-text">{tenant.nome}</span>
          <span className="text-text-faint"> · {segmentoLabel(tenant.segmento)}</span>
        </div>
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
        <AvatarMenu
          initials={initials(profile.nome || profile.email || "?")}
          signOut={signOut}
        />
      </div>
    </header>
  );
}
