// src/lib/auth-utils.ts
// Helper functions for tier-based access control on the client
import type { Tier } from "@/lib/stripe";

// Module access matrix — keep in sync with src/lib/user-roles.ts
export const MODULE_ACCESS: Record<Tier, string[]> = {
  STUDENT: [
    "dashboard",
    "ration",
    "ai-ration",
    "animals",
    "fourrages",
    "concentres",
    "cmv",
    "glossaire",
    "calendrier",
    "rumen-sim",
    "classroom",
    "agneaux",
    "prevision",
  ],
  FARMER: [
    // all student modules +
    "dashboard",
    "ration",
    "ai-ration",
    "verificateur",
    "optimisation",
    "comparer",
    "custom-feeds",
    "animals",
    "fourrages",
    "concentres",
    "cmv",
    "agneaux",
    "bilan",
    "melange",
    "paturage",
    "glossaire",
    "calendrier",
    "prevision",
    "rumen-sim",
    "classroom",
  ],
  FEED_MILL: [
    // all modules
    "dashboard",
    "ration",
    "ai-ration",
    "verificateur",
    "optimisation",
    "comparer",
    "custom-feeds",
    "animals",
    "fourrages",
    "concentres",
    "cmv",
    "agneaux",
    "bilan",
    "melange",
    "paturage",
    "glossaire",
    "calendrier",
    "prevision",
    "rumen-sim",
    "classroom",
    "production",
    "traceability",
  ],
  COOPERATIVE: [
    // same as FEED_MILL (with multi-tenant extra)
    "dashboard",
    "ration",
    "ai-ration",
    "verificateur",
    "optimisation",
    "comparer",
    "custom-feeds",
    "animals",
    "fourrages",
    "concentres",
    "cmv",
    "agneaux",
    "bilan",
    "melange",
    "paturage",
    "glossaire",
    "calendrier",
    "prevision",
    "rumen-sim",
    "classroom",
    "production",
    "traceability",
  ],
};

export function canAccessModule(
  tier: string | undefined | null,
  moduleId: string,
): boolean {
  if (!tier) {
    // Not signed in — show only student-tier modules (read-only demo)
    return MODULE_ACCESS.STUDENT.includes(moduleId);
  }
  const upperTier = (tier || "STUDENT").toUpperCase() as Tier;
  const allowed = MODULE_ACCESS[upperTier] || MODULE_ACCESS.STUDENT;
  return allowed.includes(moduleId);
}

export function getEffectiveTier(session: any): Tier {
  if (!session?.user) return "STUDENT";
  const tier = (session.user.tier || "STUDENT").toUpperCase() as Tier;
  return tier;
}

// Free-tier daily AI message limit
export const FREE_TIER_AI_DAILY_LIMIT = 10;

// Free-tier max saved rations
export const FREE_TIER_MAX_RATIONS = 3;
