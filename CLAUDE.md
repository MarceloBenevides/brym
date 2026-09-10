@AGENTS.md

# BRYM — contexto do projeto

SaaS multi-tenant de gestão para negócios de atendimento. Ver `README.md`,
`brym-especificacao.md` (spec + roadmap) e `brym-prototype.jsx` (referência visual).

## Convenções

- **Idioma**: código, comentários, UI e nomes de tabela em **português** (pt-BR).
- **Next.js 16**: middleware virou `proxy.ts`. Rotas que leem sessão são
  `export const dynamic = "force-dynamic"`.
- **Supabase**: clientes ainda "untyped" (sem generic `Database`). Tipos de linha
  em `types/database.ts`, usados via `.select<Row>()` / `.maybeSingle<Row>()`.
  Regenerar com `supabase gen types` quando o schema estabilizar.
- **RLS**: toda tabela operacional carrega `tenant_id`; acesso via
  `public.current_tenant_id()` (SECURITY DEFINER). Nunca confie só no cliente.
- **Auth**: `lib/auth.ts` é a camada de acesso — use `getOwnerContext()` nos
  Server Components, nunca `getSession()` cru.
- **Design tokens**: cores/fontes em `app/globals.css` (`@theme`). Componentes
  base em `components/{brand,ui,app-shell}`.
- **Migrations**: `supabase/migrations/NNNN_nome.sql`, numeradas em sequência,
  aplicadas pelo SQL Editor.

## Verificação

`npm run lint && npm run build`. Teste de fluxo: `/cadastro` → escolher segmento
→ deve cair em `/agenda` com a sidebar e o nome do negócio na topbar.
