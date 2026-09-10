"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(20,23,28,0.55)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "max-h-[85vh] w-full overflow-y-auto rounded-2xl bg-card",
          wide ? "max-w-2xl" : "max-w-md",
        )}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h3 className="font-display text-lg font-semibold text-text">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#f1ece1] p-1.5 transition-opacity hover:opacity-70"
            aria-label="Fechar"
          >
            <X size={16} className="text-text-soft" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
