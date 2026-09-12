"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/cn";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Texto/nó exibido no lugar de `children` enquanto pendente (opcional). */
  pendingLabel?: ReactNode;
}

/**
 * Botão de ação rápida dentro de `<form action={...}>` (excluir, alternar
 * status, marcar/desmarcar, revogar…) — mostra estado de carregamento via
 * `useFormStatus` sem impor layout: usa a própria `className` do chamador,
 * só soma `disabled` + opacidade reduzida durante o envio. Diferente de
 * `SubmitButton` (botão cheio de largura total dos modais de criar/editar).
 */
export function ActionButton({
  pendingLabel,
  className,
  children,
  disabled,
  ...props
}: ActionButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(className, "disabled:cursor-wait disabled:opacity-50")}
      {...props}
    >
      {pending && pendingLabel !== undefined ? pendingLabel : children}
    </button>
  );
}
