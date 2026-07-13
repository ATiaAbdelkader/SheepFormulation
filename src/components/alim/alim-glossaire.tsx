"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Search, Calculator, FlaskConical, Scale, Leaf, DollarSign } from "lucide-react";

type GlossaryEntry = {
  symbol: string;
  name: string;
  category: "energie" | "proteines" | "mineraux" | "ingestion" | "economie" | "indicateur";
  unit: string;
  description: string;
  formula?: string;
  reference: string;
  normalRange?: string;
};

const GLOSSARY: GlossaryEntry[] = [
  // Énergie
  {
    symbol: "UFL",
    name: "Unité Fourragère Lait",
    category: "energie",
    unit: "UFL/kg MS",
    description: "Unité de référence pour l'énergie nette destinée à la production laitière et l'entretien. 1 UFL = 1700 kcal d'énergie nette. Utilisée pour les brebis, agnelles et béliers.",
    reference: "INRA 2018 — Système d'unités fourragères",
    normalRange: "Fourrages: 0.4–1.0 UFL/kg MS · Concentrés: 0.8–1.3 UFL/kg MS",
  },
  {
    symbol: "UFV",
    name: "Unité Fourragère Viande",
    category: "energie",
    unit: "UFV/kg MS",
    description: "Unité d'énergie nette pour la production de viande. Utilisée principalement pour les agneaux à l'engrais. 1 UFV ≈ 1.82 UFL (selon le type d'animal).",
    reference: "INRA 2018",
    normalRange: "Agneaux: besoin de 0.6 à 1.5 UFV/j selon le poids et le GMQ",
  },
  {
    symbol: "UEM",
    name: "Unité d'Encombrement Mouton",
    category: "ingestion",
    unit: "UEM",
    description: "Mesure la capacité d'ingestion de l'animal. Une UEM correspond à environ 1.7 kg de MS de foin. La somme des UEM des aliments ne doit pas dépasser la capacité d'ingestion de l'animal.",
    reference: "INRA 2018 — Capacité d'ingestion",
    normalRange: "Brebis 70 kg: 1.5–2.5 UEM/j · Bélier: 2.0–3.0 UEM/j",
  },
  {
    symbol: "DERm",
    name: "Densité Énergétique de la Ration minimale",
    category: "indicateur",
    unit: "UFL/UEM",
    description: "Rapport entre les besoins en UFL et la capacité d'ingestion (UEM). Indique la densité énergétique minimale que doit avoir la ration pour couvrir les besoins sans dépasser la capacité d'ingestion.",
    formula: "DERm = Besoins UFL / Capacité d'ingestion (UEM)",
    reference: "INRA 2018",
    normalRange: "Brebis gestantes: 0.6–0.8 · Brebis allaitantes: 0.9–1.1",
  },
  // Protéines
  {
    symbol: "PDIN",
    name: "Protéines Digestibles Intestinales (azote)",
    category: "proteines",
    unit: "g/kg MS",
    description: "Protéines réellement absorbées dans l'intestin, issues de la dégradation de l'azote alimentaire non utilisisé par les microbes du rumen. Réflette l'apport protéique alimentaire.",
    reference: "INRA 2018 — Système PDI",
    normalRange: "Fourrages: 50–120 g/kg · Concentrés: 60–350 g/kg",
  },
  {
    symbol: "PDIE",
    name: "Protéines Digestibles Intestinales (énergie)",
    category: "proteines",
    unit: "g/kg MS",
    description: "Protéines microbiennes issues de la fermentation énergétique du rumen. Limite la synthèse microbienne lorsque l'énergie est le facteur limitant.",
    reference: "INRA 2018",
    normalRange: "Fourrages: 50–100 g/kg · Concentrés: 60–230 g/kg",
  },
  {
    symbol: "PDI",
    name: "Protéines Digestibles Intestinales",
    category: "proteines",
    unit: "g/jour",
    description: "Protéines réellement disponibles pour l'animal. Le PDI effectif est le minimum entre PDIN et PDIE (le facteur limitant détermine l'apport réel).",
    formula: "PDI = min(PDIN, PDIE)",
    reference: "INRA 2018",
    normalRange: "Brebis 70 kg gestante: 100–180 g/j · Allaitante: 150–280 g/j",
  },
  {
    symbol: "RMIC",
    name: "Rumen Microbial Nitrogen Balance",
    category: "indicateur",
    unit: "g PDI/UFL",
    description: "Indicateur de l'équilibre entre l'azote et l'énergie disponibles pour les microbes du rumen. Une valeur trop négative indique un déficit en azote dégradable, limitant la synthèse microbienne.",
    formula: "RMIC = (PDIN - PDIE) / UFL",
    reference: "INRA 2018",
    normalRange: "> -12 (agneaux simples) · > -6 (agneaux doubles) · Idéalement proche de 0",
  },
  // Minéraux
  {
    symbol: "Pabs",
    name: "Phosphore absorbable",
    category: "mineraux",
    unit: "g/kg MS",
    description: "Phosphore réellement disponible pour l'animal après absorption intestinale. Essentiel pour la croissance osseuse, le métabolisme énergétique et la reproduction.",
    reference: "INRA 2018",
    normalRange: "Fourrages: 1.0–4.0 g/kg · Concentrés: 0.5–9.0 g/kg",
  },
  {
    symbol: "Caabs",
    name: "Calcium absorbable",
    category: "mineraux",
    unit: "g/kg MS",
    description: "Calcium réellement disponible pour l'animal. Critique pour la croissance osseuse, la lactation et la contraction musculaire.",
    reference: "INRA 2018",
    normalRange: "Fourrages: 0.5–5.0 g/kg · Concentrés: 0.3–11.0 g/kg",
  },
  {
    symbol: "Ca/P",
    name: "Rapport Calcium/Phosphore",
    category: "indicateur",
    unit: "ratio",
    description: "Rapport entre le calcium absorbable et le phosphore absorbable. Un rapport équilibré est crucial pour éviter les calculs urinaires (trop de P) ou les troubles de l'absorption (trop de Ca).",
    formula: "Ca/P = Caabs / Pabs",
    reference: "INRA 2018",
    normalRange: "Optimal: 1.0–1.5 · < 1.0 = risque de calculs · > 2.0 = interfère avec l'absorption du P",
  },
  {
    symbol: "CMV",
    name: "Complément Minéral Vitaminé",
    category: "mineraux",
    unit: "g/jour",
    description: "Mélange de minéraux (Ca, P, Mg, Na, oligo-éléments) et vitamines (A, D3, E) utilisé pour corriger les déficits minéraux de la ration. Le choix du CMV dépend du rapport Ca/P du déficit.",
    reference: "INRA 2018",
    normalRange: "10–50 g/animal/jour selon le déficit",
  },
  // Économie
  {
    symbol: "€/UFL",
    name: "Coût par Unité Fourragère Lait",
    category: "economie",
    unit: "€/UFL",
    description: "Indicateur économique permettant de comparer l'efficience énergétique des rations. Plus le coût par UFL est bas, plus la ration est économique.",
    formula: "Coût/UFL = Coût total de la ration / UFL totaux",
    reference: "Calcul OvinFormulation",
    normalRange: "Fourrages: 0.05–0.20 €/UFL · Concentrés: 0.15–0.50 €/UFL",
  },
  {
    symbol: "€/kg MS",
    name: "Coût par kg de matière sèche",
    category: "economie",
    unit: "€/kg MS",
    description: "Coût unitaire de la matière sèche de la ration. Permet de comparer des rations indépendamment de leur concentration énergétique.",
    formula: "Coût/kg MS = Coût total / MS totale",
    reference: "Calcul OvinFormulation",
  },
];

