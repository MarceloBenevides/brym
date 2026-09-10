import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Tone = "neutral" | "gold" | "garnet" | "forest";

const TONES: Record<Tone, string> = {
  neutral: "bg-[#f1ece1] text-text-soft",
  gold: "bg-[#fbf1dc] text-gold-deep",
  garnet: "bg-[#f7e7e5] text-garnet",
  forest: "bg-[#e7efec] text-forest",
};

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
