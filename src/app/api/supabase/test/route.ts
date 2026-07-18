// src/app/api/supabase/test/route.ts
// Diagnostics endpoint — verifies that Supabase env vars are set + reachable.
// Safe to call without auth (returns only configuration status, no user data).
import { NextResponse } from "next/server";
import { supabaseBrowser, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const hasPublishableKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasDatabaseUrl = Boolean(process.env.SUPABASE_DATABASE_URL);

  const diagnosis = {
    timestamp: new Date().toISOString(),
    project: {
      url,
      projectRef: url ? url.replace("https://", "").split(".")[0] : null,
    },
    envVars: {
      NEXT_PUBLIC_SUPABASE_URL: url ? "set" : "missing",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: hasPublishableKey ? "set" : "missing",
      SUPABASE_SERVICE_ROLE_KEY: hasServiceRoleKey ? "set" : "missing (server-only)",
      SUPABASE_DATABASE_URL: hasDatabaseUrl ? "set" : "missing (needed for Prisma)",
    },
    clients: {
      supabaseBrowser: supabaseBrowser ? "initialized" : "not initialized",
      supabaseAdmin: supabaseAdmin ? "initialized" : "not initialized (needs service role key)",
    },
    configured: isSupabaseConfigured(),
    nextSteps: [] as string[],
  };

  if (!url) {
    diagnosis.nextSteps.push("Set NEXT_PUBLIC_SUPABASE_URL in .env");
  }
  if (!hasPublishableKey) {
    diagnosis.nextSteps.push("Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env");
  }
  if (!hasServiceRoleKey) {
    diagnosis.nextSteps.push(
      "Set SUPABASE_SERVICE_ROLE_KEY in .env (get from Supabase dashboard → Settings → API → service_role)",
    );
  }
  if (!hasDatabaseUrl) {
    diagnosis.nextSteps.push(
      "Set SUPABASE_DATABASE_URL in .env (get from Supabase dashboard → Settings → Database → Connection string)",
    );
  }

  // Try a live ping to verify the URL is reachable + key is valid
  if (supabaseBrowser) {
    try {
      const { data, error } = await supabaseBrowser
        .from("_test_connection")
        .select("*")
        .limit(1);
      if (error && error.code === "42P01") {
        // Table doesn't exist — that's fine, means we connected successfully
        diagnosis.livePing = { ok: true, message: "Connected to Supabase Postgres" };
      } else if (error) {
        diagnosis.livePing = { ok: false, error: error.message, code: error.code };
      } else {
        diagnosis.livePing = { ok: true, message: "Connected + table exists" };
      }
    } catch (err) {
      diagnosis.livePing = {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  return NextResponse.json(diagnosis, { status: 200 });
}
