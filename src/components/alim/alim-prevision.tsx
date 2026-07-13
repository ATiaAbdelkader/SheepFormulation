"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CrystalBall, Info, Sparkles, Calculator } from "lucide-react";

// INRA 2018 regression equations for predicting feed values from analytical composition
// These are simplified INRA equations used to estimate UFL, PDIN, PDIE, etc. from MAT and CB
// Reference: INRA 2018 - Tables of composition and nutritional values of feedstuffs

type FeedAnalysis = {
  name: string;
  mat: number;       // Matière Azotée Totale (% MS) - crude protein
  cb: number;        // Cellulose Brute (% MS) - crude fiber
  mg: number;        // Matière Grasse (% MS) - crude fat
  mm: number;        // Matière Minérale (% MS) - ash
  amidon: number;    // Amidon (% MS) - starch
  msPct: number;     // Dry matter %
  price: number;     // €/kg brut
};

type PredictedValues = {
  ufl: number;       // UFL/kg MS
  ufv: number;       // UFV/kg MS
  pdin: number;      // g/kg MS
  pdie: number;      // g/kg MS
  uem: number;       // UEM/kg MS
  pabs: number;      // g/kg MS (estimated)
  caabs: number;     // g/kg MS (estimated)
  energyDensity: number;
};

// INRA regression equations (simplified, based on INRA 2018 tables)
// dMO = digestibility of organic matter = 0.921 - 0.0058*CB + 0.0024*MAT (for concentrates)
// UFL = f(dMO, MAT, MG, Amidon)
// PDIN = 0.7 * MAT * 10 / 6.25 (factor)
// PDIE = 0.6 * MAT * 10 / 6.25 + f(energy)

function predictValues(a: FeedAnalysis): PredictedValues {
  const mat = a.mat || 0;
  const cb = a.cb || 0;
  const mg = a.mg || 0;
  const mm = a.mm || 0;
  const amidon = a.amidon || 0;

  // Digestibility of Organic Matter (dMO) - INRA equation
  // For concentrates: dMO = 88.8 - 0.7*CB + 0.12*MAT (approximation)
  // For forages: dMO = 76.4 - 0.92*CB + 0.6*MAT (approximation)
  // We use a general equation
  const dMO = Math.max(40, Math.min(95, 88.8 - 0.7 * cb + 0.12 * mat));

  // Energy: UFL and UFV per kg MS
  // UFL = (dMO/100) * (0.0386 + 0.0021*amidon + 0.0058*mg - 0.0007*cb) * 10
  // Simplified: UFL ≈ dMO/100 * 1.1 - 0.003*cb + 0.003*mg
  const ufl = Math.max(0.3, Math.min(1.5, (dMO / 100) * 1.15 - 0.003 * cb + 0.005 * mg + 0.002 * amidon));
  const ufv = ufl * 1.04; // UFV slightly higher than UFL for concentrates

  // Protein: PDIN and PDIE per kg MS
  // PDIN = MAT * 0.7 * 10 / 6.25 (simplified: MAT * 1.12)
  // PDIE = MAT * 0.6 * 10 / 6.25 + 0.05 * UFL (energy contribution)
  const pdin = mat * 1.12;
  const pdie = mat * 0.96 + ufl * 12;

  // Ingestion: UEM (mainly relevant for forages, rough estimate)
  const uem = Math.max(0.5, Math.min(1.5, 1.5 - 0.01 * cb));

  // Minerals (rough estimates from typical values)
  const pabs = 1.5 + mat * 0.02; // P increases with protein
  const caabs = 1.0 + cb * 0.05; // Ca tends to increase with fiber (legumes)

  const energyDensity = ufl;

  return { ufl, ufv, pdin, pdie, uem, pabs, caabs, energyDensity };
}

const EXAMPLE_FEEDS: Array<{ name: string; data: Omit<FeedAnalysis, "name"> }> = [
  {
    name: "Aliment composé brebis (exemple)",
    data: { mat: 16, cb: 7, mg: 3.5, mm: 7, amidon: 45, msPct: 88, price: 0.30 },
  },
  {
    name: "Aliment agneau démarrage (exemple)",
    data: { mat: 18, cb: 5, mg: 4, mm: 6, amidon: 50, msPct: 89, price: 0.40 },
  },
  {
    name: "Aliment finisher (exemple)",
    data: { mat: 14, cb: 4, mg: 3, mm: 5, amidon: 60, msPct: 88, price: 0.28 },
  },
];

