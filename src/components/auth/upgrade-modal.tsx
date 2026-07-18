// src/components/auth/upgrade-modal.tsx
// Modal that prompts the user to upgrade their tier when accessing a locked module
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2, Lock, Sparkles, Zap, Building2 } from "lucide-react";
import { TIERS, type Tier } from "@/lib/stripe";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedModuleId?: string;
  lockedModuleLabel?: string;
};

export function UpgradeModal({ open, onOpenChange, lockedModuleId, lockedModuleLabel }: Props) {
  const { data: session } = useSession();
  const [loadingTier, setLoadingTier] = useState<Tier | null>(null);

  const handleUpgrade = async (tier: Tier, billing: "monthly" | "yearly") => {
    setLoadingTier(tier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, billing }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout. Have you configured Stripe price IDs?");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setLoadingTier(null);
    }
  };

  const tiersToShow: Tier[] = ["FARMER", "FEED_MILL"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Lock className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg">Upgrade to unlock this module</DialogTitle>
          </div>
          <DialogDescription>
            {lockedModuleLabel ? (
              <>
                <strong className="text-stone-700">{lockedModuleLabel}</strong> requires a paid
                subscription. Choose a plan below to unlock it and {lockedModuleId === "production" || lockedModuleId === "traceability"
                  ? "all 22 modules"
                  : "20+ modules"}.
              </>
            ) : (
              <>Choose a plan to unlock all premium modules and features.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {tiersToShow.map((tier) => {
            const config = TIERS[tier];
            const Icon = tier === "FARMER" ? Zap : Building2;
            return (
              <Card
                key={tier}
                className={`border-2 ${tier === "FARMER" ? "border-emerald-300 bg-emerald-50/30" : "border-stone-200"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${tier === "FARMER" ? "text-emerald-700" : "text-stone-700"}`} />
                    <h3 className="font-bold text-stone-900">{config.name}</h3>
                  </div>
                  <div className="mb-3">
                    <span className="text-2xl font-bold text-stone-900">
                      €{config.priceMonthly}
                    </span>
                    <span className="text-xs text-stone-500">/month</span>
                    <span className="block text-[11px] text-stone-500 mt-0.5">
                      or €{config.priceYearly}/year (save 25%)
                    </span>
                  </div>
                  <ul className="space-y-1.5 mb-4">
                    {config.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-[11px] text-stone-700">
                        <Check className="h-3 w-3 mt-0.5 text-emerald-600 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-1.5">
                    <Button
                      onClick={() => handleUpgrade(tier, "monthly")}
                      disabled={loadingTier !== null}
                      className={`w-full h-8 text-xs ${
                        tier === "FARMER"
                          ? "bg-emerald-700 hover:bg-emerald-800"
                          : "bg-stone-800 hover:bg-stone-900"
                      }`}
                    >
                      {loadingTier === tier ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>Subscribe monthly</>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleUpgrade(tier, "yearly")}
                      disabled={loadingTier !== null}
                      variant="outline"
                      className="w-full h-8 text-xs"
                    >
                      {loadingTier === tier ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Subscribe yearly — save 25%
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="mt-3 flex-col sm:flex-row gap-2">
          {session?.user?.email && (
            <p className="text-[10px] text-stone-400 text-center sm:text-left flex-1">
              Signed in as {session.user.email}
            </p>
          )}
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
