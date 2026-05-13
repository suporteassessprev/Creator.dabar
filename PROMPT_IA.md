# Contexto do Projeto — ViralPost

## O que é
SaaS de geração de carrosséis virais para redes sociais usando IA (Google Gemini). Usuários geram, editam e exportam carrosséis. Há planos pagos via Stripe, marketplace de templates, e API pública para desenvolvedores.

## Stack
- **Framework:** Next.js 14.2.5 — App Router (sem Pages Router)
- **Banco:** Prisma 6 + SQLite (dev) / PostgreSQL (prod)
- **Auth:** JWT manual com `jose`, cookie httpOnly `viralpost_session`
- **Pagamentos:** Stripe (checkout, webhook, portal)
- **IA:** Google Gemini via `@google/generative-ai`
- **Email:** Resend
- **UI:** Tailwind CSS + Framer Motion + lucide-react
- **Runtime:** Node.js — **não usar Edge Runtime**

## Estrutura de pastas
```
app/
  (rotas públicas)    → /, /pricing, /login, /register, /reset-password
  dashboard/          → painel do usuário autenticado
  generator/          → gerador de carrosséis
  editor/             → editor visual
  billing/            → assinatura e API keys
  settings/           → configurações
  marketplace/        → templates públicos + submissão
  admin/
    login/            → login separado para admin
    (protected)/      → painel admin (analytics, templates, prompts, users, carousels, marketplace)
  api/
    auth/             → register, login, logout, verify-email, forgot-password, reset-password
    billing/          → checkout, webhook (Stripe), portal
    carousels/        → CRUD de carrosséis
    user/             → subscription, credits, usage, apikeys
    admin/            → templates, prompts, marketplace (admin only)
    marketplace/      → templates públicos, submit
    v1/generate       → API pública autenticada por Bearer key
    generate/         → geração interna (usuário logado)

lib/
  db.ts              → instância Prisma singleton
  auth.ts            → verifyToken, setSessionCookie, clearSessionCookie
  billing.ts         → checkCanGenerate, consumeCredit
  plans.ts           → definição dos planos free/pro/business
  stripe.ts          → cliente Stripe
  mailer.ts          → envio de emails via Resend
  prompt-service.ts  → buildPrompt (busca prompts do banco)
  rate-limit.ts      → rate limiter em memória (Redis-ready)

middleware.ts        → protege /dashboard, /generator, /editor, /billing,
                       /settings, /marketplace/submit, /admin/*
                       Runtime: nodejs (não Edge)

prisma/
  schema.prisma      → schema v5
  seed.ts            → upsert de planos (free/pro/business) + admin
```

## Modelos Prisma principais
- **User** — role: "USER" | "ADMIN", emailVerified, stripeCustomerId
- **Carousel** + **Slide** — carrosséis do usuário
- **Template** + **TemplateSlide** — templates do marketplace
- **PromptConfig** + **PromptVersion** — prompts versionados para a IA
- **Plan** — free / pro / business (priceMonthly, creditsPerMonth, etc.)
- **Subscription** — plano ativo do usuário (status, stripeSubscriptionId)
- **CreditBalance** — saldo de créditos do usuário
- **UsageLog** — log de uso (action, topic, creditsUsed)
- **ApiKey** — chaves da API pública (plano business, hash bcrypt)
- **EmailToken** — tokens de verificação/reset de email
- **TemplateSubmission** — submissões do marketplace aguardando aprovação
- **ProcessedWebhookEvent** — idempotência do webhook Stripe

## Autenticação
- **Usuários:** cookie `viralpost_session` com JWT (role: "USER")
- **Admin:** cookie `viralpost_admin_session` com JWT (role: "ADMIN")
- **API pública:** header `Authorization: Bearer vp_live_<key>` (hash bcrypt no banco)
- Middleware protege rotas automaticamente e redireciona para `/login?from=<path>`

## Planos
```
free:     10 créditos/mês, sem export ZIP, sem API
pro:      100 créditos/mês, export ZIP, sem API  ($19/mês)
business: ilimitado, export ZIP, API keys         ($49/mês)
```

## Variáveis de ambiente necessárias
```
DATABASE_URL=file:./dev.db
JWT_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
GEMINI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_BUSINESS_PRICE_ID=
RESEND_API_KEY=
EMAIL_FROM=
ADMIN_EMAIL=
```

## Regras importantes ao mexer no código

1. **Nunca usar Edge Runtime** — o middleware.ts tem `export const runtime = 'nodejs'` propositalmente por causa do `jose`

2. **groupBy no Prisma não suporta `include`** — se precisar de dados relacionados em um groupBy, faça duas queries e junte em memória

3. **useSearchParams() precisa de `<Suspense>`** — qualquer componente client que use `useSearchParams` deve ser envolvido em `<Suspense fallback={null}>` no export default da página

4. **Seed é idempotente** — `prisma/seed.ts` usa upsert, pode rodar várias vezes sem problema

5. **Dois arquivos de banco em dev** — o banco ativo é `./dev.db` (raiz). Ignorar `prisma/dev.db` se existir (artefato obsoleto)

6. **Rate limiting** — login: 10/min, register: 5/h, forgot-password: 5/15min (lib/rate-limit.ts)

7. **Webhook Stripe é idempotente** — tabela `ProcessedWebhookEvent` previne créditos duplicados

8. **moduleResolution: "node"** no tsconfig — necessário para compatibilidade com lucide-react v0.417

## Como rodar localmente
```bash
cp .env.local.example .env.local
# preencher .env.local com suas chaves

npm install
npx prisma db push
npx prisma db seed
npm run dev
```

## Deploy
Recomendado: **Vercel** com PostgreSQL (Neon ou Supabase).
Lembrar de trocar `DATABASE_URL` para PostgreSQL e rodar `prisma migrate deploy`.
