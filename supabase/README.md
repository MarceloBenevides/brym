# Banco de dados (Supabase)

O banco de produção **não roda localmente nem na Hostinger** — vive no Supabase,
sempre online. Este diretório guarda só o schema versionado.

## Aplicar a migration inicial

1. Crie um projeto grátis em [supabase.com](https://supabase.com/dashboard).
2. **Project Settings → API**: copie a `Project URL` e a chave pública
   (`Publishable key` nos projetos novos, ou `anon key` nos antigos) para o
   `.env.local` do projeto — veja `.env.example`.
3. **SQL Editor → New query**: rode as migrations em ordem —
   [`0001_init_tenancy.sql`](migrations/0001_init_tenancy.sql),
   [`0002_employees_invites.sql`](migrations/0002_employees_invites.sql),
   [`0003_professionals_services.sql`](migrations/0003_professionals_services.sql),
   [`0004_clients.sql`](migrations/0004_clients.sql),
   [`0005_appointments.sql`](migrations/0005_appointments.sql),
   [`0006_professional_account_link.sql`](migrations/0006_professional_account_link.sql),
   [`0007_fix_profiles_grants.sql`](migrations/0007_fix_profiles_grants.sql),
   [`0008_client_portal.sql`](migrations/0008_client_portal.sql),
   [`0009_expenses.sql`](migrations/0009_expenses.sql),
   [`0010_comandas.sql`](migrations/0010_comandas.sql).
4. **Authentication → Providers → Email**: enquanto estiver desenvolvendo,
   desligue **"Confirm email"**. Assim o cadastro do dono já entra direto no
   sistema. Em produção, deixe ligado (o fluxo de confirmação por e-mail já
   está implementado em `app/auth/confirm/route.ts`).

## O que a 0001 cria

| Objeto | Papel |
|---|---|
| `tenants` | um por negócio; guarda nome, slug, `segmento`, plano/status de assinatura |
| `profiles` | pessoas com acesso (dono/funcionário). Espelha `auth.users`. A spec chama de `users`; renomeado para não colidir com `auth.users` |
| `tenant_settings` | flags de configuração do negócio (§2.5 da spec) |
| `service_categories` | categorias de serviço, populadas conforme o segmento no onboarding |
| `current_tenant_id()` | função `SECURITY DEFINER` usada nas políticas de RLS |
| `create_tenant_for_current_user(nome, segmento, telefone)` | RPC de onboarding: cria tenant + perfil do dono + settings + categorias |
| `handle_new_user()` + trigger | cria um `profile` vazio assim que alguém se registra |
| `invitations` (0002) | convites de funcionário por link (token, permissões, status) — RLS só do dono |
| `profiles.permissoes` (0002) | seções liberadas para o funcionário (`text[]`) |
| `invitation_preview` / `accept_invitation` / `my_pending_invitation` / `is_owner` (0002) | RPCs do fluxo de convite |
| `professionals` / `services` (0003) | cadastro de quem atende e do que é oferecido; RLS por tenant |
| `has_section(secao)` (0003) | dono OU funcionário com a permissão → pode gerenciar a seção |
| `clients` (0004) | ficha do cliente; leitura para o tenant, escrita com seção `clientes`; trigger de telefone único conforme `permitir_cliente_mesmo_telefone` |
| `appointments` (0005/0006) | agendamentos; trigger bloqueia conflito; RLS: funcionário vinculado só grava nos próprios (`my_professional_id()`), dono e balcão gravam em qualquer um |
| `professionals.user_id` + `invitations.criar_profissional` (0006) | vínculo profissional↔login; convite pode já criar o profissional no aceite |
| `set_employee_permissions` (0006) · `my_professional_id` (0006) | RPCs do vínculo/permissões |
| grants de `profiles` (0006/0007) | `authenticated` só faz `update` de `nome`/`telefone`; `permissoes`/`papel`/`tenant_id`/`ativo` só via funções SECURITY DEFINER |
| `portal_tenant_nome` / `portal_lookup` (0008) | RPCs públicas (`anon`) do portal do cliente — consulta por telefone, retorna só dados curados sem valores |
| `expenses` (0009) | despesas; RLS `has_section('financeiro')` — só dono ou funcionário com a permissão lê/escreve |
| `comandas` / `comanda_items` / `payments` (0010) | comanda 1:1 com agendamento; RLS: financeiro OU profissional dono da comanda. `payments.client_id` é snapshot p/ devolver saldo. RPCs `abrir_comanda` / `fechar_comanda` / `reabrir_comanda` (reabrir só `financeiro`). Triggers: pagamento "saldo" move `clients.saldo_credito`; excluir comanda volta agendamento p/ `confirmado` |

Todo o acesso é isolado por **Row Level Security**: um dono só enxerga dados do
próprio `tenant_id`.

## Gerar tipos TypeScript (opcional, quando o schema crescer)

```bash
npx supabase gen types typescript --project-id <ref-do-projeto> > types/database.ts
```

## Migrations futuras

Numere em sequência (`0002_...`, `0003_...`) e aplique na mesma ordem pelo SQL
Editor. Quando quiser automatizar, instale a
[Supabase CLI](https://supabase.com/docs/guides/cli) e use `supabase link` +
`supabase db push`.
