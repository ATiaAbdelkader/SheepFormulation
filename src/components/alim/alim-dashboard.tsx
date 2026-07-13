"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { alimData } from "@/lib/alim-data";
import {
  Users,
  Wheat,
  Sprout,
  Pill,
  Calculator,
  Baby,
  Scale,
  Blend,
  Trees,
  ArrowRight,
  BookOpen,
} from "lucide-react";

export type AlimView =
  | "dashboard"
  | "animals"
  | "fourrages"
  | "concentres"
  | "cmv"
  | "ration"
  | "agneaux"
  | "bilan"
  | "melange"
  | "paturage";

type ModuleCard = {
  id: AlimView;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  stat?: string;
  statLabel?: string;
};

const MODULES: ModuleCard[] = [
  {
    id: "ration",
    title: "Ration",
    description: "Établir une ration équilibrée pour un lot d'animaux. Sélectionnez l'animal, les fourrages, les concentrés et le CMV.",
    icon: <Calculator className="h-6 w-6" />,
    color: "emerald",
    stat: "Calculateur",
    statLabel: "UFL, PDI, Pabs, Caabs",
  },
  {
    id: "animals",
    title: "Animaux",
    description: "Besoins alimentaires recommandés (UEM, UFL, PDI, Pabs, Caabs) par catégorie, poids et stade physiologique.",
    icon: <Users className="h-6 w-6" />,
    color: "amber",
    stat: `${alimData.animals.length}`,
    statLabel: "catégories",
  },
  {
    id: "fourrages",
    title: "Fourrages",
    description: "Valeurs alimentaires des fourrages (foin, ensilage, pâture, etc.) : % MS, UEM, UFL, PDIN, PDIE, Pabs, Caabs.",
    icon: <Wheat className="h-6 w-6" />,
    color: "lime",
    stat: `${alimData.fourrages.length}`,
    statLabel: "fourrages",
  },
  {
    id: "concentres",
    title: "Concentrés",
    description: "Valeurs alimentaires des concentrés (céréales, tourteaux, protéagineux) par kg brut.",
    icon: <Sprout className="h-6 w-6" />,
    color: "orange",
    stat: `${alimData.concentres.length}`,
    statLabel: "concentrés",
  },
  {
    id: "cmv",
    title: "CMV",
    description: "Compléments Minéraux Vitaminés avec rapports Ca/P variés pour corriger les déficits minéraux.",
    icon: <Pill className="h-6 w-6" />,
    color: "rose",
    stat: `${alimData.cmvs.length}`,
    statLabel: "CMV",
  },
  {
    id: "agneaux",
    title: "Agneaux à l'engrais",
    description: "Besoins des agneaux (UFV, PDI, Pabs, Caabs) selon le poids, le GMQ et le potentiel. Calculateur d'engraissement.",
    icon: <Baby className="h-6 w-6" />,
    color: "yellow",
    stat: `${alimData.agneaux.length}`,
    statLabel: "combinaisons",
  },
  {
    id: "bilan",
    title: "Bilan fourrager",
    description: "Évaluation des besoins du troupeau et comparaison avec les stocks disponibles.",
    icon: <Scale className="h-6 w-6" />,
    color: "teal",
    stat: "Troupeau",
    statLabel: "Lots & stocks",
  },
  {
    id: "melange",
    title: "Mélange 2 concentrés",
    description: "Calcul de la composition d'un mélange de 2 concentrés pour atteindre un objectif UFL/PDIN.",
    icon: <Blend className="h-6 w-6" />,
    color: "cyan",
    stat: "Système 2×2",
    statLabel: "Équations",
  },
  {
    id: "paturage",
    title: "Pâturage",
    description: "Estimation des jours de pâturage d'avance en fonction de la surface, du cheptel et de la pousse de l'herbe.",
    icon: <Trees className="h-6 w-6" />,
    color: "green",
    stat: "Herbomètre",
    statLabel: "Densité prairie",
  },
];

