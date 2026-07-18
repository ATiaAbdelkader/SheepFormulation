# Phase 1 — Monetization Infrastructure Setup

This guide walks through setting up the authentication (NextAuth v5) and billing (Stripe) infrastructure that was added in Phase 1 of the commercial rollout.

## What was added

- **NextAuth v5** with email magic-link + Google OAuth providers
- **Prisma schema** extended with `User`, `Account`, `Session`, `VerificationToken`, `Subscription`, `Invoice` models
- **Stripe** integration: checkout, webhook, customer portal
- **Sign-in page** at `/auth/signin` (email + Google buttons)
- **Auth error page** at `/auth/error`
- **UserMenu** component in the header (shows user, tier badge, upgrade / manage billing / sign out)
- **UpgradeModal** component (opens when user tries to access a premium module)
- **Tier-based access control** — auth session tier overrides localStorage role when signed in
- **`.env.example`** documenting all required env vars
- **`vercel.json`** for one-click Vercel deployment
- **Proxy middleware** protecting `/api/stripe/*` routes (requires session)

## Quick start (dev)

```bash
# 1. Verify your env setup (tells you exactly what's missing)
bun run check:env

# 2. Once check:env reports all critical vars set, sync Prisma with Supabase
bun run db:push

# 3. Start the dev server
bun run dev
```

Open http://localhost:3000 — you'll see a "Sign in" button in the header. Click it → sign-in page → enter email → magic link prints to your terminal console (since SMTP isn't configured).

You can also verify the Supabase connection at any time:
```bash
curl http://localhost:3000/api/supabase/test
```
Returns JSON showing env var status + which tables exist in your Supabase Postgres.

## Production setup

### 1. Database — Supabase Postgres (already configured)

The Supabase project is set up at:
- **Project URL:** `https://ddjozkxjwloyjploacuv.supabase.co`
- **Project ref:** `ddjozkxjwloyjploacuv`

