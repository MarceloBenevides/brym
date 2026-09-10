import type { SelectHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export function SelectField({
  label,
  className,
  id,
  name,
  children,
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-text-soft">
        {label}
      </span>
      <select
        id={fieldId}
        name={name}
        className={cn(
          "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-text outline-none",
          "focus:border-gold focus:ring-2 focus:ring-gold/25",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
