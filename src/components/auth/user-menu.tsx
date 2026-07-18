// src/components/auth/user-menu.tsx
// Header dropdown: shows user info, current tier, sign-out / subscribe / manage billing
"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, User as UserIcon, LogOut, CreditCard, Crown, Loader2 } from "lucide-react";
import { UpgradeModal } from "./upgrade-modal";
import { TIERS } from "@/lib/stripe";

const TIER_COLORS: Record<string, string> = {
  STUDENT: "bg-stone-100 text-stone-700 border-stone-300",
  FARMER: "bg-emerald-100 text-emerald-800 border-emerald-300",
  FEED_MILL: "bg-amber-100 text-amber-800 border-amber-300",
  COOPERATIVE: "bg-purple-100 text-purple-800 border-purple-300",
};

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  if (status === "loading") {
    return (
      <div className="h-8 w-8 rounded-full bg-stone-200 animate-pulse" />
    );
  }

  // Not signed in — show "Sign in" button
  if (!session?.user) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs"
        onClick={() => (window.location.href = "/auth/signin")}
      >
        <UserIcon className="h-3.5 w-3.5" />
        Sign in
      </Button>
    );
  }

  const tier = (session.user.tier || "STUDENT").toUpperCase();
  const tierConfig = TIERS[tier as keyof typeof TIERS] || TIERS.STUDENT;

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "No active subscription found.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setPortalLoading(false);
    }
  };

  const initials = (session.user.name || session.user.email || "?")
    .split(/[\s@.]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-full border border-stone-200 bg-white pl-1 pr-2 py-1 hover:bg-stone-50 transition-colors"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] font-bold">
            {initials || <UserIcon className="h-3 w-3" />}
          </div>
          <ChevronDown className="h-3 w-3 text-stone-500" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 mt-2 w-64 rounded-md border border-stone-200 bg-white shadow-lg z-50 py-1">
              {/* User info */}
              <div className="px-3 py-2 border-b border-stone-100">
                <p className="text-xs font-semibold text-stone-900 truncate">
                  {session.user.name || session.user.email}
                </p>
                <p className="text-[10px] text-stone-500 truncate">{session.user.email}</p>
                <div className="mt-1.5">
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 ${TIER_COLORS[tier] || TIER_COLORS.STUDENT}`}
                  >
                    {tierConfig.name} tier
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              {tier === "STUDENT" && (
                <button
                  onClick={() => {
                    setOpen(false);
                    setShowUpgrade(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 text-emerald-800 flex items-center gap-2"
                >
                  <Crown className="h-3.5 w-3.5" />
                  Upgrade to Farmer / Feed Mill
                </button>
              )}

              {tier !== "STUDENT" && (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-stone-50 text-stone-700 flex items-center gap-2"
                >
                  {portalLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CreditCard className="h-3.5 w-3.5" />
                  )}
                  Manage subscription
                </button>
              )}

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full text-left px-3 py-2 text-xs hover:bg-rose-50 text-rose-700 flex items-center gap-2 border-t border-stone-100"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
    </>
  );
}
