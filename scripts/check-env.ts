#!/usr/bin/env node
/**
 * scripts/check-env.ts — Verify all required env vars are set before running the app.
 *
 * Usage:
 *   bun run scripts/check-env.ts
 *
 * Reads from .env file directly (so system env vars don't mask missing values).
 *
 * Exit codes:
 *   0 = all critical env vars OK, ready to run
 *   1 = some critical env vars missing (will list them)
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ── Parse .env file manually (avoids system env masking) ──────────────
function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const content = readFileSync(path, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    let value = trimmed.substring(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value;
  }
  return env;
}

const envFile = parseEnvFile(resolve(process.cwd(), ".env"));
const envExample = parseEnvFile(resolve(process.cwd(), ".env.example"));

// Merge: .env file wins, fall back to process.env
function getVar(name: string): string {
  return envFile[name] ?? process.env[name] ?? "";
}

const required = [
  { name: "DATABASE_URL", description: "Supabase Postgres connection string", critical: true, hint: "Get from: https://supabase.com/dashboard/project/ddjozkxjwloyjploacuv/settings/database" },
  { name: "NEXTAUTH_SECRET", description: "32-byte random string", critical: true, hint: "Generate with: openssl rand -base64 32" },
  { name: "NEXTAUTH_URL", description: "App URL", critical: true, hint: "Use http://localhost:3000 in dev" },
  { name: "NEXT_PUBLIC_SUPABASE_URL", description: "Supabase project URL", critical: true, hint: "Already set to https://ddjozkxjwloyjploacuv.supabase.co" },
  { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", description: "Supabase publishable key", critical: true, hint: "Already set (sb_publishable_...)" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", description: "Supabase service role JWT (server-only)", critical: false, hint: "Get from: Supabase dashboard → Settings → API → service_role" },
  { name: "STRIPE_SECRET_KEY", description: "Stripe API key (sk_test_...)", critical: false, hint: "Get from: https://dashboard.stripe.com/apikeys" },
  { name: "STRIPE_WEBHOOK_SECRET", description: "Stripe webhook signing secret (whsec_...)", critical: false, hint: "Get from: https://dashboard.stripe.com/webhooks" },
  { name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", description: "Stripe publishable key (pk_test_...)", critical: false, hint: "Get from: https://dashboard.stripe.com/apikeys" },
];

const optional = [
  { name: "EMAIL_SERVER", description: "SMTP URL for magic-link emails" },
  { name: "EMAIL_FROM", description: "From address for emails" },
  { name: "GOOGLE_CLIENT_ID", description: "Google OAuth client ID" },
  { name: "GOOGLE_CLIENT_SECRET", description: "Google OAuth client secret" },
  { name: "ZAI_API_KEY", description: "Z.ai Web Dev SDK key for AI Assistant" },
  { name: "STRIPE_PRICE_FARMER_MONTHLY", description: "Stripe price ID for Farmer monthly (€9.90/mo)" },
  { name: "STRIPE_PRICE_FARMER_YEARLY", description: "Stripe price ID for Farmer yearly (€89/yr)" },
  { name: "STRIPE_PRICE_FEEDMILL_MONTHLY", description: "Stripe price ID for Feed Mill monthly (€49/user/mo)" },
  { name: "STRIPE_PRICE_FEEDMILL_YEARLY", description: "Stripe price ID for Feed Mill yearly (€449/user/yr)" },
];

console.log("\n========================================");
console.log("  OvinFormulation v1.0 — Env Check");
console.log("========================================\n");

let hasErrors = false;
let hasWarnings = false;

console.log("REQUIRED (app won't work without these):\n");
for (const v of required) {
  const value = getVar(v.name);
  const isSet = Boolean(value);
  if (isSet) {
    const masked = value.length > 40 ? `${value.substring(0, 37)}...` : value;
    console.log(`  ✓ ${v.name} = ${masked}`);
  } else {
    console.log(`  ✗ ${v.name} — MISSING`);
    console.log(`      → ${v.description}`);
    console.log(`      → ${v.hint}`);
    if (v.critical) hasErrors = true;
    else hasWarnings = true;
  }
}

console.log("\nOPTIONAL (some features won't work without these):\n");
for (const v of optional) {
  const value = getVar(v.name);
  const isSet = Boolean(value);
  if (isSet) {
    const masked = value.length > 40 ? `${value.substring(0, 37)}...` : value;
    console.log(`  ✓ ${v.name} = ${masked}`);
  } else {
    console.log(`  • ${v.name} (not set)`);
    console.log(`      → ${v.description}`);
  }
}

console.log("\n========================================");
if (hasErrors) {
  console.log("❌ MISSING CRITICAL env vars — fix before running `bun run dev`");
  console.log("   Edit .env in your project root, then re-run: bun run check:env\n");
  process.exit(1);
} else if (hasWarnings) {
  console.log("⚠  All critical vars set. Some non-critical vars missing — see above.");
  console.log("   You can run `bun run dev` but some features will be limited.\n");
  process.exit(0);
} else {
  console.log("✅ All required env vars are set. Ready to run!");
  console.log("   Next steps:");
  console.log("     1. bun run db:push     (sync Prisma client with Supabase schema)");
  console.log("     2. bun run dev         (start the dev server)\n");
  process.exit(0);
}
