"use client";

import { useState, type ReactNode } from "react";
import { LayoutDashboard, Users, Wheat, Sprout, Pill, Calculator, Baby, Scale, Blend, Trees, Zap, GitCompare, FlaskConical, BookOpen, CalendarDays, Telescope, ShieldCheck, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlimDashboard } from "@/components/alim/alim-dashboard";
import { AlimAnimals } from "@/components/alim/alim-animals";
import { AlimFourrages } from "@/components/alim/alim-fourrages";
import { AlimConcentres } from "@/components/alim/alim-concentres";
import { AlimCMV } from "@/components/alim/alim-cmv";
import { AlimRation } from "@/components/alim/alim-ration";
import { AlimVerificateur } from "@/components/alim/alim-verificateur";
import { AlimOptimisation } from "@/components/alim/alim-optimisation";
import { AlimComparer } from "@/components/alim/alim-comparer";
import { AlimCustomFeeds } from "@/components/alim/alim-custom-feeds";
import { AlimAgneaux } from "@/components/alim/alim-agneaux";
import { AlimBilan } from "@/components/alim/alim-bilan";
import { AlimMelange } from "@/components/alim/alim-melange";
import { AlimPaturage } from "@/components/alim/alim-paturage";
import { AlimGlossaire } from "@/components/alim/alim-glossaire";
import { AlimCalendrier } from "@/components/alim/alim-calendrier";
import { AlimPrevision } from "@/components/alim/alim-prevision";

type AlimView =
  | "dashboard"
  | "animals"
  | "fourrages"
  | "concentres"
  | "cmv"
  | "ration"
  | "verificateur"
  | "optimisation"
  | "comparer"
  | "custom-feeds"
  | "agneaux"
  | "bilan"
  | "melange"
  | "paturage"
  | "glossaire"
  | "calendrier"
  | "prevision";

const NAV_ITEMS: { id: AlimView; label: string; description: string; icon: ReactNode }[] = [
  { id: "dashboard", label: "Tableau de bord", description: "Vue d'ensemble", icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: "ration", label: "Ration", description: "Établir une ration", icon: <Calculator className="h-5 w-5" /> },
  { id: "verificateur", label: "Vérificateur", description: "Analyser une ration inconnue", icon: <ShieldCheck className="h-5 w-5" /> },
  { id: "optimisation", label: "Optimisation", description: "Moindre coût (LP)", icon: <Zap className="h-5 w-5" /> },
  { id: "comparer", label: "Comparer", description: "Comparer 2 rations", icon: <GitCompare className="h-5 w-5" /> },
  { id: "custom-feeds", label: "Mes aliments", description: "Aliments personnalisés", icon: <FlaskConical className="h-5 w-5" /> },
  { id: "animals", label: "Animaux", description: "Besoins alimentaires", icon: <Users className="h-5 w-5" /> },
  { id: "fourrages", label: "Fourrages", description: "Base fourrages", icon: <Wheat className="h-5 w-5" /> },
  { id: "concentres", label: "Concentrés", description: "Base concentrés", icon: <Sprout className="h-5 w-5" /> },
  { id: "cmv", label: "CMV", description: "Compléments minéraux", icon: <Pill className="h-5 w-5" /> },
  { id: "agneaux", label: "Agneaux", description: "Besoins à l'engrais", icon: <Baby className="h-5 w-5" /> },
  { id: "bilan", label: "Bilan fourrager", description: "Bilan du troupeau", icon: <Scale className="h-5 w-5" /> },
  { id: "melange", label: "Mélange", description: "Mélange de concentrés", icon: <Blend className="h-5 w-5" /> },
  { id: "paturage", label: "Pâturage", description: "Jours d'avance", icon: <Trees className="h-5 w-5" /> },
  { id: "glossaire", label: "Glossaire", description: "Définitions & références", icon: <BookOpen className="h-5 w-5" /> },
  { id: "calendrier", label: "Calendrier", description: "Planning du troupeau", icon: <CalendarDays className="h-5 w-5" /> },
  { id: "prevision", label: "Prévision", description: "Valeur des aliments du commerce", icon: <Telescope className="h-5 w-5" /> },
];

export default function Home() {
  const [view, setView] = useState<AlimView>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id: AlimView) => {
    setView(id);
    setMobileOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm">
              <Wheat className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold leading-tight text-stone-900 sm:text-lg">
                OvinFormulation <span className="text-emerald-700">v1.0</span>
              </h1>
              <p className="text-[11px] text-stone-500 leading-tight hidden sm:block">
                Rationnement des ovins
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-stone-500">
            <span className="hidden lg:inline">D&apos;après Abdelkader Atia — AgriSkills Academy</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-stone-200 bg-white">
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  view === item.id
                    ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
                    : "text-stone-700 hover:bg-stone-100"
                )}
              >
                <span className={cn("mt-0.5", view === item.id ? "text-emerald-700" : "text-stone-500")}>
                  {item.icon}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">{item.label}</span>
                  <span className="text-[11px] text-stone-500 leading-tight">{item.description}</span>
                </span>
              </button>
            ))}
          </nav>
          <div className="border-t border-stone-200 p-3 text-[10px] text-stone-400 leading-relaxed">
            Données issues du tableur OvinFormulation v1.0 (educagri).<br />
            Outil pédagogique de formulation de rations ovines.
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setMobileOpen(false)}>
            <aside
              className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-16 items-center justify-between px-4 border-b border-stone-200">
                <span className="font-semibold text-stone-900">Navigation</span>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={cn(
                      "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      view === item.id
                        ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
                        : "text-stone-700 hover:bg-stone-100"
                    )}
                  >
                    <span className={cn("mt-0.5", view === item.id ? "text-emerald-700" : "text-stone-500")}>
                      {item.icon}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-medium leading-tight">{item.label}</span>
                      <span className="text-[11px] text-stone-500 leading-tight">{item.description}</span>
                    </span>
                  </button>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
            {view === "dashboard" && <AlimDashboard onNavigate={handleNav} />}
            {view === "ration" && <AlimRation />}
            {view === "verificateur" && <AlimVerificateur />}
            {view === "optimisation" && <AlimOptimisation />}
            {view === "comparer" && <AlimComparer />}
            {view === "custom-feeds" && <AlimCustomFeeds />}
            {view === "animals" && <AlimAnimals />}
            {view === "fourrages" && <AlimFourrages />}
            {view === "concentres" && <AlimConcentres />}
            {view === "cmv" && <AlimCMV />}
            {view === "agneaux" && <AlimAgneaux />}
            {view === "bilan" && <AlimBilan />}
            {view === "melange" && <AlimMelange />}
            {view === "paturage" && <AlimPaturage />}
            {view === "glossaire" && <AlimGlossaire />}
            {view === "calendrier" && <AlimCalendrier />}
            {view === "prevision" && <AlimPrevision />}
          </div>
        </main>
      </div>

      {/* Footer (sticky at bottom) */}
      <footer className="mt-auto border-t border-stone-200 bg-white">
        <div className="container mx-auto px-4 sm:px-6 py-4 max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
          <p>OvinFormulation v1.0 — Rationnement des ovins</p>
          <p className="hidden sm:block">Source: Abdelkader Atia, AgriSkills Academy</p>
        </div>
      </footer>
    </div>
  );
}
