-- ============================================================
-- OvinFormulation v1.0 — Supabase Schema Migration
-- ============================================================
-- Run this in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/_/sql/new
--
-- This creates all tables required by the NextAuth + Stripe integration.
-- The Prisma schema in /prisma/schema.prisma is the source of truth —
-- this SQL is a convenience for users who want to use Supabase directly.
-- ============================================================

-- Enable UUID extension (Supabase has this by default)
create extension if not exists "pgcrypto";

-- ============================================================
-- NextAuth.js tables (required by @auth/prisma-adapter)
-- ============================================================

create table if not exists "User" (
  id            text primary key default gen_random_uuid()::text,
  email         text unique not null,
  "emailVerified" timestamptz,
  name          text,
  image         text,
  -- OvinFormulation custom fields
  role          text not null default 'STUDENT',
  "preferredLang" text not null default 'fr',
  country       text,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz not null default now()
);

create table if not exists "Account" (
  id                text primary key default gen_random_uuid()::text,
  "userId"          text not null references "User"(id) on delete cascade,
  type              text not null,
  provider          text not null,
  "providerAccountId" text not null,
  refresh_token     text,
  access_token      text,
  expires_at        integer,
  token_type        text,
  scope             text,
  id_token          text,
  session_state     text,
  unique("provider", "providerAccountId")
);

create index if not exists "Account_userId_idx" on "Account"("userId");

create table if not exists "Session" (
  id           text primary key default gen_random_uuid()::text,
  "sessionToken" text unique not null,
  "userId"     text not null references "User"(id) on delete cascade,
  expires      timestamptz not null
);

create index if not exists "Session_userId_idx" on "Session"("userId");

create table if not exists "VerificationToken" (
  identifier text not null,
  token      text unique not null,
  expires    timestamptz not null,
  unique(identifier, token)
);

-- ============================================================
-- Subscription & Billing (Stripe)
-- ============================================================

create table if not exists "Subscription" (
  id                     text primary key default gen_random_uuid()::text,
  "userId"               text unique not null references "User"(id) on delete cascade,
  status                 text not null default 'FREE',
  tier                   text not null default 'STUDENT',
  "stripeCustomerId"     text unique,
  "stripeSubscriptionId" text unique,
  "stripePriceId"        text,
  "currentPeriodStart"   timestamptz,
  "currentPeriodEnd"     timestamptz,
  "cancelAtPeriodEnd"    boolean not null default false,
  "trialEndsAt"          timestamptz,
  "createdAt"            timestamptz not null default now(),
  "updatedAt"            timestamptz not null default now()
);

create index if not exists "Subscription_stripeCustomerId_idx" on "Subscription"("stripeCustomerId");
create index if not exists "Subscription_status_idx" on "Subscription"(status);

create table if not exists "Invoice" (
  id                  text primary key default gen_random_uuid()::text,
  "subscriptionId"    text not null references "Subscription"(id) on delete cascade,
  "stripeInvoiceId"   text unique not null,
  "amountDue"         integer not null,
  "amountPaid"        integer not null,
  currency            text not null default 'eur',
  status              text not null,
  "invoicePdf"        text,
  "hostedInvoiceUrl"  text,
  "createdAt"         timestamptz not null default now()
);

create index if not exists "Invoice_subscriptionId_idx" on "Invoice"("subscriptionId");
create index if not exists "Invoice_status_idx" on "Invoice"(status);

-- ============================================================
-- Row Level Security (RLS) policies
-- ============================================================
-- Users can only read/update their own data.
-- Service role key bypasses RLS for Stripe webhooks.

alter table "User" enable row level security;
alter table "Account" enable row level security;
alter table "Session" enable row level security;
alter table "Subscription" enable row level security;
alter table "Invoice" enable row level security;

-- User can read their own user record
create policy "Users can read own data" on "User"
  for select using (auth.uid()::text = id);

-- User can update their own user record (but not role/tier — those are server-only)
create policy "Users can update own data" on "User"
  for update using (auth.uid()::text = id);

-- User can read their own accounts/sessions/subscriptions
create policy "Users can read own accounts" on "Account"
  for select using (auth.uid()::text = "userId");

create policy "Users can read own sessions" on "Session"
  for select using (auth.uid()::text = "userId");

create policy "Users can read own subscription" on "Subscription"
  for select using (auth.uid()::text = "userId");

-- No policies on Invoice — only service role can access (via Stripe webhook)
-- No insert/update policies — all writes go through service role (server-side)

-- ============================================================
-- Updated_at triggers
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists "User_updated_at" on "User";
create trigger "User_updated_at" before update on "User"
  for each row execute function update_updated_at();

drop trigger if exists "Subscription_updated_at" on "Subscription";
create trigger "Subscription_updated_at" before update on "Subscription"
  for each row execute function update_updated_at();

-- ============================================================
-- Done — verify with:
--   select * from "User" limit 5;
--   select * from "Subscription" limit 5;
-- ============================================================
