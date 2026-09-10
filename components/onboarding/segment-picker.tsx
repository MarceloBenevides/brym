"use client";

import { useState } from "react";

import { SEGMENTOS } from "@/lib/segments";
import { cn } from "@/lib/cn";
import type { Segmento } from "@/types/database";

interface SegmentPickerProps {
  name?: string;
  defaultValue?: Segmento | null;
  dark?: boolean;
}

export function SegmentPicker({
  name = "segmento",
  defaultValue = null,
  dark = false,
}: SegmentPickerProps) {
  const [selected, setSelected] = useState<Segmento | null>(defaultValue);

  return (
    <div>
      <input type="hidden" name={name} value={selected ?? ""} />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SEGMENTOS.map((seg) => {
          const active = selected === seg.value;
          const Icon = seg.icon;
          return (
            <button
              type="button"
              key={seg.value}
              onClick={() => setSelected(seg.value)}
              aria-pressed={active}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
                active
                  ? "border-gold bg-gold/10"
                  : dark
                    ? "border-ink-line hover:border-text-faint"
                    : "border-border hover:border-gold/60",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  active ? "bg-linear-to-br from-gold to-gold-deep" : "bg-[#fbf1dc]",
                )}
              >
                <Icon
                  size={17}
                  className={active ? "text-ink" : "text-gold-deep"}
                />
              </div>
              <div>
                <div
                  className={cn(
                    "text-[13.5px] font-semibold",
                    dark ? "text-white" : "text-text",
                  )}
                >
                  {seg.label}
                </div>
                <div
                  className={cn(
                    "mt-0.5 text-[11.5px] leading-snug",
                    dark ? "text-text-faint" : "text-text-soft",
                  )}
                >
                  {seg.descricao}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
