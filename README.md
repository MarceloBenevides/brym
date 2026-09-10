# BRYM

SaaS de gestão para negócios de atendimento (barbearias, salões, clínicas,
estúdios). Multi-tenant, com 3 perfis: **dono**, **funcionário** e **cliente**.

Stack: **Next.js 16** (App Router) · **Tailwind CSS v4** · **Supabase**
(Postgres + Auth + RLS). Deploy previsto: Vercel (frontend) + Supabase (dados).

---

## Status — Fase 1a

| Entregue | O quê |
|---|---|
| ✅ | Estrutura Next.js + Tailwind com a identidade visual do protótipo (marca BRYM, paleta ink/dourado/papel, fontes Fraunces + Inter + IBM Plex Mono) |
| ✅ | Cadastro e login do dono (e-mail/senha, Supabase Auth) |
| ✅ | Criação automática do tenant no onboarding (escolha de segmento → tenant + perfil + configurações + categorias de serviço) |
| ✅ | Isolamento multi-tenant por Row Level Security |
| ✅ | Shell de navegação (sidebar + topbar) com as 9 seções do protótipo |
| ✅ | **1a-ii** — convite de funcionário por link, aceite, papel `employee` com permissões por seção, enforcement na navegação e nas rotas |
| ✅ | **1b-i** — cadastro de Serviços + Categorias (tela própria) e Profissionais (aba em Equipe), com RLS por permissão |
| ✅ | **1b-ii** — Clientes: busca, lista, formulário e ficha (telefone único conforme config do negócio) |
| ✅ | **1b-iii** — Agenda: grade dia-a-dia por profissional, criar/editar/cancelar, status, sem conflito de horário |
| ✅ | **1a-iii** — vínculo profissional↔conta de acesso; permissão "Ver agenda da equipe"; agenda do funcionário filtrada + colunas alheias só-leitura; editar permissões de funcionário |
| ✅ | **1b-iv** — portal do cliente: `/portal/[slug]` público, consulta por telefone, agendamentos + histórico sem valores |

**Fase 1 (a + b) completa.**

| Fase 2 (Financeiro) | |
|---|---|
| ✅ | **2a** — Despesas: navegação por mês, total/pago/pendente, CRUD, RLS por `financeiro` |
| ✅ | **2b** — Comandas: abre do agendamento (1:1), itens (serviços), pagamentos multi-forma + saldo na casa, fechar/reabrir/excluir, integração com a Agenda |
| ✅ | **2c** — Relatórios: faturamento no tempo (gráfico), por serviço e por forma de pagamento, filtro de período; só comandas fechadas |
| ✅ | **2d** — Comissões: registro por comanda ao fechar (`a_pagar`/`pago`), aba Comissões com baixa de pagamento; "Meu desempenho" para o funcionário |

**Fase 2 (Financeiro) completa.**

| Fase 3 (Operação) | |
|---|---|
| ✅ | **3a** — Configurações: tela do dono editando `tenant_settings` (intervalo da agenda, flags de recursos, mensagens); as flags `habilitar_estoque`/`habilitar_fornecedores` ligam/desligam as seções na navegação |
| ✅ | **3b** — Produtos + Estoque: catálogo com categorias, controle de estoque (venda na comanda abate, remover/excluir devolve, tudo logado em `estoque_movimentos`), "Ajustar estoque", alerta de mínimo; produto não gera comissão; Relatórios com "Vendas por produto" |
| ✅ | **3c** — Fornecedores: cadastro (nome/telefone/e-mail/observações) + escolha do fornecedor ao lançar uma entrada de estoque, com o nome no histórico de movimentações |
| ✅ | **3e** — Aniversariantes: lista do mês (nav de mês, filtro "pendentes"), botão "Parabenizar" abre o WhatsApp com a mensagem da config e marca o cliente no ano; DDI do país configurável em Configurações |
| ⏸ | 3d Pacotes — adiado (modelo ainda em aberto) |

**Fase 3 completa** (exceto Pacotes, adiado).

