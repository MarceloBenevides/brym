import type { ReactNode } from "react";

import { GoldStripe } from "@/components/brand/gold-stripe";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <GoldStripe />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10">
        <Logo dark />
        <div className="flex flex-1 items-center justify-center py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
