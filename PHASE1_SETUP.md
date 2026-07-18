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
# 1. Copy env template
cp .env.example .env

# 2. Set the minimum required vars for dev (other vars can stay blank)
# In .env, set:
#   DATABASE_URL="file:/home/z/my-project/db/custom.db"
#   NEXTAUTH_URL="http://localhost:3000"
#   (NEXTAUTH_SECRET will use a dev fallback automatically)

# 3. Push the Prisma schema to your dev DB
bun run db:push

# 4. Start the dev server
bun run dev
```

Open http://localhost:3000 — you'll see a "Sign in" button in the header. Click it → sign-in page → enter email → magic link prints to your terminal console (since SMTP isn't configured).

## Production setup

### 1. Database (Supabase / Neon / Railway)

You have two options for setting up the database on Supabase:

#### Option A — Use Prisma migrations (recommended)

1. Create a new Supabase project at https://supabase.com/dashboard
2. Go to **Project Settings → Database → Connection string → URI**
3. Copy the connection string (looks like `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`)
4. Set it as `DATABASE_URL` in Vercel env vars (and `.env` locally)
5. Update `prisma/schema.prisma` `datasource db` provider to `postgresql`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

6. Run `bun run db:push` to create all tables

#### Option B — Run the SQL migration directly

If you prefer to manage the schema in Supabase directly:

1. Open the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
2. Paste the contents of `scripts/supabase-schema.sql`
3. Click **Run** — this creates all tables + RLS policies + triggers

Then update `prisma/schema.prisma` to `postgresql` and run `bun run db:push` to sync Prisma client with the existing schema.

#### Supabase client (optional — for realtime + storage)

If you want to use Supabase Auth UI, Realtime subscriptions, or Storage in addition to Prisma, set these env vars:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...    # SERVER ONLY — never expose
```

Get them from **Supabase Dashboard → Project Settings → API**.

The Supabase browser client is already wired up at `src/lib/supabase.ts` — import `supabaseBrowser` in any client component to use it.

### 2. NextAuth secret

Generate a 32-byte random string:

```bash
openssl rand -base64 32
```

Set as `NEXTAUTH_SECRET` in Vercel. Also set `NEXTAUTH_URL=https://yourdomain.com`.

### 3. Email provider (Resend / Postmark / SMTP)

For magic-link emails in production, configure SMTP:

```
EMAIL_SERVER=smtps://user:pass@smtp.resend.com:465
EMAIL_FROM=noreply@yourdomain.com
```

Recommended: [Resend](https://resend.com) — free 3,000 emails/month, 5-minute setup.

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