const colorClasses: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "hover:ring-emerald-200", dot: "bg-emerald-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", ring: "hover:ring-amber-200", dot: "bg-amber-600" },
  lime: { bg: "bg-lime-50", text: "text-lime-700", ring: "hover:ring-lime-200", dot: "bg-lime-600" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", ring: "hover:ring-orange-200", dot: "bg-orange-600" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", ring: "hover:ring-rose-200", dot: "bg-rose-600" },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-700", ring: "hover:ring-yellow-200", dot: "bg-yellow-600" },
  teal: { bg: "bg-teal-50", text: "text-teal-700", ring: "hover:ring-teal-200", dot: "bg-teal-600" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-700", ring: "hover:ring-cyan-200", dot: "bg-cyan-600" },
  green: { bg: "bg-green-50", text: "text-green-700", ring: "hover:ring-green-200", dot: "bg-green-600" },
};

export function AlimDashboard({ onNavigate }: { onNavigate: (v: AlimView) => void }) {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden border-stone-200 bg-gradient-to-br from-emerald-700 to-emerald-900 text-white">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-emerald-200 mb-2">Outil pédagogique</p>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-3">
                Rationnement des ovins
              </h2>
              <p className="text-sm text-emerald-100 max-w-2xl leading-relaxed">
                OvinFormulation v1.0 est l&apos;outil de référence pour formuler des rations
                ovines équilibrées : besoins des animaux, valeurs alimentaires des fourrages
                et concentrés, calcul de ration, bilan fourrager, formulation d&apos;aliment
                et suivi de pâturage.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => onNavigate("ration")}
                  className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 transition-colors"
                >
                  <Calculator className="h-4 w-4" />
                  Démarrer une ration
                </button>
                <button
                  onClick={() => onNavigate("animals")}
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600/40 px-4 py-2 text-sm font-medium text-white ring-1 ring-emerald-300/40 hover:bg-emerald-600/60 transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  Consulter les bases
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-3 w-full md:w-auto">
              <StatBox value={alimData.animals.length} label="Animaux" />
              <StatBox value={alimData.fourrages.length} label="Fourrages" />
              <StatBox value={alimData.concentres.length} label="Concentrés" />
              <StatBox value={alimData.agneaux.length} label="Agneaux" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-stone-900">Modules</h3>
          <p className="text-xs text-stone-500">9 modules disponibles</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((m) => {
            const c = colorClasses[m.color];
            return (
              <Card
                key={m.id}
                className={`group cursor-pointer border-stone-200 ring-1 ring-transparent transition-all hover:shadow-md ${c.ring}`}
                onClick={() => onNavigate(m.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${c.bg} ${c.text}`}>
                      {m.icon}
                    </div>
                    {m.stat && (
                      <div className="text-right">
                        <div className="text-xs text-stone-500">{m.statLabel}</div>
                        <div className={`text-sm font-semibold ${c.text}`}>{m.stat}</div>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-base mt-3 flex items-center gap-2">
                    {m.title}
                    <ArrowRight className="h-3 w-3 text-stone-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">{m.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* About section */}
      <Card className="border-stone-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-700" />
            Comprendre les unités alimentaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <UnitDefinition
              symbol="UEM"
              name="Unité d'Encombrement Mouton"
              desc="Capacité d'ingestion de l'animal. Une UEM = environ 1,7 kg de MS de foin."
            />
            <UnitDefinition
              symbol="UFL"
              name="Unité Fourragère Lait"
              desc="Énergie nette pour la production laitière (1 UFL = 1700 kcal nettes)."
            />
            <UnitDefinition
              symbol="UFV"
              name="Unité Fourragère Viande"
              desc="Énergie nette pour la production de viande (utilisée pour les agneaux)."
            />
            <UnitDefinition
              symbol="PDI"
              name="Protéines Digestibles Intestinales"
              desc="Protéines réellement absorbées dans l'intestin. Déclinées en PDIN et PDIE."
            />
            <UnitDefinition
              symbol="Pabs"
              name="Phosphore absorbable"
              desc="Phosphore réellement disponible pour l'animal (g/kg)."
            />
            <UnitDefinition
              symbol="Caabs"
              name="Calcium absorbable"
              desc="Calcium réellement disponible pour l'animal (g/kg)."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur px-3 py-2 ring-1 ring-white/20">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-emerald-100">{label}</div>
    </div>
  );
}

function UnitDefinition({ symbol, name, desc }: { symbol: string; name: string; desc: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center justify-center rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
          {symbol}
        </span>
        <span className="text-xs font-medium text-stone-700">{name}</span>
      </div>
      <p className="text-xs text-stone-600 leading-relaxed">{desc}</p>
    </div>
  );
}
