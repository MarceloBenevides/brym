import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-[26px] font-semibold text-text">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-[13.5px] text-text-soft">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
