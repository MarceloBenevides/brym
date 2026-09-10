import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

export function ComingSoon({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fbf1dc]">
        <Icon size={22} className="text-gold-deep" />
      </div>
      <p className="max-w-sm text-[13.5px] text-text-soft">{children}</p>
      <span className="text-xs font-semibold tracking-wide text-text-faint">
        EM BREVE
      </span>
    </Card>
  );
}
