import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/** Prefixos de rota acessíveis sem sessão. */
const PUBLIC_PREFIXES = [
  "/login",
  "/cadastro",
  "/auth",
  "/convite",
  "/portal",
  "/agendar",
  // Webhooks de pagamento (sem sessão; validação = assinatura/token do evento).
  // O /api/stripe/portal se protege sozinho.
  "/api/stripe",
  "/api/asaas",
];

/** Rotas de autenticação — usuário já logado é mandado para dentro do app. */
const AUTH_PREFIXES = ["/login", "/cadastro"];

const HOME = "/agenda";

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Faz o refresh do token do Supabase a cada request e aplica redirects
 * otimistas (baseados só no cookie). A checagem de verdade fica nos
 * layouts/servidor — ver `lib/auth.ts`.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Sem env configurado ainda: não bloqueia o boot do projeto.
  if (!SUPABASE_URL || !SUPABASE_KEY) return supabaseResponse;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
        for (const [key, val] of Object.entries(headers)) {
          supabaseResponse.headers.set(key, val);
        }
      },
    },
  });

  // IMPORTANTE: chamar antes de qualquer lógica, para disparar o refresh.
  const { data } = await supabase.auth.getClaims();
  const isAuthed = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isPublic = pathname === "/" || startsWithAny(pathname, PUBLIC_PREFIXES);

  if (!isAuthed && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthed && (pathname === "/" || startsWithAny(pathname, AUTH_PREFIXES))) {
    const url = request.nextUrl.clone();
    url.pathname = HOME;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
