"use client";

import { useState } from "react";
import { AlimRation } from "./alim-ration";
import { AlimRationMultiLot } from "./alim-ration-multilot";
import { AlimRationTransition } from "./alim-ration-transition";
import { Calculator, Layers, GitBranch, Printer, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type RationTab = "single" | "multilot" | "transition";

export function AlimRationPro() {
  const [tab, setTab] = useState<RationTab>("single");

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-1">
        <RationTabButton active={tab === "single"} onClick={() => setTab("single")} icon={<Calculator className="h-3.5 w-3.5" />} label="Ration simple" />
        <RationTabButton active={tab === "multilot"} onClick={() => setTab("multilot")} icon={<Layers className="h-3.5 w-3.5" />} label="Multi-lot" />
        <RationTabButton active={tab === "transition"} onClick={() => setTab("transition")} icon={<GitBranch className="h-3.5 w-3.5" />} label="Transition" />
      </div>

      {tab === "single" && <AlimRation />}
      {tab === "multilot" && <AlimRationMultiLot />}
      {tab === "transition" && <AlimRationTransition />}
    </div>
  );
}

function RationTabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${
        active ? "bg-emerald-100 text-emerald-900 border-b-2 border-emerald-600" : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