| Fase 4 (Agendamento online) | |
|---|---|
| ✅ | **4a** — Página pública `/agendar/[slug]`: catálogo por categoria, escolha de profissional (filtrado por `professional_services`), grade de horários (choca com agenda + carrinho + passado), carrinho com múltiplos itens; vínculo serviço↔profissional editável em Equipe → Profissionais |
| ✅ | **4b** — Confirmação da reserva: coleta nome+telefone, RPC `agendar_confirmar` acha/cria o cliente pelo telefone e cria os agendamentos numa transação "tudo ou nada" (revalida cada item contra o catálogo, cap de 8 agendamentos futuros por telefone), tela de sucesso com link pro portal do cliente |

| Ajustes pós-Fase 4 | |
|---|---|
| ✅ | **Foto do profissional** — upload no cadastro (Equipe → Profissionais) via Supabase Storage (bucket público `fotos-profissionais`, primeiro uso de Storage no projeto); aparece na Agenda interna e na etapa "escolher profissional" do link público; trocar/remover reflete na hora (cache-buster `?v=`); fallback pro círculo de iniciais (`components/ui/avatar.tsx`) |
| ✅ | **Custo do produto** — campo `custo` (valor de compra) ao lado do `preco` (valor de venda) no cadastro de Produto; `comanda_items.custo_unitario` guarda o custo congelado no momento da venda (snapshot, igual `valor_unitario`), pra a margem histórica não mudar se o custo for editado depois |
| ✅ | **Relatório de produtos com margem** — aba **Relatório** dentro de Produtos (não precisa entrar em Financeiro): faturamento e margem (`faturamento − custo`) por produto e no total, com filtro de período; RPC `relatorio_produtos` acessível por quem tem a seção `produtos`; margem só aparece quando todas as vendas do produto no período têm custo registrado (senão "—") |
| ✅ | **Venda avulsa** — botão "Nova venda" em Financeiro → Comandas abre uma comanda de balcão sem agendamento (`comandas.appointment_id` opcional), sem cliente/profissional; só aceita itens de produto (trigger no banco); RPC `abrir_venda_avulsa` exige a seção `financeiro` |
| ✅ | **Fix do subtítulo** — Agenda/Financeiro/Aniversários ganharam `export const dynamic = "force-dynamic"`; sem isso o roteador otimista do Next 16 congelava o subtítulo do cabeçalho ao navegar dia/mês pelas setas |

| CRM enxuto (recência de clientes) | |
|---|---|
| ✅ | **1 — Régua + dashboard** — seção **CRM** classifica clientes por dias desde o último atendimento concluído (Novo/Ativo/Em atenção/Inativo/Perdido); régua configurável em Configurações (padrão 35/70/140); dashboard `/crm` com a contagem por status; RPC `crm_panorama` (respeita "barbeiro só vê quem atendeu") |
| ✅ | **2 — Recuperar + WhatsApp** — lista "Para recuperar" (Em atenção + Inativo, os quase-sumindo primeiro) com link `wa.me` manual (mensagem configurável); botão "Contatar" registra em `crm_contatos` e o cliente sai da lista por 30 dias (selo "contatado" + desmarcar, padrão Aniversariantes) |
| ✅ | **3 — Cartões clicáveis** — cada cartão de status abre a lista daquele status (`/crm?status=…`); Em atenção/Inativo mantêm o controle de esconder-30-dias, os outros (Novo/Ativo/Perdido) são só visualização + contato geral (link `wa.me` sem registrar nada) |