const CATEGORIES = [
  { id: "all", label: "Toutes", icon: BookOpen, color: "text-stone-700" },
  { id: "energie", label: "Énergie", icon: Calculator, color: "text-amber-700" },
  { id: "proteines", label: "Protéines", icon: FlaskConical, color: "text-emerald-700" },
  { id: "mineraux", label: "Minéraux", icon: Scale, color: "text-rose-700" },
  { id: "ingestion", label: "Ingestion", icon: Leaf, color: "text-lime-700" },
  { id: "economie", label: "Économie", icon: DollarSign, color: "text-amber-700" },
  { id: "indicateur", label: "Indicateurs", icon: BookOpen, color: "text-cyan-700" },
] as const;

export function AlimGlossaire() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    return GLOSSARY.filter((g) => {
      if (search) {
        const s = search.toLowerCase();
        return g.symbol.toLowerCase().includes(s) || g.name.toLowerCase().includes(s) || g.description.toLowerCase().includes(s);
      }
      if (category !== "all" && g.category !== category) return false;
      return true;
    });
  }, [search, category]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-cyan-700" />
          Glossaire & références
        </h2>
        <p className="text-sm text-stone-500">
          Définitions des unités alimentaires (INRA 2018), formules de calcul, plages de valeurs normales
          et références bibliographiques utilisées dans OvinFormulation.
        </p>
      </div>

      {/* Filters */}
      <Card className="border-stone-200">
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Rechercher un terme, une unité, une formule..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    category === c.id
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Badge variant="outline" className="bg-stone-50">
          {filtered.length} terme{filtered.length > 1 ? "s" : ""}
        </Badge>
        <span className="text-[10px] text-stone-500">Référence principale : INRA 2018 — Alimentation des ruminants</span>
      </div>

      {/* Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((g, i) => (
          <Card key={i} className="border-stone-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center justify-center rounded-md bg-stone-900 text-white px-2.5 py-1 text-sm font-bold font-mono flex-shrink-0">
                    {g.symbol}
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold text-stone-900">{g.name}</CardTitle>
                    <CardDescription className="text-[10px]">{g.unit}</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[9px] flex-shrink-0 ${getCategoryColor(g.category)}`}>
                  {CATEGORIES.find((c) => c.id === g.category)?.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-stone-700 leading-relaxed">{g.description}</p>
              {g.formula && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-2">
                  <div className="text-[9px] text-amber-700 uppercase font-medium mb-0.5">Formule</div>
                  <code className="text-xs font-mono text-amber-900">{g.formula}</code>
                </div>
              )}
              {g.normalRange && (
                <div className="rounded-md bg-stone-50 p-2">
                  <div className="text-[9px] text-stone-500 uppercase font-medium mb-0.5">Plage normale</div>
                  <div className="text-xs text-stone-700">{g.normalRange}</div>
                </div>
              )}
              <div className="text-[10px] text-stone-400 italic">
                <BookOpen className="h-3 w-3 inline mr-1" />
                {g.reference}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* References section */}
      <Card className="border-stone-200 bg-stone-50">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-stone-600" />
            Références bibliographiques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-stone-700">
          <p className="leading-relaxed">
            <strong>INRA (2018).</strong> Alimentation des ruminants. Apports nutritionnels et besoins.
            Éditions Quae, Versailles. 720 p.
          </p>
          <p className="leading-relaxed">
            <strong>RANOUX, F.</strong> Alim&apos;OVINS v5.1 — Rationnement des ovins. Lycée Agricole du Bourbonnais, Moulins.
          </p>
          <p className="leading-relaxed">
            <strong>Atia, A.</strong> OvinFormulation v1.0 — AgriSkills Academy. Adaptation web de l&apos;outil Alim&apos;OVINS.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    energie: "bg-amber-100 text-amber-800",
    proteines: "bg-emerald-100 text-emerald-800",
    mineraux: "bg-rose-100 text-rose-800",
    ingestion: "bg-lime-100 text-lime-800",
    economie: "bg-yellow-100 text-yellow-800",
    indicateur: "bg-cyan-100 text-cyan-800",
  };
  return map[cat] || "bg-stone-100 text-stone-800";
}
