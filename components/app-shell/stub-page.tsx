import type { LucideIcon } from "lucide-react";

import { ComingSoon } from "@/components/app-shell/coming-soon";
import { PageHeader } from "@/components/app-shell/page-header";
import { requireSection } from "@/lib/guards";

export async function StubPage({
  section,
  title,
  subtitle,
  icon,
  children,
}: {
  section: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: string;
}) {
  await requireSection(section);
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <ComingSoon icon={icon}>{children}</ComingSoon>
    </div>
  );
}