| Plataforma (item 19) | |
|---|---|
| ✅ | **Painel de admin da plataforma** — `/admin` (fora do shell de tenant), só pra `profiles.plataforma_admin` (flag marcada manualmente no SQL). Métricas agregadas: nº de negócios, status (trial/ativo/…), contagem de uso por negócio (agendamentos/comandas/clientes — só o número) + contato do dono. RPC `plataforma_panorama` **não expõe** conteúdo de cliente final (nomes/telefones/valores) — isso fica pro futuro fluxo de suporte com auditoria. Link discreto "Plataforma" na sidebar quando você é admin |
| ✅ | **Ativar/suspender negócio pelo painel** — botões contextuais na tabela do `/admin` mudam `tenants.status_assinatura` (RPC `plataforma_set_status`, ponte manual até o Stripe). `suspenso`/`cancelado` **bloqueiam o acesso**: dono e funcionários caem em `/conta-suspensa` (checagem em `requireApp`). `trial`/`ativo` funcionam normal |
| ✅ | **Importar/Exportar clientes (CSV)** — na tela de Clientes, **só o dono** (nem funcionário com a seção `clientes`). Exportar = `/clientes/exportar` (route handler, baixa ativos + inativos com coluna `ativo`; `?modelo=1` = modelo em branco). Importar = modal com upload; parser CSV próprio (`lib/csv.ts`), colunas `nome`(obrig.)/`telefone`/`email`/`aniversario`(dd/mm)/`observacoes`; telefone já cadastrado → pula e informa; resumo "N importados · N pulados · N erros (linha X)" |

| Agenda: horário e ausências | |
|---|---|
| ✅ | **Horário de funcionamento** — por dia da semana em Configurações, com dia fechado (ex.: domingo). `tenant_settings.horario_funcionamento` (jsonb, chaves `"0"`–`"6"`, 0 = domingo). Substitui a janela fixa 08:00–20:00: vale **rígido no link público** (`agendar_disponibilidade`/`agendar_confirmar` recusam fora do horário ou em dia fechado); na **Agenda interna** os slots fora do expediente somem da grade + banner, mas o dono ainda cria agendamento manual (agendamento fora da janela não some — a grade se estende) |
| ✅ | **Ausências de profissional** — folga/falta/atraso, dia inteiro ou intervalo. Cadastro **só do dono** em Equipe → Profissionais (`<details>` "Ausências" por profissional; o funcionário vinculado não marca a própria). Tabela `ausencias` (RLS: SELECT p/ qualquer membro, gerência só `is_owner()`). **Link público** bloqueia rígido (`ausente_dia` some da grade, intervalos entram em `ocupados`, `agendar_confirmar` → `motivo:'ausente'`). **Agenda interna** marca visualmente (faixa no topo da coluna + blocos "ausente" nos slots) e avisa no modal (⚠ amarelo), mas o dono **consegue** agendar por cima — sem trigger novo em `appointments` |

| Assinatura (gateway genérico) | |
|---|---|
| ✅ | **Máquina de assinatura genérica** — `tenants.assinatura_ativa_ate` governa o acesso pago (liberado enquanto `now() <` ela); `lib/assinatura.ts` (`estadoAssinatura` → trial/trial_expirado/ativa/em_atraso/vencida/suspensa_admin/comp, `destinoBloqueio`) + gate no `requireApp`: trial expirado ou assinatura vencida → `/assinar`; `suspenso`/`cancelado` (manual do BRYM) → `/conta-suspensa`. Tabela `pagamento_eventos` (idempotência por `id`, tag `gateway`), RPC `assinatura_processar_evento(p_gateway,…)` (service role) com ações ativar/renovar/atraso/encerrar. Fila de "pagamentos não vinculados" no `/admin` (`assinatura_vincular_evento`). Página `app/(auth)/assinar` (status + 3 cards de plano) + faixa no topo do app (atraso / trial acabando ≤ 5 dias) + item "Assinatura" na sidebar |
| ✅ | **Asaas — gateway ATIVO (Pix, mercado BR)** — o Checkout recorrente do Asaas só aceita cartão, então "Assinar" cria a assinatura pela API: `POST /customers` (nome + **CPF/CNPJ** do dono, coletado no BRYM num passo único) → `POST /subscriptions` (`billingType: "UNDEFINED"`, mensal, `externalReference = tenant_id`) → redireciona o dono pra `invoiceUrl` da 1ª cobrança, onde ele paga por **Pix, boleto ou cartão** (escolha dele). Webhook `POST /api/asaas/webhook` valida o header `asaas-access-token`, resolve o negócio pelo `externalReference` → `gateway_customer_id` → `gateway_subscription_id`, e mapeia: `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED` → ativa (+33 dias), `PAYMENT_OVERDUE` → 7 dias de carência, `PAYMENT_REFUNDED`/chargeback/`SUBSCRIPTION_DELETED` → encerra. "Cancelar assinatura" = `DELETE /v3/subscriptions/{id}`; trocar de plano = cancela + reassina |
| ⏸ | **Stripe — DORMENTE (expansão europeia)** — `/api/stripe/webhook` + `/api/stripe/portal` + `lib/stripe*.ts` continuam no código, só sem tráfego. As `STRIPE_*` env ficam vazias |

