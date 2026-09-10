import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  redirect(ctx.tenant ? "/agenda" : "/onboarding");
}
