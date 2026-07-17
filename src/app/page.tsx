"use client";

import { useState, useEffect, type ReactNode } from "react";
import { LayoutDashboard, Users, Wheat, Sprout, Pill, Calculator, Baby, Scale, Blend, Trees, Zap, GitCompare, FlaskConical, BookOpen, CalendarDays, Telescope, ShieldCheck, Sparkles, Atom, GraduationCap, Menu, X, Lock, ChevronDown, Factory, Check, Package, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  type UserRole, ROLES, MODULE_ACCESS, LOCKED_MODULES,
  canAccess, getStoredRole, setStoredRole, getRoleInfo, getNextRole,
} from "@/lib/user-roles";
import { AlimDashboard } from "@/components/alim/alim-dashboard";
import { AlimAnimals } from "@/components/alim/alim-animals";
import { AlimFourrages } from "@/components/alim/alim-fourrages";
import { AlimConcentres } from "@/components/alim/alim-concentres";
import { AlimCMV } from "@/components/alim/alim-cmv";
import { AlimRationPro } from "@/components/alim/alim-ration-pro";
import { AlimAIRation } from "@/components/alim/alim-ai-ration";
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
import { AlimRumenSim } from "@/components/alim/alim-rumen-sim";
import { AlimClassroom } from "@/components/alim/alim-classroom";
import { AlimProduction } from "@/components/alim/alim-production";

type AlimView =
  | "dashboard" | "animals" | "fourrages" | "concentres" | "cmv"
  | "ration" | "verificateur" | "ai-ration" | "optimisation" | "comparer"
  | "custom-feeds" | "agneaux" | "bilan" | "melange" | "paturage"
  | "glossaire" | "calendrier" | "prevision" | "rumen-sim" | "classroom"
  | "production";

const NAV_ITEMS: { id: AlimView; label: string; description: string; icon: ReactNode }[] = [
  { id: "dashboard", label: "Tableau de bord", description: "Vue d'ensemble", icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: "ration", label: "Ration", description: "Établir une ration", icon: <Calculator className="h-5 w-5" /> },
  { id: "ai-ration", label: "Assistant IA", description: "Générer une ration par IA", icon: <Sparkles className="h-5 w-5" /> },
  { id: "verificateur", label: "Vérificateur", description: "Analyser une ration inconnue", icon: <ShieldCheck className="h-5 w-5" /> },
  { id: "optimisation", label: "Optimisation", description: "Moindre coût (LP)", icon: <Zap className="h-5 w-5" /> },
  { id: "comparer", label: "Comparer", description: "Simulateur de scénarios", icon: <GitCompare className="h-5 w-5" /> },
  { id: "custom-feeds", label: "Mes aliments", description: "Aliments personnalisés", icon: <FlaskConical className="h-5 w-5" /> },
  { id: "animals", label: "Animaux", description: "Besoins alimentaires", icon: <Users className="h-5 w-5" /> },
  { id: "fourrages", label: "Fourrages", description: "Base & qualité", icon: <Wheat className="h-5 w-5" /> },
  { id: "concentres", label: "Concentrés", description: "Marché & fournisseurs", icon: <Sprout className="h-5 w-5" /> },
  { id: "cmv", label: "CMV", description: "Assistant de sélection", icon: <Pill className="h-5 w-5" /> },
  { id: "agneaux", label: "Agneaux", description: "Besoins à l'engrais", icon: <Baby className="h-5 w-5" /> },
  { id: "bilan", label: "Bilan fourrager", description: "Bilan du troupeau", icon: <Scale className="h-5 w-5" /> },
  { id: "melange", label: "Mélange", description: "Calculateur avancé", icon: <Blend className="h-5 w-5" /> },
  { id: "paturage", label: "Pâturage", description: "Jours d'avance", icon: <Trees className="h-5 w-5" /> },
  { id: "glossaire", label: "Glossaire", description: "Encyclopédie FR/EN/AR", icon: <BookOpen className="h-5 w-5" /> },
  { id: "calendrier", label: "Calendrier", description: "Planning du troupeau", icon: <CalendarDays className="h-5 w-5" /> },
  { id: "prevision", label: "Prévision", description: "Décodeur d'étiquette", icon: <Telescope className="h-5 w-5" /> },
  { id: "rumen-sim", label: "Rumen Lab", description: "Laboratoire interactif", icon: <Atom className="h-5 w-5" /> },
  { id: "classroom", label: "Classe", description: "Académie LMS", icon: <GraduationCap className="h-5 w-5" /> },
  { id: "production", label: "Production", description: "Batches & traçabilité", icon: <Factory className="h-5 w-5" /> },
];