Migrations `0001`–`0033` verificadas end-to-end contra o Supabase.

**Setup do admin da plataforma** (uma vez, no SQL Editor, depois da migration 0027):
```sql
update public.profiles set plataforma_admin = true
where id = (select id from auth.users where email = 'SEU-EMAIL');
```

**Setup do Asaas** (env — ver `.env.example`): `ASAAS_ENV` (`sandbox`|`production`),
`ASAAS_API_KEY` (`$aact_hmlg_…` sandbox / `$aact_prod_…` prod), `ASAAS_WEBHOOK_TOKEN`
(você escolhe, 32–255 chars) e `SUPABASE_SERVICE_ROLE_KEY` (o webhook escreve sem
sessão). No painel do Asaas: Configurações → Integrações → Webhooks → URL
`https://<domínio>/api/asaas/webhook`, `asaas-access-token` = o `ASAAS_WEBHOOK_TOKEN`,
eventos de **Cobrança** (`PAYMENT_*`) e de **Assinatura** (`SUBSCRIPTION_*`), `sendType`
SEQUENTIALLY. Pra o Pix aparecer na página de pagamento, criar uma **chave Pix** na conta
Asaas. O CPF/CNPJ do dono é coletado no BRYM (`/assinar`, passo único) — o Asaas exige
pra criar o cliente.

---

## Configuração local

### 1. Pré-requisitos
- Node.js 20+ e npm (já instalados)
- Uma conta grátis no [Supabase](https://supabase.com)

### 2. Instalar dependências
```bash
npm install
```

### 3. Banco de dados
Siga [`supabase/README.md`](supabase/README.md):
1. Crie um projeto no Supabase.
2. Rode `supabase/migrations/0001_init_tenancy.sql` no SQL Editor.
3. Em Authentication → Providers → Email, **desligue "Confirm email"** para
   desenvolvimento.

### 4. Variáveis de ambiente
```bash
cp .env.example .env.local
```
Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
(ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`) com os valores de Project Settings → API.

### 5. Rodar
```bash
npm run dev
```
Abra <http://localhost:3000>. Vá em **Cadastre seu negócio**, preencha e escolha
um segmento — você cai direto no painel.

---

## Scripts
| Comando | Ação |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | ESLint |

---

## Organização

```
app/
  (auth)/            login · cadastro · onboarding  (layout ink escuro)
  (app)/             área autenticada (sidebar + topbar, fundo papel)
    equipe/          time + convites de funcionário (só o dono)
  convite/[token]/   aceite de convite (rota pública)
  auth/
    actions.ts       server actions: signIn / signUp / createTenant / signOut
    confirm/route.ts destino do link de confirmação de e-mail
  page.tsx           "/" → redireciona conforme sessão/tenant
components/
  brand/  ui/  app-shell/  onboarding/  equipe/
lib/
  supabase/          client (browser) · server · proxy (updateSession)
  auth.ts            DAL: getSessionClaims / getAppContext (React cache)
  guards.ts          requireApp / requireSection / requireOwner
  permissions.ts     seções liberáveis + checagem de acesso
  segments.ts        segmentos + rótulos
proxy.ts             refresh de sessão + redirects (era "middleware")
supabase/migrations/ schema versionado (0001 tenancy, 0002 funcionários)
types/database.ts    tipos das tabelas (à mão nesta fase)
```

Referência de posicionamento e roadmap completo: `brym-especificacao.md`.
Referência visual: `brym-prototype.jsx`.
