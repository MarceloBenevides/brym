import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  /** Estilo para fundo escuro (telas de auth). */
  dark?: boolean;
}

export function TextField({
  label,
  hint,
  dark = false,
  className,
  id,
  name,
  ...props
}: TextFieldProps) {
  const fieldId = id ?? name;
  return (
    <label htmlFor={fieldId} className="block">
      <span
        className={cn(
          "mb-1.5 block text-[12.5px] font-semibold",
          dark ? "text-text-faint" : "text-text-soft",
        )}
      >
        {label}
      </span>
      <input
        id={fieldId}
        name={name}
        className={cn(
          "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors",
          "focus:border-gold focus:ring-2 focus:ring-gold/25",
          dark
            ? "border-ink-line bg-ink-soft text-white placeholder:text-text-faint"
            : "border-border bg-card text-text placeholder:text-text-faint",
          className,
        )}
        {...props}
      />
      {hint && (
        <span
          className={cn(
            "mt-1.5 block text-xs",
            dark ? "text-text-faint" : "text-text-soft",
          )}
        >
          {hint}
        </span>
      )}
    </label>
  );
}
