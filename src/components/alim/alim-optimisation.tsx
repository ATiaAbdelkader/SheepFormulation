"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, type AnimalRecord, type FourrageRecord, type ConcentreRecord } from "@/lib/alim-data";
import { solveLP } from "@/lib/lp-solver";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Zap, Plus, Trash2, AlertTriangle, CheckCircle2, Info, Sparkles, TrendingDown } from "lucide-react";

type FeedCandidate = {
  id: string;
  kind: "fourrage" | "concentre";
  record: FourrageRecord | ConcentreRecord;
  pricePerKg: number;
  minKg: number;
  maxKg: number;
  enabled: boolean;
};

type LPResult = {
  status: "optimal" | "infeasible" | "unbounded" | "iter_limit";
  optimalValue: number | null;
  variables: number[];
  iterations: number;
  message?: string;
};

export function AlimOptimisation() {
  const [animalCategory, setAnimalCategory] = useState<string>("");
  const [candidates, setCandidates] = useState<FeedCandidate[]>([]);
  const [tolerance, setTolerance] = useState<number>(5); // % tolerance on constraints

  const availableAnimals = useMemo(() => alimData.animals.filter((a) => num(a.UFL) !== null), []);
  const selectedAnimal = useMemo(() => alimData.animals.find((a) => a.category === animalCategory) || null, [animalCategory]);

  const [result, setResult] = useState<LPResult | null>(null);
  const [resultFeeds, setResultFeeds] = useState<FeedCandidate[]>([]);

  const addCandidate = (kind: "fourrage" | "concentre", record: FourrageRecord | ConcentreRecord) => {
    const id = `${kind}-${record.name}-${Date.now()}`;
    const price = num(record.price) ?? 0;
    setCandidates([...candidates, { id, kind, record, pricePerKg: price, minKg: 0, maxKg: 5, enabled: true }]);
  };

  const updateCandidate = (id: string, field: keyof FeedCandidate, value: number | boolean) => {
    setCandidates(candidates.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeCandidate = (id: string) => {
    setCandidates(candidates.filter((c) => c.id !== id));
  };

  const runOptimization = () => {
    if (!selectedAnimal) return;
    const enabledFeeds = candidates.filter((c) => c.enabled);
    if (enabledFeeds.length === 0) return;

    const needs = {
      UEM: num(selectedAnimal.UEM),
      UFL: num(selectedAnimal.UFL),
      PDI: num(selectedAnimal.PDI),
      Pabs: num(selectedAnimal.Pabs),
      Caabs: num(selectedAnimal.Caabs),
    };

    // Build LP problem
    // Variables: x_i = kg MS of feed i per animal per day
    // Objective: minimize sum(price_i * x_i)
    // Note: prices are per kg brut, but values are per kg MS. We need to convert.
    // For simplicity, we treat x_i as kg MS and adjust price: price_per_kg_MS = price_per_kg_brut / MS%
    // But that requires MS%. To keep it simple, we'll use kg brut as the variable and adjust values accordingly.
    // Actually, let's use kg brut as variables (more intuitive for farmers).
    // Then: UFL contribution = UFL_per_kg_MS * MS% * x_i / 100
    // But that's complex. Let's use kg MS as the variable unit.
    // price_per_kg_MS = price_per_kg_brut * (100 / MS%)  — because 1 kg MS = 100/MS% kg brut

    const n = enabledFeeds.length;
    const objective: number[] = enabledFeeds.map((f) => {
      const msPct = num(f.record.ms_pct);
      if (msPct === null || msPct <= 0) return f.pricePerKg; // fallback
      return f.pricePerKg * (100 / msPct);
    });

    // Constraints: UFL, PDI, Pabs, Caabs must be >= needs (with tolerance)
    // Also: total MS <= UEM (ingestion capacity)
    // Also: each feed within [min, max] bounds
    const constraints: Array<{ coeffs: number[]; op: ">=" | "<=" | "="; rhs: number }> = [];

    // UFL constraint (>= needs * (1 - tol/100))
    const uflCoeffs = enabledFeeds.map((f) => num(f.record.ufl) ?? 0);
    if (needs.UFL !== null) {
      constraints.push({ coeffs: uflCoeffs, op: ">=", rhs: needs.UFL * (1 - tolerance / 100) });
    }

    // PDI constraint (PDIN and PDIE both must meet needs; we use min(PDIN, PDIE) >= needs)
    // For LP, we add both PDIN >= needs and PDIE >= needs
    if (needs.PDI !== null) {
      const pdinCoeffs = enabledFeeds.map((f) => num((f.record as FourrageRecord).pdin ?? (f.record as ConcentreRecord).pdin) ?? 0);
      constraints.push({ coeffs: pdinCoeffs, op: ">=", rhs: needs.PDI * (1 - tolerance / 100) });
      const pdieCoeffs = enabledFeeds.map((f) => num((f.record as FourrageRecord).pdie ?? (f.record as ConcentreRecord).pdie) ?? 0);
      constraints.push({ coeffs: pdieCoeffs, op: ">=", rhs: needs.PDI * (1 - tolerance / 100) });
    }

    // Pabs constraint
    if (needs.Pabs !== null) {
      const pabsCoeffs = enabledFeeds.map((f) => num(f.record.pabs) ?? 0);
      constraints.push({ coeffs: pabsCoeffs, op: ">=", rhs: needs.Pabs * (1 - tolerance / 100) });
    }

    // Caabs constraint
    if (needs.Caabs !== null) {
      const caabsCoeffs = enabledFeeds.map((f) => num(f.record.caabs) ?? 0);
      constraints.push({ coeffs: caabsCoeffs, op: ">=", rhs: needs.Caabs * (1 - tolerance / 100) });
    }

    // Ingestion capacity: total MS <= UEM
    if (needs.UEM !== null) {
      const msCoeffs = enabledFeeds.map(() => 1);
      constraints.push({ coeffs: msCoeffs, op: "<=", rhs: needs.UEM });
    }

    // Variable bounds
    const lowerBounds = enabledFeeds.map((f) => f.minKg);
    const upperBounds = enabledFeeds.map((f) => f.maxKg);

    const lpResult = solveLP({
      objective,
      constraints,
      varLowerBounds: lowerBounds,
      varUpperBounds: upperBounds,
      varLabels: enabledFeeds.map((f) => f.record.name),
    });

    setResult(lpResult);
    setResultFeeds(enabledFeeds);
  };

  // Compute the actual ration values from the LP result
  const rationSummary = useMemo(() => {
    if (!result || result.status !== "optimal" || !selectedAnimal) return null;
    const needs = {
      UEM: num(selectedAnimal.UEM),
      UFL: num(selectedAnimal.UFL),
      PDI: num(selectedAnimal.PDI),
      Pabs: num(selectedAnimal.Pabs),
      Caabs: num(selectedAnimal.Caabs),
    };
    let totalMS = 0, totalUFL = 0, totalPDIN = 0, totalPDIE = 0, totalPabs = 0, totalCaabs = 0, totalCost = 0;
    resultFeeds.forEach((f, i) => {
      const kgMS = result.variables[i] || 0;
      const msPct = num(f.record.ms_pct);
      const kgBrut = msPct && msPct > 0 ? kgMS * 100 / msPct : kgMS;
      totalMS += kgMS;
      totalUFL += (num(f.record.ufl) ?? 0) * kgMS;
      totalPDIN += (num((f.record as FourrageRecord).pdin ?? (f.record as ConcentreRecord).pdin) ?? 0) * kgMS;
      totalPDIE += (num((f.record as FourrageRecord).pdie ?? (f.record as ConcentreRecord).pdie) ?? 0) * kgMS;
      totalPabs += (num(f.record.pabs) ?? 0) * kgMS;
      totalCaabs += (num(f.record.caabs) ?? 0) * kgMS;
      totalCost += f.pricePerKg * kgBrut;
    });
    return { needs, totalMS, totalUFL, totalPDIN, totalPDIE, totalPabs, totalCaabs, totalCost };
  }, [result, resultFeeds, selectedAnimal]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-600" />
          Optimisation — Formulation au moindre coût
        </h2>
        <p className="text-sm text-stone-500">
          Le solveur LP (programmation linéaire) trouve la combinaison d&apos;aliments au coût minimal
          qui couvre tous les besoins nutritionnels (UFL, PDI, Pabs, Caabs) sans dépasser la capacité d&apos;ingestion.
        </p>
      </div>

      {/* Info banner */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700">
              <strong className="text-amber-900">Comment ça marche :</strong> Sélectionnez un animal,
              ajoutez les aliments disponibles avec leur prix, définissez les bornes (min/max), puis cliquez sur
              &quot;Optimiser&quot;. Le solveur utilise l&apos;algorithme du Simplex (méthode à deux phases)
              pour trouver la solution exacte au problème de minimisation sous contraintes.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Animal selection */}
        <Card className="border-stone-200 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">1</span>
              Animal cible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={animalCategory} onValueChange={setAnimalCategory}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Sélectionner un animal..." />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {availableAnimals.map((a, i) => (
                  <SelectItem key={i} value={a.category} className="text-xs">{a.category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAnimal && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                <NeedBox label="UEM" value={fmt(num(selectedAnimal.UEM))} />
                <NeedBox label="UFL" value={fmt(num(selectedAnimal.UFL))} />
                <NeedBox label="PDI" value={fmt(num(selectedAnimal.PDI), 0)} />
                <NeedBox label="Pabs" value={fmt(num(selectedAnimal.Pabs), 1)} />
                <NeedBox label="Caabs" value={fmt(num(selectedAnimal.Caabs), 1)} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tolerance */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tolérance sur les contraintes (%)</Label>
              <Input
                type="number"
                min="0"
                max="20"
                step="1"
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value) || 0)}
                className="h-9"
              />
              <p className="text-[10px] text-stone-500">
                Permet une marge sur les besoins (ex: 5% = besoins peuvent être couverts à 95%).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feed candidates */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">2</span>
                Aliments candidats
              </CardTitle>
              <CardDescription className="text-xs">Ajoutez les aliments disponibles et leur prix</CardDescription>
            </div>
            <div className="flex gap-2">
              <FeedPicker kind="fourrage" onPick={(r) => addCandidate("fourrage", r as FourrageRecord)} />
              <FeedPicker kind="concentre" onPick={(r) => addCandidate("concentre", r as ConcentreRecord)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {candidates.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-stone-200 p-6 text-center text-sm text-stone-500">
              <Plus className="h-6 w-6 mx-auto mb-2 text-stone-400" />
              Ajoutez au moins 2 aliments pour permettre l&apos;optimisation.
            </div>
          ) : (
            candidates.map((c) => (
              <div key={c.id} className={`rounded-lg border p-3 ${c.enabled ? "border-stone-200" : "border-stone-200 bg-stone-50 opacity-60"}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={c.enabled}
                      onChange={(e) => updateCandidate(c.id, "enabled", e.target.checked)}
                      className="rounded"
                    />
                    <Badge variant="outline" className={`text-[10px] ${c.kind === "fourrage" ? "bg-lime-100 text-lime-800" : "bg-orange-100 text-orange-800"}`}>
                      {c.kind === "fourrage" ? "F" : "C"}
                    </Badge>
                    <span className="text-sm font-medium text-stone-900 truncate">{c.record.name}</span>
                  </div>
                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="flex flex-col">
                      <Label className="text-[10px] text-stone-500">€/kg brut</Label>
                      <Input type="number" step="0.01" min="0" value={c.pricePerKg || ""} onChange={(e) => updateCandidate(c.id, "pricePerKg", Number(e.target.value) || 0)} className="h-8 w-20 text-xs" />
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-[10px] text-stone-500">Min kg MS</Label>
                      <Input type="number" step="0.1" min="0" value={c.minKg || ""} onChange={(e) => updateCandidate(c.id, "minKg", Number(e.target.value) || 0)} className="h-8 w-20 text-xs" />
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-[10px] text-stone-500">Max kg MS</Label>
                      <Input type="number" step="0.1" min="0" value={c.maxKg || ""} onChange={(e) => updateCandidate(c.id, "maxKg", Number(e.target.value) || 0)} className="h-8 w-20 text-xs" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeCandidate(c.id)} className="h-8 w-8 text-stone-400 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Run button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={runOptimization}
          disabled={!selectedAnimal || candidates.filter((c) => c.enabled).length < 2}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Zap className="h-4 w-4 mr-2" />
          Optimiser la ration
        </Button>
      </div>

      {/* Results */}
      {result && (
        <OptimizationResult result={result} feeds={resultFeeds} summary={rationSummary} animal={selectedAnimal} />
      )}
    </div>
  );
}

function NeedBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-2 text-center">
      <div className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-bold text-stone-900">{value}</div>
    </div>
  );
}

function FeedPicker({ kind, onPick }: { kind: "fourrage" | "concentre"; onPick: (r: FourrageRecord | ConcentreRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const data = kind === "fourrage" ? alimData.fourrages : alimData.concentres;
  const filtered = data.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={kind === "fourrage" ? "border-lime-300 text-lime-800 hover:bg-lime-50" : "border-orange-300 text-orange-800 hover:bg-orange-50"}
      >
        <Plus className="h-4 w-4 mr-1" />
        {kind === "fourrage" ? "Fourrage" : "Concentré"}
      </Button>
      {open && (
        <div className="absolute z-30 mt-1 w-80 max-w-[90vw] rounded-md border border-stone-200 bg-white shadow-lg right-0">
          <div className="p-2 border-b border-stone-100">
            <Input autoFocus placeholder={`Rechercher...`} value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.slice(0, 50).map((d, i) => (
              <button
                key={i}
                className="w-full text-left px-3 py-2 text-xs hover:bg-stone-50 border-b border-stone-100"
                onClick={() => { onPick(d); setOpen(false); setSearch(""); }}
              >
                <div className="font-medium text-stone-900">{d.name}</div>
                <div className="text-[10px] text-stone-500">
                  MS {fmt(num(d.ms_pct), 0)}% · UFL {fmt(num(d.ufl))}
                  {num(d.price) !== null && <span className="ml-1 text-emerald-700">· {fmt(num(d.price), 2)} €/kg</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OptimizationResult({ result, feeds, summary, animal }: { result: LPResult; feeds: FeedCandidate[]; summary: any; animal: AnimalRecord | null }) {
  if (result.status !== "optimal") {
    return (
      <Card className="border-rose-300 bg-rose-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-rose-900">
            <AlertTriangle className="h-5 w-5" />
            {result.status === "infeasible" ? "Problème infaisable" : result.status === "unbounded" ? "Problème non borné" : "Limite d'itérations atteinte"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-rose-800">
            {result.status === "infeasible" && "Aucune combinaison d'aliments ne permet de couvrir les besoins avec les bornes définies. Essayez d'élargir les bornes (augmenter les max), d'ajouter plus d'aliments, ou d'augmenter la tolérance."}
            {result.status === "unbounded" && "Le problème n'est pas borné — vérifiez que vous avez défini des bornes maximales."}
            {result.status === "iter_limit" && "Le solveur n'a pas convergé dans la limite d'itérations."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Optimal cost headline */}
      <Card className="border-emerald-300 bg-gradient-to-br from-emerald-50 to-amber-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="h-5 w-5" />
            Solution optimale trouvée
            <Badge variant="secondary" className="ml-2 text-[10px] bg-emerald-100 text-emerald-800">{result.iterations} itérations</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-white p-3 border border-emerald-200">
              <div className="text-[10px] text-stone-500 uppercase tracking-wide">Coût minimal / animal / jour</div>
              <div className="text-2xl font-bold text-emerald-900">{fmt(summary?.totalCost ?? 0, 3)} €</div>
            </div>
            <div className="rounded-lg bg-white p-3 border border-emerald-200">
              <div className="text-[10px] text-stone-500 uppercase tracking-wide">MS totale</div>
              <div className="text-2xl font-bold text-stone-900">{fmt(summary?.totalMS ?? 0, 2)} kg</div>
            </div>
            <div className="rounded-lg bg-white p-3 border border-emerald-200">
              <div className="text-[10px] text-stone-500 uppercase tracking-wide">UFL fournis</div>
              <div className="text-2xl font-bold text-stone-900">{fmt(summary?.totalUFL ?? 0, 2)}</div>
              <div className="text-[10px] text-stone-500">/ {fmt(num(animal?.UFL), 2)} besoin</div>
            </div>
            <div className="rounded-lg bg-white p-3 border border-emerald-200">
              <div className="text-[10px] text-stone-500 uppercase tracking-wide">PDI fournis</div>
              <div className="text-2xl font-bold text-stone-900">{fmt(Math.min(summary?.totalPDIN ?? 0, summary?.totalPDIE ?? 0), 0)} g</div>
              <div className="text-[10px] text-stone-500">/ {fmt(num(animal?.PDI), 0)} g besoin</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimal feed mix */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-emerald-700" />
            Ration optimale au moindre coût
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Aliment</th>
                  <th className="text-right px-3 py-2 font-medium">kg MS/j</th>
                  <th className="text-right px-3 py-2 font-medium">kg brut/j</th>
                  <th className="text-right px-3 py-2 font-medium">€/kg brut</th>
                  <th className="text-right px-3 py-2 font-medium">Coût (€/j)</th>
                  <th className="text-right px-3 py-2 font-medium">% du coût</th>
                </tr>
              </thead>
              <tbody>
                {feeds.map((f, i) => {
                  const kgMS = result.variables[i] || 0;
                  if (kgMS < 0.001) return null;
                  const msPct = num(f.record.ms_pct);
                  const kgBrut = msPct && msPct > 0 ? kgMS * 100 / msPct : kgMS;
                  const cost = f.pricePerKg * kgBrut;
                  const pctCost = summary && summary.totalCost > 0 ? (cost / summary.totalCost) * 100 : 0;
                  return (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`text-[9px] mr-1 ${f.kind === "fourrage" ? "bg-lime-50 text-lime-700" : "bg-orange-50 text-orange-700"}`}>
                          {f.kind === "fourrage" ? "F" : "C"}
                        </Badge>
                        <span className="font-medium text-stone-900">{f.record.name}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(kgMS, 3)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(kgBrut, 3)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-700">{fmt(f.pricePerKg, 2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-amber-800">{fmt(cost, 3)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <div className="flex items-center justify-end gap-1">
                          <div className="w-16 h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, pctCost)}%` }} />
                          </div>
                          <span className="text-xs">{fmt(pctCost, 0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-stone-50 font-semibold">
                  <td className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(summary?.totalMS ?? 0, 2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">—</td>
                  <td className="px-3 py-2 text-right tabular-nums">—</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-800">{fmt(summary?.totalCost ?? 0, 3)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Nutritional balance */}
      {summary && (
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Bilan nutritionnel de la solution optimale</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Élément</th>
                    <th className="text-right px-3 py-2 font-medium">Besoins</th>
                    <th className="text-right px-3 py-2 font-medium">Apports</th>
                    <th className="text-right px-3 py-2 font-medium">Couverture</th>
                    <th className="text-center px-3 py-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  <BalanceRow label="UEM (capacité ingestion)" need={summary.needs.UEM} supply={summary.totalMS} />
                  <BalanceRow label="UFL (énergie)" need={summary.needs.UFL} supply={summary.totalUFL} />
                  <BalanceRow label="PDI (min PDIN/PDIE)" need={summary.needs.PDI} supply={Math.min(summary.totalPDIN, summary.totalPDIE)} />
                  <BalanceRow label="Pabs (phosphore)" need={summary.needs.Pabs} supply={summary.totalPabs} />
                  <BalanceRow label="Caabs (calcium)" need={summary.needs.Caabs} supply={summary.totalCaabs} />
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Note */}
      <Card className="border-stone-200 bg-stone-50">
        <CardContent className="p-4 text-xs text-stone-600">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-stone-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-stone-700 mb-1">À propos de cette solution</p>
              <p>
                Cette solution est l&apos;optimum mathématique du problème de programmation linéaire.
                Elle minimise le coût total tout en respectant toutes les contraintes nutritionnelles.
                Le solveur utilise l&apos;algorithme du Simplex à deux phases (méthode exacte, pas une heuristique).
                Les quantités sont en kg de matière sèche (MS) par animal et par jour.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BalanceRow({ label, need, supply }: { label: string; need: number | null; supply: number }) {
  const coverage = need !== null && need > 0 ? (supply / need) * 100 : null;
  const status = coverage !== null
    ? coverage >= 95 && coverage <= 105
      ? { color: "text-emerald-700", bg: "bg-emerald-50", label: "OK" }
      : coverage < 95
        ? { color: "text-rose-700", bg: "bg-rose-50", label: "Déficit" }
        : { color: "text-amber-700", bg: "bg-amber-50", label: "Excès" }
    : { color: "text-stone-400", bg: "bg-stone-50", label: "N/A" };

  return (
    <tr className="border-b border-stone-100">
      <td className="px-3 py-2 text-stone-900">{label}</td>
      <td className="px-3 py-2 text-right tabular-nums">{need !== null ? fmt(need, 2) : "—"}</td>
      <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(supply, 2)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{coverage !== null ? `${fmt(coverage, 0)}%` : "—"}</td>
      <td className="px-3 py-2 text-center">
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.color}`}>
          {status.label}
        </span>
      </td>
    </tr>
  );
}
