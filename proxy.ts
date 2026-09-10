import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// Antes chamado "middleware" — renomeado para "proxy" no Next.js 16.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em tudo, menos:
     * - _next/static, _next/image
     * - favicon e arquivos de imagem
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