export default function Home() {
  const [view, setView] = useState<AlimView>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<UserRole>("farmer");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{ moduleId: string; moduleLabel: string; requiredRole: UserRole } | null>(null);

  // Load role from localStorage on mount
  useEffect(() => {
    const stored = getStoredRole();
    Promise.resolve().then(() => setRole(stored));
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setStoredRole(newRole);
    setRoleMenuOpen(false);
    // If current view is not accessible in new role, go to dashboard
    if (!canAccess(newRole, view)) {
      setView("dashboard");
    }
  };

  const handleNav = (id: AlimView) => {
    // Check if module is accessible
    if (!canAccess(role, id)) {
      // Find the locked module info
      const locked = LOCKED_MODULES[role].find((m) => m.id === id);
      if (locked) {
        setUpgradeModal({ moduleId: id, moduleLabel: locked.label, requiredRole: locked.requiredRole });
      }
      setMobileOpen(false);
      return;
    }
    setView(id);
    setMobileOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const roleInfo = getRoleInfo(role);

  // Split nav items: accessible + locked
  const accessibleItems = NAV_ITEMS.filter((item) => canAccess(role, item.id));
  const lockedItems = LOCKED_MODULES[role]
    .map((locked) => NAV_ITEMS.find((n) => n.id === locked.id))
    .filter(Boolean) as typeof NAV_ITEMS;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
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
              <p className="text-[11px] text-stone-500 leading-tight hidden sm:block">Rationnement des ovins</p>
            </div>
          </div>

          {/* Role selector */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                roleInfo.bgColor, roleInfo.color, "hover:opacity-80"
              )}
            >
              <span className="text-base">{roleInfo.icon}</span>
              <span className="hidden sm:inline">{roleInfo.shortLabel}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {roleMenuOpen && (
              <div className="absolute right-0 mt-1 w-80 rounded-lg border border-stone-200 bg-white shadow-xl z-50">
                <div className="p-2 border-b border-stone-100">
                  <p className="text-[10px] font-semibold text-stone-500 uppercase">Choisir votre profil</p>
                </div>
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleRoleChange(r.id)}
                    className={cn(
                      "w-full text-left p-3 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-0",
                      role === r.id && "bg-stone-50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl flex-shrink-0">{r.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-stone-900">{r.label}</span>
                          {role === r.id && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                        </div>
                        <p className="text-[10px] text-stone-500 mt-0.5 leading-relaxed">{r.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {r.features.slice(0, 3).map((f, i) => (
                            <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">{f}</span>
                          ))}
                          {r.features.length > 3 && <span className="text-[8px] text-stone-400">+{r.features.length - 3} autres</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-stone-200 bg-white">
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {/* Accessible modules */}
            {accessibleItems.map((item) => (
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
                <span className={cn("mt-0.5", view === item.id ? "text-emerald-700" : "text-stone-500")}>{item.icon}</span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">{item.label}</span>
                  <span className="text-[11px] text-stone-500 leading-tight">{item.description}</span>
                </span>
              </button>
            ))}

            {/* Locked modules */}
            {lockedItems.length > 0 && (
              <>
                <div className="pt-3 pb-1 px-3">
                  <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" /> Modules premium
                  </span>
                </div>
                {lockedItems.map((item) => {
                  const locked = LOCKED_MODULES[role].find((m) => m.id === item.id);
                  const requiredRoleInfo = locked ? getRoleInfo(locked.requiredRole) : null;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors text-stone-400 hover:bg-stone-50"
                    >
                      <span className="mt-0.5 text-stone-300">{item.icon}</span>
                      <span className="flex flex-col flex-1">
                        <span className="text-sm font-medium leading-tight flex items-center gap-1">
                          {item.label}
                          <Lock className="h-2.5 w-2.5 text-stone-300" />
                        </span>
                        <span className="text-[11px] text-stone-400 leading-tight">
                          {requiredRoleInfo && `${requiredRoleInfo.icon} ${requiredRoleInfo.label}`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </nav>
          <div className="border-t border-stone-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-xs font-medium", roleInfo.color)}>{roleInfo.icon} {roleInfo.label}</span>
            </div>
            <p className="text-[10px] text-stone-400 leading-relaxed">
              {accessibleItems.length} modules accessibles
              {lockedItems.length > 0 && ` · ${lockedItems.length} verrouillés`}
            </p>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setMobileOpen(false)}>
            <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex h-16 items-center justify-between px-4 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded", roleInfo.bgColor, roleInfo.color)}>
                    {roleInfo.icon} {roleInfo.shortLabel}
                  </span>
                  <span className="font-semibold text-stone-900">Navigation</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {accessibleItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={cn(
                      "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      view === item.id ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200" : "text-stone-700 hover:bg-stone-100"
                    )}
                  >
                    <span className={cn("mt-0.5", view === item.id ? "text-emerald-700" : "text-stone-500")}>{item.icon}</span>
                    <span className="flex flex-col">
                      <span className="text-sm font-medium leading-tight">{item.label}</span>
                      <span className="text-[11px] text-stone-500 leading-tight">{item.description}</span>
                    </span>
                  </button>
                ))}
                {lockedItems.length > 0 && (
                  <>
                    <div className="pt-3 pb-1 px-3">
                      <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" /> Premium
                      </span>
                    </div>
                    {lockedItems.map((item) => {
                      const locked = LOCKED_MODULES[role].find((m) => m.id === item.id);
                      const reqInfo = locked ? getRoleInfo(locked.requiredRole) : null;
                      return (
                        <button key={item.id} onClick={() => handleNav(item.id)}
                          className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left text-stone-400 hover:bg-stone-50">
                          <span className="mt-0.5 text-stone-300">{item.icon}</span>
                          <span className="flex flex-col">
                            <span className="text-sm font-medium leading-tight flex items-center gap-1">
                              {item.label}<Lock className="h-2.5 w-2.5 text-stone-300" />
                            </span>
                            <span className="text-[11px] text-stone-400">{reqInfo && `${reqInfo.icon} ${reqInfo.label}`}</span>
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
            {view === "dashboard" && <AlimDashboard onNavigate={handleNav} role={role} />}
            {view === "ration" && <AlimRationPro />}
            {view === "ai-ration" && <AlimAIRation />}
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
            {view === "rumen-sim" && <AlimRumenSim />}
            {view === "classroom" && <AlimClassroom />}
            {view === "production" && <AlimProduction />}
          </div>
        </main>
      </div>

      {/* Upgrade modal */}
      {upgradeModal && (
        <UpgradeModal
          moduleLabel={upgradeModal.moduleLabel}
          requiredRole={upgradeModal.requiredRole}
          currentRole={role}
          onClose={() => setUpgradeModal(null)}
          onUpgrade={() => {
            handleRoleChange(upgradeModal.requiredRole);
            handleNav(upgradeModal.moduleId as AlimView);
            setUpgradeModal(null);
          }}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white">
        <div className="container mx-auto px-4 sm:px-6 py-4 max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
          <p>OvinFormulation v1.0 — Rationnement des ovins</p>
          <p className="hidden sm:block">Source: Abdelkader Atia, AgriSkills Academy</p>
        </div>
      </footer>
    </div>
  );
}

// ---------- Upgrade Modal ----------
function UpgradeModal({
  moduleLabel, requiredRole, currentRole, onClose, onUpgrade,
}: {
  moduleLabel: string;
  requiredRole: UserRole;
  currentRole: UserRole;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  const reqInfo = getRoleInfo(requiredRole);
  const nextRole = getNextRole(currentRole);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-stone-400" /> Module verrouillé
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-xs">
            <strong>{moduleLabel}</strong> nécessite le profil <strong>{reqInfo.icon} {reqInfo.label}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={cn("rounded-lg p-3", reqInfo.bgColor)}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{reqInfo.icon}</span>
              <div>
                <div className={cn("text-sm font-bold", reqInfo.color)}>{reqInfo.label}</div>
                <p className="text-[10px] text-stone-600">{reqInfo.description}</p>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-stone-600 uppercase">Ce que vous débloquez:</span>
              {reqInfo.features.map((f, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-stone-700">
                  <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Plus tard</Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={onUpgrade}>
              Passer à {reqInfo.icon} {reqInfo.label}
            </Button>
          </div>
          <p className="text-[10px] text-center text-stone-400">
            Gratuit — il suffit de changer votre profil
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
