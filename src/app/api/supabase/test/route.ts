// src/app/api/supabase/test/route.ts
// Diagnostics endpoint — verifies Supabase config + that the schema migration was run.
// Safe to call without auth (returns only configuration status, no user data).
import { NextResponse } from "next/server";
import { supabaseBrowser, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

// Tables that should exist after running scripts/supabase-schema.sql
const EXPECTED_TABLES = [
  "User",
  "Account",
  "Session",
  "VerificationToken",
  "Subscription",
  "Invoice",
];

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const hasPublishableKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasDatabaseUrl = Boolean(process.env.SUPABASE_DATABASE_URL);

  const diagnosis: Record<string, any> = {
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

  // Verify schema migration: check each expected table exists
  if (supabaseBrowser) {
    const tableChecks: Record<string, { ok: boolean; error?: string; rowCount?: number }> = {};

    for (const table of EXPECTED_TABLES) {
      try {
        const { data, error } = await supabaseBrowser
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error) {
          if (error.code === "PGRST205") {
            // Table doesn't exist — migration not run for this table
            tableChecks[table] = { ok: false, error: "Table not found — run scripts/supabase-schema.sql" };
          } else {
            // Other error (e.g. RLS blocked the query — that's actually OK, means table exists)
            tableChecks[table] = { ok: true, error: `Access blocked (RLS): ${error.message}` };
          }
        } else {
          // Table exists + accessible
          tableChecks[table] = { ok: true, rowCount: data?.length ?? 0 };
        }
      } catch (err) {
        tableChecks[table] = {
          ok: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    }

    diagnosis.schemaMigration = {
      tablesChecked: EXPECTED_TABLES.length,
      tablesOk: Object.values(tableChecks).filter((t) => t.ok).length,
      tableChecks,
      migrationComplete: Object.values(tableChecks).every((t) => t.ok),
    };

    diagnosis.livePing = diagnosis.schemaMigration.migrationComplete
      ? { ok: true, message: "Connected to Supabase Postgres — all 6 tables verified" }
      : { ok: false, message: "Connected, but some tables missing — run the SQL migration" };
  }

  return NextResponse.json(diagnosis, { status: 200 });
}
