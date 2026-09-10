"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/cn";

interface SubmitButtonProps {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "gold" | "ink";
  className?: string;
  /** Desabilita além do estado "pending" (ex.: formulário ainda inválido). */
  disabled?: boolean;
}

export function SubmitButton({
  children,
  pendingLabel = "Aguarde…",
  variant = "ink",
  className,
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-60",
        variant === "gold"
          ? "bg-linear-to-br from-gold to-gold-deep text-ink"
          : "bg-ink text-white",
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