**Step 1 — Run the SQL migration** (you've already done this):
1. Open https://supabase.com/dashboard/project/ddjozkxjwloyjploacuv/sql/new
2. Paste the contents of `scripts/supabase-schema.sql`
3. Click **Run** — creates all 6 tables (`User`, `Account`, `Session`, `VerificationToken`, `Subscription`, `Invoice`) + RLS policies + triggers

**Step 2 — Get your database connection string**:
1. Go to https://supabase.com/dashboard/project/ddjozkxjwloyjploacuv/settings/database
2. Under "Connection string" → click "URI"
3. Copy the connection string (looks like):
   ```
   postgresql://postgres.ddjozkxjwloyjploacuv:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with your database password (you set this when creating the Supabase project)
5. Paste the final URL into `.env` as `DATABASE_URL=...`

**Step 3 — Get your service role key** (server-only, for Stripe webhooks):
1. Go to https://supabase.com/dashboard/project/ddjozkxjwloyjploacuv/settings/api
2. Under "Project API keys" → find "service_role" → click "Reveal"
3. Copy the long JWT (starts with `eyJ...`)
4. Paste into `.env` as `SUPABASE_SERVICE_ROLE_KEY=...`

**Step 4 — Verify your setup**:
```bash
bun run check:env
```
This will tell you which env vars are missing and which features will work.

**Step 5 — Sync Prisma client with Supabase schema**:
```bash
bun run db:push
```
This connects to your Supabase Postgres and verifies that all Prisma models match the existing tables. Since you already ran the SQL migration, no schema changes will be made — Prisma just regenerates its client types.

### 2. NextAuth (already configured)

The `NEXTAUTH_SECRET` has been pre-generated in your `.env` file. To rotate it:
```bash
openssl rand -base64 32
```

### 3. Email provider (Resend / Postmark / SMTP)

For magic-link emails in production, configure SMTP:

```
EMAIL_SERVER=smtps://user:pass@smtp.resend.com:465
EMAIL_FROM=noreply@yourdomain.com
```

Recommended: [Resend](https://resend.com) — free 3,000 emails/month, 5-minute setup.

In dev without SMTP configured, magic links print to your terminal console.

### 4. Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`
4. Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Vercel

### 5. Stripe

1. Create a [Stripe account](https://dashboard.stripe.com)
2. Get your API keys → set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Create 6 products in Stripe dashboard (or via API):
   - Farmer Monthly — €9.90/month
   - Farmer Yearly — €89/year
   - Feed Mill Monthly — €49/user/month
   - Feed Mill Yearly — €449/user/year
   - Cooperative Monthly — €999/site/month
   - Cooperative Yearly — €9988/site/year
4. Copy each price ID (`price_xxx`) to the corresponding env var
5. Create a webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Events to listen for: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
   - Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

For local webhook testing:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 6. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo in the Vercel dashboard for auto-deploy on push.

**Required Vercel env vars** (Project Settings → Environment Variables):
- `DATABASE_URL` — your Supabase Postgres connection string
- `NEXTAUTH_SECRET` — same value as in your local `.env`
- `NEXTAUTH_URL` — `https://your-vercel-domain.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL` — `https://ddjozkxjwloyjploacuv.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — `sb_publishable_vBhCOdpFcSfiT2qJYKzxiA_qQJIBrIw`
- `SUPABASE_SERVICE_ROLE_KEY` — your service role JWT
- All Stripe vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and the 6 price IDs)

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser (client)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │  UserMenu       │  │  UpgradeModal   │  │  useSession()    │ │
│  │  (sign in/out,  │  │  (tier picker,  │  │  (next-auth/react)│ │
│  │   tier badge)   │  │   Stripe checkout)│ │                  │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬─────────┘ │
└───────────┼─────────────────────┼────────────────────┼──────────┘
            │                     │                    │
            ▼                     ▼                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                          Next.js server                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │ /api/auth/*     │  │ /api/stripe/*   │  │  src/auth.ts     │ │
│  │ (NextAuth v5    │  │ (checkout,      │  │  (config: email, │ │
│  │  handlers —     │  │  webhook,       │  │   Google, JWT,   │ │
│  │  signIn, JWT)   │  │  portal)        │  │   PrismaAdapter) │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬─────────┘ │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                Prisma ORM (db.ts)                          │ │
│  │   User · Account · Session · Subscription · Invoice       │ │
│  └────────────────────────────┬───────────────────────────────┘ │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │  PostgreSQL (Supabase)  │
                   │  or SQLite (dev)        │
                   └─────────────────────────┘
```

## Tier access matrix

The session's `user.tier` field controls module access. When a user signs in, their tier is fetched from the database (synced from Stripe via webhooks). The `useSession()` hook on the client provides `session.user.tier`, which `page.tsx` uses to override the localStorage role selector.

| Tier | Price | Modules | Key features |
|------|-------|---------|--------------|
| STUDENT | Free | 13 | Ration, AI (10 msg/day), Animals, Forages, Concentrates, CMV, Glossary, Calendar, Rumen Sim, Classroom |
| FARMER | €9.90/mo | 20 | + Optimization, Comparer, Custom Feeds, Bilan, Melange, Pâturage, Prévision, Verificateur |
| FEED_MILL | €49/user/mo | 22 | + Production, Traceability, multi-user, API, white-label |
| COOPERATIVE | €999/site/mo | 22 + multi-tenant | White-label SaaS, on-prem, SLA |

## Testing the upgrade flow in dev

Without real Stripe keys, you can still test the UI:

1. Sign in with any email (magic link prints to console)
2. Open the UserMenu (top-right) → "Upgrade to Farmer / Feed Mill"
3. The UpgradeModal will try to call `/api/stripe/checkout` — it will return an error like `"Stripe price ID not configured for FARMER monthly"` which is expected.

To test the full flow, you need real Stripe price IDs (test mode is fine).

## Files added/modified in Phase 1

```
NEW  .env.example
NEW  vercel.json
NEW  src/auth.ts
NEW  src/proxy.ts                          (was middleware.ts)
NEW  src/lib/stripe.ts
NEW  src/lib/auth-utils.ts
NEW  src/components/providers/session-provider.tsx
NEW  src/components/auth/upgrade-modal.tsx
NEW  src/components/auth/user-menu.tsx
NEW  src/app/api/auth/[...nextauth]/route.ts
NEW  src/app/api/stripe/checkout/route.ts
NEW  src/app/api/stripe/webhook/route.ts
NEW  src/app/api/stripe/portal/route.ts
NEW  src/app/auth/signin/page.tsx
NEW  src/app/auth/error/page.tsx
MOD prisma/schema.prisma                   (added User, Account, Session, Subscription, Invoice)
MOD src/app/layout.tsx                     (wrapped with AuthSessionProvider)
MOD src/app/page.tsx                       (added UserMenu + auth-aware role logic)
MOD package.json                           (added next-auth, stripe, @supabase/supabase-js, etc.)
```

## Next steps (Phase 2)

Once Phase 1 is deployed and you've validated that users can sign up + subscribe:

1. **GPT-4 AI Assistant** — structured outputs that auto-populate the Ration module
2. **Weather API** — Météo France (free) + Algeria Meteo, shown on Pâturage
3. **Market price feeds** — BNA Algeria + La France Agricole
4. **PWA offline mode** — service worker caching for 5 most-used modules
5. **OCR feed label decoder** — Tesseract.js + existing Prévision equations

See `OvinFormulation_Commercial_Vision_v1.0.pdf` for the full 12-month roadmap.