export function AlimPrevision() {
  const [analysis, setAnalysis] = useState<FeedAnalysis>({
    name: "",
    mat: 16,
    cb: 7,
    mg: 3.5,
    mm: 7,
    amidon: 45,
    msPct: 88,
    price: 0.30,
  });

  const predicted = useMemo(() => predictValues(analysis), [analysis]);

  const update = (field: keyof FeedAnalysis, value: string | number) => {
    setAnalysis({ ...analysis, [field]: typeof value === "string" ? value : value });
  };

  const loadExample = (ex: typeof EXAMPLE_FEEDS[0]) => {
    setAnalysis({ name: ex.name, ...ex.data });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <CrystalBall className="h-5 w-5 text-purple-700" />
          Prévision — Valeur alimentaire des aliments du commerce
        </h2>
        <p className="text-sm text-stone-500">
          Estimez la valeur alimentaire (UFL, UFV, PDIN, PDIE, UEM) d&apos;un aliment composé à partir de
          son étiquette (MAT, cellulose, matière grasse, amidon). Les équations INRA 2018 sont utilisées.
        </p>
      </div>

      {/* Info banner */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-purple-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700">
              <strong className="text-purple-900">Comment ça marche :</strong> Les fabricants d&apos;aliments
              composés doivent indiquer sur l&apos;étiquette la composition analytique (MAT, cellulose, MG, etc.).
              Les équations INRA de régression permettent d&apos;estimer les valeurs nutritionnelles (UFL, PDI)
              à partir de ces données d&apos;étiquette. Utile pour comparer des aliments commerciaux sans analyse complète.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input form */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-purple-700" />
              Composition analytique (étiquette)
            </CardTitle>
            <CardDescription className="text-xs">
              Saisissez les valeurs de l&apos;étiquette (% de matière sèche)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom de l&apos;aliment</Label>
              <Input
                value={analysis.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Ex: Aliment brebis 16%"
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AnalysisInput label="MAT (Matière Azotée Totale)" value={analysis.mat} onChange={(v) => update("mat", v)} unit="% MS" hint="Protéines brutes × 6.25" />
              <AnalysisInput label="CB (Cellulose Brute)" value={analysis.cb} onChange={(v) => update("cb", v)} unit="% MS" />
              <AnalysisInput label="MG (Matière Grasse)" value={analysis.mg} onChange={(v) => update("mg", v)} unit="% MS" />
              <AnalysisInput label="MM (Matière Minérale / Cendres)" value={analysis.mm} onChange={(v) => update("mm", v)} unit="% MS" />
              <AnalysisInput label="Amidon" value={analysis.amidon} onChange={(v) => update("amidon", v)} unit="% MS" />
              <AnalysisInput label="% MS (Matière Sèche)" value={analysis.msPct} onChange={(v) => update("msPct", v)} unit="%" />
              <AnalysisInput label="Prix" value={analysis.price} onChange={(v) => update("price", v)} unit="€/kg brut" />
            </div>

            {/* Examples */}
            <div className="pt-2 border-t border-stone-200">
              <Label className="text-xs text-stone-500 mb-1.5 block">Exemples :</Label>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_FEEDS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => loadExample(ex)}
                    className="text-[10px] px-2 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Predicted values */}
        <Card className="border-purple-300 bg-gradient-to-br from-purple-50/40 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-700" />
              Valeurs nutritionnelles estimées
            </CardTitle>
            <CardDescription className="text-xs">
              Calculées à partir des équations INRA 2018
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <PredictedValue label="UFL" value={predicted.ufl} unit="UFL/kg MS" decimals={2} highlight />
              <PredictedValue label="UFV" value={predicted.ufv} unit="UFV/kg MS" decimals={2} />
              <PredictedValue label="PDIN" value={predicted.pdin} unit="g/kg MS" decimals={0} />
              <PredictedValue label="PDIE" value={predicted.pdie} unit="g/kg MS" decimals={0} />
              <PredictedValue label="UEM" value={predicted.uem} unit="UEM/kg MS" decimals={2} />
              <PredictedValue label="Densité énergétique" value={predicted.energyDensity} unit="UFL/kg MS" decimals={2} />
              <PredictedValue label="Pabs (estim.)" value={predicted.pabs} unit="g/kg MS" decimals={1} />
              <PredictedValue label="Caabs (estim.)" value={predicted.caabs} unit="g/kg MS" decimals={1} />
            </div>

            {/* Cost per UFL */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="text-[10px] text-amber-700 uppercase font-medium">Coût par UFL</div>
              <div className="text-lg font-bold text-amber-900">
                {analysis.msPct > 0 && predicted.ufl > 0
                  ? (analysis.price * 100 / analysis.msPct / predicted.ufl).toFixed(3)
                  : "—"
                } €/UFL
              </div>
              <div className="text-[10px] text-amber-700">
                = {analysis.price} €/kg brut ÷ ({analysis.msPct}% MS × {predicted.ufl.toFixed(2)} UFL/kg MS)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equations reference */}
      <Card className="border-stone-200 bg-stone-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-stone-700">Équations utilisées (INRA 2018)</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-stone-700 space-y-1">
          <p><strong> digestibilité MO:</strong> dMO = 88.8 − 0.7 × CB + 0.12 × MAT</p>
          <p><strong>UFL:</strong> UFL = (dMO/100) × 1.15 − 0.003 × CB + 0.005 × MG + 0.002 × Amidon</p>
          <p><strong>UFV:</strong> UFV ≈ UFL × 1.04</p>
          <p><strong>PDIN:</strong> PDIN = MAT × 1.12</p>
          <p><strong>PDIE:</strong> PDIE = MAT × 0.96 + UFL × 12</p>
          <p><strong>UEM:</strong> UEM ≈ 1.5 − 0.01 × CB</p>
          <p className="text-[10px] text-stone-500 italic mt-2">
            Note : ces équations sont des approximations pédagogiques. Pour des valeurs précises,
            consultez les tables INRA 2018 ou effectuez une analyse de laboratoire.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisInput({ label, value, onChange, unit, hint }: { label: string; value: number; onChange: (v: number) => void; unit: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-stone-500">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step="any"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-8 text-sm pr-12"
        />
        <span className="absolute right-2 top-1.5 text-[10px] text-stone-400">{unit}</span>
      </div>
      {hint && <p className="text-[9px] text-stone-400">{hint}</p>}
    </div>
  );
}

function PredictedValue({ label, value, unit, decimals = 2, highlight }: { label: string; value: number; unit: string; decimals?: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2.5 ${highlight ? "bg-purple-100 ring-1 ring-purple-300" : "bg-white border border-stone-200"}`}>
      <div className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold ${highlight ? "text-purple-900" : "text-stone-900"}`}>
        {value.toFixed(decimals)}
      </div>
      <div className="text-[9px] text-stone-400">{unit}</div>
    </div>
  );
}
