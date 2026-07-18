// src/lib/supabase.ts — Supabase client (browser + server)
// Uses the publishable key for client-side access (safe to expose).
// For server-side admin operations (bypassing RLS), use the service role key
// in a separate server-only client.
import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// Browser client (uses publishable key — safe for client-side)
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set. " +
      "Supabase client will not be initialized.",
  );
}

// Browser client — uses Supabase SSR for cookie-based session handling
export const supabaseBrowser = supabaseUrl
  ? createBrowserClient(supabaseUrl, supabasePublishableKey)
  : null;

// ============================================================
// Server client (uses service role key — NEVER expose to client)
// Only import this from server components / API routes / server actions
// ============================================================

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

// ============================================================
// Helper: is Supabase configured?
// ============================================================
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabasePublishableKey);
};

// ============================================================
// Helper: get current Supabase user (client-side)
// ============================================================
export async function getCurrentUser() {
  if (!supabaseBrowser) return null;
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();
  return user;
}
