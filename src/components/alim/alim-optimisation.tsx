"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, allFourrages, allConcentres, type AnimalRecord, type FourrageRecord, type ConcentreRecord } from "@/lib/alim-data";
import {
  optimizeSingleObjective,
  optimizeMultiObjective,
  generateParetoFrontier,
  runSensitivityAnalysis,
  runConstraintRelaxation,
  OBJECTIVES,
  type FeedCandidate,
  type AnimalNeeds,
  type ParetoPoint,
  type SensitivityResult,
  type RelaxationResult,
} from "@/lib/multi-objective";
import { assessImpact } from "@/lib/environmental-impact";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Zap, Plus, Trash2, AlertTriangle, CheckCircle2, Info, Sparkles, TrendingDown,
  Target, Activity, GitCompare, Scale, Wind, Leaf, Euro, Gauge, Award,
} from "lucide-react";

type FeedItem = {
  id: string;
  kind: "fourrage" | "concentre";
  record: FourrageRecord | ConcentreRecord;
  pricePerKg: number;
  minKg: number;
  maxKg: number;
  enabled: boolean;
};

type Tab = "single" | "multi" | "pareto" | "sensitivity" | "relaxation";

export function AlimOptimisation() {
  const [tab, setTab] = useState<Tab>("single");
  const [animalCategory, setAnimalCategory] = useState<string>("");
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [tolerance, setTolerance] = useState<number>(5);

  const availableAnimals = useMemo(() => alimData.animals.filter((a) => num(a.UFL) !== null), []);
  const selectedAnimal = useMemo(() => alimData.animals.find((a) => a.category === animalCategory) || null, [animalCategory]);

  const addFeedItem = (kind: "fourrage" | "concentre", record: FourrageRecord | ConcentreRecord) => {
    const id = `${kind}-${record.name}-${Date.now()}`;
    const price = num(record.price) ?? 0;
    setFeedItems([...feedItems, { id, kind, record, pricePerKg: price, minKg: 0, maxKg: 5, enabled: true }]);
  };

  const updateFeedItem = (id: string, field: keyof FeedItem, value: number | boolean) => {
    setFeedItems(feedItems.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const removeFeedItem = (id: string) => {
    setFeedItems(feedItems.filter((it) => it.id !== id));
  };

  // Convert FeedItems to FeedCandidate format for optimization
  const feedCandidates: FeedCandidate[] = useMemo(() => {
    return feedItems.map((it) => {
      const r = it.record;
      const isFourrage = it.kind === "fourrage";
      return {
        name: r.name,
        msPct: num(r.ms_pct),
        ufl: num(r.ufl),
        pdin: num((r as FourrageRecord).pdin ?? (r as ConcentreRecord).pdin),
        pdie: num((r as FourrageRecord).pdie ?? (r as ConcentreRecord).pdie),
        pabs: num(r.pabs),
        caabs: num(r.caabs),
        price: it.pricePerKg,
        proteinPct: null, // will be estimated
        ndfPct: isFourrage ? num((r as FourrageRecord).uem) ? num((r as FourrageRecord).uem) * 35 : null : null,
        starchPct: null,
        fatPct: null,
        uem: isFourrage ? num((r as FourrageRecord).uem) : null,
        minKg: it.minKg,
        maxKg: it.maxKg,
        enabled: it.enabled,
      };
    });
  }, [feedItems]);

  const animalNeeds: AnimalNeeds | null = useMemo(() => {
    if (!selectedAnimal) return null;
    return {
      UEM: num(selectedAnimal.UEM),
      UFL: num(selectedAnimal.UFL),
      PDI: num(selectedAnimal.PDI),
      Pabs: num(selectedAnimal.Pabs),
      Caabs: num(selectedAnimal.Caabs),
      stage: selectedAnimal.stage || "",
    };
  }, [selectedAnimal]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-600" />
          Optimisation Multi-Objectif
        </h2>
        <p className="text-sm text-stone-500">
          Formulation au moindre coût avec analyse environnementale (méthane, CO2e, azote),
          front de Pareto, analyse de sensibilité et relâchement des contraintes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-1">
        <TabButton active={tab === "single"} onClick={() => setTab("single")} icon={<Target className="h-3.5 w-3.5" />} label="Simple objectif" />
        <TabButton active={tab === "multi"} onClick={() => setTab("multi")} icon={<Scale className="h-3.5 w-3.5" />} label="Multi-objectif" />
        <TabButton active={tab === "pareto"} onClick={() => setTab("pareto")} icon={<Activity className="h-3.5 w-3.5" />} label="Front de Pareto" />
        <TabButton active={tab === "sensitivity"} onClick={() => setTab("sensitivity")} icon={<Gauge className="h-3.5 w-3.5" />} label="Sensibilité" />
        <TabButton active={tab === "relaxation"} onClick={() => setTab("relaxation")} icon={<TrendingDown className="h-3.5 w-3.5" />} label="Relâchement" />
      </div>

      {/* Animal + Feeds selection (shared) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tolérance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tolérance contraintes (%)</Label>
              <Input type="number" min="0" max="20" step="1" value={tolerance} onChange={(e) => setTolerance(Number(e.target.value) || 0)} className="h-9" />
              <p className="text-[10px] text-stone-500">Marge sur les besoins (5% = couverture à 95% min).</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feeds selection */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">2</span>
                Aliments candidats ({feedItems.filter((f) => f.enabled).length})
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <FeedPicker kind="fourrage" onPick={(r) => addFeedItem("fourrage", r as FourrageRecord)} />
              <FeedPicker kind="concentre" onPick={(r) => addFeedItem("concentre", r as ConcentreRecord)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {feedItems.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-stone-200 p-6 text-center text-sm text-stone-500">
              <Plus className="h-6 w-6 mx-auto mb-2 text-stone-400" />
              Ajoutez au moins 2 aliments pour permettre l&apos;optimisation.
            </div>
          ) : (
            feedItems.map((item) => (
              <div key={item.id} className={`rounded-lg border p-3 ${item.enabled ? "border-stone-200" : "border-stone-200 bg-stone-50 opacity-60"}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input type="checkbox" checked={item.enabled} onChange={(e) => updateFeedItem(item.id, "enabled", e.target.checked)} className="rounded" />
                    <Badge variant="outline" className={`text-[10px] ${item.kind === "fourrage" ? "bg-lime-100 text-lime-800" : "bg-orange-100 text-orange-800"}`}>
                      {item.kind === "fourrage" ? "F" : "C"}
                    </Badge>
                    <span className="text-sm font-medium text-stone-900 truncate">{item.record.name}</span>
                  </div>
                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="flex flex-col">
                      <Label className="text-[10px] text-stone-500">€/kg</Label>
                      <Input type="number" step="0.01" min="0" value={item.pricePerKg || ""} onChange={(e) => updateFeedItem(item.id, "pricePerKg", Number(e.target.value) || 0)} className="h-8 w-20 text-xs" />
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-[10px] text-stone-500">Min kg MS</Label>
                      <Input type="number" step="0.1" min="0" value={item.minKg || ""} onChange={(e) => updateFeedItem(item.id, "minKg", Number(e.target.value) || 0)} className="h-8 w-20 text-xs" />
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-[10px] text-stone-500">Max kg MS</Label>
                      <Input type="number" step="0.1" min="0" value={item.maxKg || ""} onChange={(e) => updateFeedItem(item.id, "maxKg", Number(e.target.value) || 0)} className="h-8 w-20 text-xs" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFeedItem(item.id)} className="h-8 w-8 text-stone-400 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Tab content */}
      {!animalNeeds || feedCandidates.filter((f) => f.enabled).length < 2 ? (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-6 text-center text-sm text-stone-500">
            <Info className="h-8 w-8 mx-auto mb-2 text-stone-400" />
            Sélectionnez un animal et au moins 2 aliments actifs pour lancer l&apos;optimisation.
          </CardContent>
        </Card>
      ) : (
        <>
          {tab === "single" && <SingleObjectiveTab feeds={feedCandidates} needs={animalNeeds} tolerance={tolerance} />}
          {tab === "multi" && <MultiObjectiveTab feeds={feedCandidates} needs={animalNeeds} tolerance={tolerance} />}
          {tab === "pareto" && <ParetoFrontierTab feeds={feedCandidates} needs={animalNeeds} tolerance={tolerance} />}
          {tab === "sensitivity" && <SensitivityTab feeds={feedCandidates} needs={animalNeeds} tolerance={tolerance} />}
          {tab === "relaxation" && <RelaxationTab feeds={feedCandidates} needs={animalNeeds} tolerance={tolerance} />}
        </>
      )}
    </div>
  );
}

// ---------- Tab Button ----------
function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${
        active ? "bg-amber-100 text-amber-900 border-b-2 border-amber-600" : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------- Single Objective Tab ----------
function SingleObjectiveTab({ feeds, needs, tolerance }: { feeds: FeedCandidate[]; needs: AnimalNeeds; tolerance: number }) {
  const [objective, setObjective] = useState<"cost" | "methane" | "nitrogen" | "co2" | "health">("cost");
  const [result, setResult] = useState<ParetoPoint | null>(null);
  const [loading, setLoading] = useState(false);

  const run = () => {
    setLoading(true);
    setTimeout(() => {
      const r = optimizeSingleObjective(feeds, needs, tolerance, objective);
      setResult(r);
      setLoading(false);
    }, 100);
  };

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Objectif d&apos;optimisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {OBJECTIVES.map((obj) => (
              <button
                key={obj.id}
                onClick={() => setObjective(obj.id)}
                className={`p-2.5 rounded-lg border text-left transition-colors ${
                  objective === obj.id ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300" : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <div className="text-xs font-semibold text-stone-900">{obj.label}</div>
                <div className="text-[9px] text-stone-500 mt-0.5">{obj.unit}</div>
              </button>
            ))}
          </div>
          <Button onClick={run} disabled={loading} className="w-full mt-3 bg-amber-600 hover:bg-amber-700">
            {loading ? "Optimisation..." : "Optimiser"}
          </Button>
        </CardContent>
      </Card>

      {result && <ResultDisplay point={result} feeds={feeds} needs={needs} />}
    </div>
  );
}

// ---------- Multi-Objective Tab ----------
function MultiObjectiveTab({ feeds, needs, tolerance }: { feeds: FeedCandidate[]; needs: AnimalNeeds; tolerance: number }) {
  const [weights, setWeights] = useState<Record<string, number>>({
    cost: 40, methane: 20, nitrogen: 10, co2: 20, health: 10,
  });
  const [result, setResult] = useState<ParetoPoint | null>(null);
  const [loading, setLoading] = useState(false);

  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);

  const run = () => {
    setLoading(true);
    setTimeout(() => {
      // Normalize weights
      const normalized: Record<string, number> = {};
      for (const [k, v] of Object.entries(weights)) {
        normalized[k] = totalWeight > 0 ? v / totalWeight : 0;
      }
      const r = optimizeMultiObjective(feeds, needs, tolerance, { weights: normalized });
      setResult(r);
      setLoading(false);
    }, 100);
  };

  const updateWeight = (key: string, value: number) => {
    setWeights({ ...weights, [key]: value });
  };

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Scale className="h-4 w-4 text-amber-700" />
            Pondération des objectifs
          </CardTitle>
          <CardDescription className="text-xs">Ajustez l&apos;importance de chaque objectif (sera normalisé à 100%)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {OBJECTIVES.map((obj) => (
            <div key={obj.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <Label className="text-xs font-medium">{obj.label}</Label>
                <p className="text-[10px] text-stone-500">{obj.description}</p>
              </div>
              <div className="flex items-center gap-2 w-40">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights[obj.id] || 0}
                  onChange={(e) => updateWeight(obj.id, Number(e.target.value))}
                  className="flex-1 h-1.5 accent-amber-600"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={weights[obj.id] || 0}
                  onChange={(e) => updateWeight(obj.id, Number(e.target.value) || 0)}
                  className="h-8 w-14 text-xs text-right"
                />
              </div>
              <span className="text-[10px] text-stone-500 w-10 text-right">
                {totalWeight > 0 ? `${((weights[obj.id] || 0) / totalWeight * 100).toFixed(0)}%` : "—"}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-stone-200">
            <span className="text-xs text-stone-500">Total: {totalWeight}/100</span>
            <Button onClick={run} disabled={loading || totalWeight === 0} className="bg-amber-600 hover:bg-amber-700">
              {loading ? "Optimisation..." : "Optimiser multi-objectif"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preset profiles */}
      <Card className="border-stone-200 bg-stone-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold">Profils préprogrammés</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <PresetButton label="💸 Économique" onClick={() => setWeights({ cost: 80, methane: 5, nitrogen: 5, co2: 5, health: 5 })} />
          <PresetButton label="🌱 Écologique" onClick={() => setWeights({ cost: 10, methane: 25, nitrogen: 20, co2: 35, health: 10 })} />
          <PresetButton label="🏥 Santé" onClick={() => setWeights({ cost: 15, methane: 10, nitrogen: 10, co2: 10, health: 55 })} />
          <PresetButton label="⚖️ Équilibré" onClick={() => setWeights({ cost: 30, methane: 15, nitrogen: 10, co2: 20, health: 25 })} />
          <PresetButton label="🏭 Production" onClick={() => setWeights({ cost: 50, methane: 5, nitrogen: 5, co2: 5, health: 35 })} />
        </CardContent>
      </Card>

      {result && <ResultDisplay point={result} feeds={feeds} needs={needs} />}
    </div>
  );
}

// ---------- Pareto Frontier Tab ----------
function ParetoFrontierTab({ feeds, needs, tolerance }: { feeds: FeedCandidate[]; needs: AnimalNeeds; tolerance: number }) {
  const [objX, setObjX] = useState<"cost" | "methane" | "nitrogen" | "co2" | "health">("cost");
  const [objY, setObjY] = useState<"cost" | "methane" | "nitrogen" | "co2" | "health">("co2");
  const [points, setPoints] = useState<ParetoPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<ParetoPoint | null>(null);

  const run = () => {
    setLoading(true);
    setTimeout(() => {
      const pts = generateParetoFrontier(feeds, needs, tolerance, [objX, objY], 15);
      setPoints(pts);
      setSelectedPoint(null);
      setLoading(false);
    }, 100);
  };

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-700" />
            Front de Pareto — Analyse des compromis
          </CardTitle>
          <CardDescription className="text-xs">Visualisez le trade-off entre deux objectifs. Chaque point est une solution optimale.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Objectif X (abscisse)</Label>
              <Select value={objX} onValueChange={(v) => setObjX(v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Objectif Y (ordonnée)</Label>
              <Select value={objY} onValueChange={(v) => setObjY(v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={run} disabled={loading || objX === objY} className="w-full bg-amber-600 hover:bg-amber-700">
            {loading ? "Génération du front de Pareto..." : "Générer le front de Pareto (15 points)"}
          </Button>
          {objX === objY && <p className="text-xs text-rose-600 text-center">Sélectionnez deux objectifs différents</p>}
        </CardContent>
      </Card>

      {points.length > 0 && (
        <>
          <ParetoChart points={points} objX={objX} objY={objY} onPointClick={setSelectedPoint} selectedPoint={selectedPoint} />
          {selectedPoint && (
            <ResultDisplay point={selectedPoint} feeds={feeds} needs={needs} compact />
          )}
        </>
      )}
    </div>
  );
}

// ---------- Sensitivity Tab ----------
function SensitivityTab({ feeds, needs, tolerance }: { feeds: FeedCandidate[]; needs: AnimalNeeds; tolerance: number }) {
  const [results, setResults] = useState<SensitivityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<string>("");

  const run = () => {
    setLoading(true);
    setTimeout(() => {
      const r = runSensitivityAnalysis(feeds, needs, tolerance);
      setResults(r);
      setSelectedFeed(r[0]?.feedName || "");
      setLoading(false);
    }, 100);
  };

  const selectedResult = results.find((r) => r.feedName === selectedFeed);

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Gauge className="h-4 w-4 text-amber-700" />
            Analyse de sensibilité des prix
          </CardTitle>
          <CardDescription className="text-xs">
            Comment la ration optimale change si le prix d&apos;un aliment varie de -20% à +30%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={run} disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700">
            {loading ? "Analyse en cours..." : "Lancer l'analyse de sensibilité"}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <>
          {/* Feed selector */}
          <div className="flex flex-wrap gap-2">
            {results.map((r) => (
              <button
                key={r.feedName}
                onClick={() => setSelectedFeed(r.feedName)}
                className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                  selectedFeed === r.feedName ? "bg-amber-100 border-amber-300 text-amber-900" : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                }`}
              >
                {r.feedName.length > 25 ? r.feedName.slice(0, 23) + "…" : r.feedName}
              </button>
            ))}
          </div>

          {selectedResult && <SensitivityChart result={selectedResult} />}

          {/* Summary table */}
          <Card className="border-stone-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">Résumé — Impact prix sur le coût optimal</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Aliment</th>
                      <th className="text-right px-3 py-2 font-medium">Prix base</th>
                      <th className="text-right px-3 py-2 font-medium">Coût (-20%)</th>
                      <th className="text-right px-3 py-2 font-medium">Coût (base)</th>
                      <th className="text-right px-3 py-2 font-medium">Coût (+30%)</th>
                      <th className="text-right px-3 py-2 font-medium">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => {
                      const baseCost = r.scenarios.find((s) => s.priceChange === 0)?.optimalCost;
                      const lowCost = r.scenarios.find((s) => s.priceChange === -20)?.optimalCost;
                      const highCost = r.scenarios.find((s) => s.priceChange === 30)?.optimalCost;
                      const delta = (highCost || 0) - (lowCost || 0);
                      return (
                        <tr key={r.feedName} className="border-b border-stone-100 hover:bg-stone-50/50">
                          <td className="px-3 py-1.5 text-stone-900 truncate max-w-xs">{r.feedName}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmt(r.basePrice, 2)}€</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">{lowCost !== null ? fmt(lowCost, 3) : "—"}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-medium">{baseCost !== null ? fmt(baseCost, 3) : "—"}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-rose-700">{highCost !== null ? fmt(highCost, 3) : "—"}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-amber-700">+{fmt(delta, 3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ---------- Relaxation Tab ----------
function RelaxationTab({ feeds, needs, tolerance }: { feeds: FeedCandidate[]; needs: AnimalNeeds; tolerance: number }) {
  const [results, setResults] = useState<RelaxationResult[]>([]);
  const [loading, setLoading] = useState(false);

  const run = () => {
    setLoading(true);
    setTimeout(() => {
      const r = runConstraintRelaxation(feeds, needs, [0, 2, 5, 8, 10, 15, 20]);
      setResults(r);
      setLoading(false);
    }, 100);
  };

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-amber-700" />
            Relâchement des contraintes
          </CardTitle>
          <CardDescription className="text-xs">
            Combien économisez-vous si vous acceptez une couverture des besoins à 95%, 90%, 85% au lieu de 100% ?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={run} disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700">
            {loading ? "Analyse en cours..." : "Analyser le relâchement des contraintes"}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <>
          <RelaxationChart results={results} />

          {/* Table */}
          <Card className="border-stone-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">Détail par niveau de tolérance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Tolérance</th>
                      <th className="text-right px-3 py-2 font-medium">Coût optimal</th>
                      <th className="text-right px-3 py-2 font-medium">Économie</th>
                      <th className="text-right px-3 py-2 font-medium">% économie</th>
                      <th className="text-right px-3 py-2 font-medium">UFL%</th>
                      <th className="text-right px-3 py-2 font-medium">PDI%</th>
                      <th className="text-right px-3 py-2 font-medium">Pabs%</th>
                      <th className="text-right px-3 py-2 font-medium">Caabs%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className={`border-b border-stone-100 ${i === 0 ? "bg-stone-50" : ""}`}>
                        <td className="px-3 py-1.5 font-medium">{r.tolerance}%</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{r.optimalCost !== null ? `${fmt(r.optimalCost, 3)}€` : "—"}</td>
                        <td className={`px-3 py-1.5 text-right tabular-nums ${r.costSavings > 0 ? "text-emerald-700 font-medium" : ""}`}>
                          {r.costSavings > 0 ? `-${fmt(r.costSavings, 3)}€` : "—"}
                        </td>
                        <td className={`px-3 py-1.5 text-right tabular-nums ${r.savingsPct > 0 ? "text-emerald-700 font-medium" : ""}`}>
                          {r.savingsPct > 0 ? `${fmt(r.savingsPct, 1)}%` : "—"}
                        </td>
                        <td className={`px-3 py-1.5 text-right tabular-nums ${r.coverageUFL < 95 ? "text-rose-600" : "text-emerald-700"}`}>{fmt(r.coverageUFL, 0)}%</td>
                        <td className={`px-3 py-1.5 text-right tabular-nums ${r.coveragePDI < 95 ? "text-rose-600" : "text-emerald-700"}`}>{fmt(r.coveragePDI, 0)}%</td>
                        <td className={`px-3 py-1.5 text-right tabular-nums ${r.coveragePabs < 95 ? "text-amber-600" : "text-emerald-700"}`}>{fmt(r.coveragePabs, 0)}%</td>
                        <td className={`px-3 py-1.5 text-right tabular-nums ${r.coverageCaabs < 95 ? "text-amber-600" : "text-emerald-700"}`}>{fmt(r.coverageCaabs, 0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="border-amber-200 bg-amber-50/40">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-stone-700">
                  <strong className="text-amber-900">Interprétation:</strong> Le relâchement des contraintes permet
                  d&apos;identifier le coût marginal de chaque % de couverture nutritionnelle. Par exemple, passer de
                  100% à 95% de couverture PDI peut économiser 0.08€/jour si l&apos;aliment protéique est cher.
                  Attention: un relâchement excessif peut affecter les performances zootechniques.
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ---------- Pareto Chart ----------
function ParetoChart({ points, objX, objY, onPointClick, selectedPoint }: {
  points: ParetoPoint[];
  objX: string;
  objY: string;
  onPointClick: (p: ParetoPoint) => void;
  selectedPoint: ParetoPoint | null;
}) {
  const width = 700;
  const height = 350;
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xValues = points.map((p) => p.values[objX]);
  const yValues = points.map((p) => p.values[objY]);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const xScale = (v: number) => padding.left + ((v - xMin) / xRange) * chartW;
  const yScale = (v: number) => padding.top + chartH - ((v - yMin) / yRange) * chartH;

  const xLabel = OBJECTIVES.find((o) => o.id === objX)?.label || objX;
  const yLabel = OBJECTIVES.find((o) => o.id === objY)?.label || objY;
  const xUnit = OBJECTIVES.find((o) => o.id === objX)?.unit || "";
  const yUnit = OBJECTIVES.find((o) => o.id === objY)?.unit || "";

  // Build path for Pareto front (connect points)
  const sortedPoints = [...points].sort((a, b) => a.values[objX] - b.values[objX]);
  const paretoPath = sortedPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.values[objX])} ${yScale(p.values[objY])}`).join(" ");

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold">Front de Pareto: {yLabel} vs {xLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={padding.left} y1={padding.top + t * chartH} x2={width - padding.right} y2={padding.top + t * chartH} stroke="#e7e5e4" strokeWidth="1" strokeDasharray="2,2" />
              <line x1={padding.left + t * chartW} y1={padding.top} x2={padding.left + t * chartW} y2={height - padding.bottom} stroke="#e7e5e4" strokeWidth="1" strokeDasharray="2,2" />
            </g>
          ))}

          {/* Axes labels */}
          <text x={padding.left + chartW / 2} y={height - 15} textAnchor="middle" className="text-[11px] fill-stone-700 font-medium">
            {xLabel} ({xUnit})
          </text>
          <text x={15} y={padding.top + chartH / 2} textAnchor="middle" className="text-[11px] fill-stone-700 font-medium" transform={`rotate(-90 15 ${padding.top + chartH / 2})`}>
            {yLabel} ({yUnit})
          </text>

          {/* Axis tick labels */}
          <text x={padding.left} y={height - padding.bottom + 15} textAnchor="middle" className="text-[8px] fill-stone-400">{fmt(xMin, 2)}</text>
          <text x={width - padding.right} y={height - padding.bottom + 15} textAnchor="middle" className="text-[8px] fill-stone-400">{fmt(xMax, 2)}</text>
          <text x={padding.left - 8} y={height - padding.bottom} textAnchor="end" className="text-[8px] fill-stone-400">{fmt(yMin, 2)}</text>
          <text x={padding.left - 8} y={padding.top + 5} textAnchor="end" className="text-[8px] fill-stone-400">{fmt(yMax, 2)}</text>

          {/* Pareto frontier line */}
          <path d={paretoPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,2" opacity="0.6" />

          {/* Points */}
          {points.map((p, i) => {
            const isSelected = selectedPoint === p;
            return (
              <g key={i} onClick={() => onPointClick(p)} className="cursor-pointer">
                <circle
                  cx={xScale(p.values[objX])}
                  cy={yScale(p.values[objY])}
                  r={isSelected ? 7 : 5}
                  fill={isSelected ? "#f59e0b" : "#10b981"}
                  fillOpacity={isSelected ? 1 : 0.7}
                  stroke="white"
                  strokeWidth="2"
                  className="hover:opacity-100 transition-all"
                />
                {isSelected && (
                  <text x={xScale(p.values[objX])} y={yScale(p.values[objY]) - 12} textAnchor="middle" className="text-[9px] fill-stone-900 font-medium">
                    {fmt(p.values[objX], 2)}, {fmt(p.values[objY], 2)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Solution Pareto
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Sélectionnée
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-amber-500 border-dashed" /> Front de Pareto
          </span>
          <span className="text-stone-500 ml-auto">Cliquez un point pour voir la ration détaillée</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Sensitivity Chart ----------
function SensitivityChart({ result }: { result: SensitivityResult }) {
  const width = 600;
  const height = 250;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const prices = result.scenarios.map((s) => s.priceChange);
  const costs = result.scenarios.map((s) => s.optimalCost || 0);
  const quantities = result.scenarios.map((s) => s.feedQuantity);

  const xMin = Math.min(...prices);
  const xMax = Math.max(...prices);
  const yMinCost = Math.min(...costs);
  const yMaxCost = Math.max(...costs);
  const yMaxQty = Math.max(...quantities, 0.1);

  const xScale = (v: number) => padding.left + ((v - xMin) / (xMax - xMin || 1)) * chartW;
  const yScaleCost = (v: number) => padding.top + chartH - ((v - yMinCost) / (yMaxCost - yMinCost || 1)) * chartH;
  const yScaleQty = (v: number) => padding.top + chartH - (v / yMaxQty) * chartH;

  const costPath = result.scenarios.map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(s.priceChange)} ${yScaleCost(s.optimalCost || 0)}`).join(" ");
  const qtyPath = result.scenarios.map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(s.priceChange)} ${yScaleQty(s.feedQuantity)}`).join(" ");

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold">{result.feedName} — Sensibilité au prix</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={padding.left} y1={padding.top + t * chartH} x2={width - padding.right} y2={padding.top + t * chartH} stroke="#e7e5e4" strokeWidth="1" strokeDasharray="2,2" />
          ))}

          {/* Zero line */}
          <line x1={xScale(0)} y1={padding.top} x2={xScale(0)} y2={height - padding.bottom} stroke="#a8a29e" strokeWidth="1" />

          {/* Cost line */}
          <path d={costPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />

          {/* Quantity bars */}
          {result.scenarios.map((s, i) => (
            <rect
              key={i}
              x={xScale(s.priceChange) - 8}
              y={yScaleQty(s.feedQuantity)}
              width={16}
              height={height - padding.bottom - yScaleQty(s.feedQuantity)}
              fill="#10b981"
              fillOpacity={0.3}
              rx={2}
            />
          ))}

          {/* Data points */}
          {result.scenarios.map((s, i) => (
            <g key={i}>
              <circle cx={xScale(s.priceChange)} cy={yScaleCost(s.optimalCost || 0)} r={4} fill="#f59e0b" stroke="white" strokeWidth="1.5" />
              {!s.stillUsesFeed && (
                <text x={xScale(s.priceChange)} y={yScaleCost(s.optimalCost || 0) - 8} textAnchor="middle" className="text-[8px] fill-rose-600 font-medium">✗</text>
              )}
            </g>
          ))}

          {/* Labels */}
          <text x={padding.left + chartW / 2} y={height - 10} textAnchor="middle" className="text-[10px] fill-stone-700 font-medium">Variation de prix (%)</text>
          <text x={15} y={padding.top + chartH / 2} textAnchor="middle" className="text-[10px] fill-stone-700 font-medium" transform={`rotate(-90 15 ${padding.top + chartH / 2})`}>Coût ration (€) / Quantité (kg)</text>

          {/* X ticks */}
          {prices.map((p) => (
            <text key={p} x={xScale(p)} y={height - padding.bottom + 15} textAnchor="middle" className="text-[8px] fill-stone-500">{p > 0 ? `+${p}` : p}%</text>
          ))}
        </svg>

        <div className="flex gap-3 mt-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500" /> Coût optimal (€/jour)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-500/30" /> Quantité utilisée (kg MS)</span>
          <span className="text-rose-600">✗ N&apos;est plus utilisé</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Relaxation Chart ----------
function RelaxationChart({ results }: { results: RelaxationResult[] }) {
  const width = 600;
  const height = 280;
  const padding = { top: 25, right: 60, bottom: 45, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const tolerances = results.map((r) => r.tolerance);
  const costs = results.map((r) => r.optimalCost || 0);
  const savings = results.map((r) => r.savingsPct);

  const xMin = 0;
  const xMax = Math.max(...tolerances);
  const yMinCost = Math.min(...costs);
  const yMaxCost = Math.max(...costs);
  const yMaxSav = Math.max(...savings, 1);

  const xScale = (v: number) => padding.left + ((v - xMin) / (xMax - xMin || 1)) * chartW;
  const yScaleCost = (v: number) => padding.top + chartH - ((v - yMinCost) / (yMaxCost - yMinCost || 1)) * chartH;
  const yScaleSav = (v: number) => padding.top + chartH - (v / yMaxSav) * chartH;

  const costPath = results.map((r, i) => `${i === 0 ? "M" : "L"} ${xScale(r.tolerance)} ${yScaleCost(r.optimalCost || 0)}`).join(" ");
  const savPath = results.map((r, i) => `${i === 0 ? "M" : "L"} ${xScale(r.tolerance)} ${yScaleSav(r.savingsPct)}`).join(" ");

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold">Coût optimal vs. tolérance sur les contraintes</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={padding.left} y1={padding.top + t * chartH} x2={width - padding.right} y2={padding.top + t * chartH} stroke="#e7e5e4" strokeWidth="1" strokeDasharray="2,2" />
          ))}

          {/* Cost line */}
          <path d={costPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
          {results.map((r, i) => (
            <circle key={i} cx={xScale(r.tolerance)} cy={yScaleCost(r.optimalCost || 0)} r={4} fill="#f59e0b" stroke="white" strokeWidth="1.5" />
          ))}

          {/* Savings line */}
          <path d={savPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="5,3" />
          {results.map((r, i) => (
            <circle key={`s-${i}`} cx={xScale(r.tolerance)} cy={yScaleSav(r.savingsPct)} r={4} fill="#10b981" stroke="white" strokeWidth="1.5" />
          ))}

          {/* Labels */}
          <text x={padding.left + chartW / 2} y={height - 12} textAnchor="middle" className="text-[10px] fill-stone-700 font-medium">Tolérance (%)</text>
          <text x={15} y={padding.top + chartH / 2} textAnchor="middle" className="text-[10px] fill-stone-700 font-medium" transform={`rotate(-90 15 ${padding.top + chartH / 2})`}>Coût optimal (€/jour)</text>
          <text x={width - 15} y={padding.top + chartH / 2} textAnchor="middle" className="text-[10px] fill-emerald-700 font-medium" transform={`rotate(90 ${width - 15} ${padding.top + chartH / 2})`}>Économie (%)</text>

          {/* X ticks */}
          {tolerances.map((t) => (
            <text key={t} x={xScale(t)} y={height - padding.bottom + 15} textAnchor="middle" className="text-[8px] fill-stone-500">{t}%</text>
          ))}
        </svg>

        <div className="flex gap-3 mt-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500" /> Coût optimal (échelle gauche)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 border-dashed" /> Économie % (échelle droite)</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Result Display ----------
function ResultDisplay({ point, feeds, needs, compact }: { point: ParetoPoint; feeds: FeedCandidate[]; needs: AnimalNeeds; compact?: boolean }) {
  const impact = assessImpact(point.environmental.co2PerUFL);
  const enabledFeeds = feeds.filter((f) => f.enabled);

  return (
    <div className="space-y-4">
      {/* Headline metrics */}
      <Card className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-amber-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="h-5 w-5" />
            Solution optimale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultBox label="Coût / animal / j" value={`${fmt(point.metrics.totalCost, 3)} €`} icon={<Euro className="h-3 w-3" />} highlight />
            <ResultBox label="MS totale" value={`${fmt(point.metrics.totalMS, 2)} kg`} icon={<Gauge className="h-3 w-3" />} />
            <ResultBox label="UFL fournis" value={fmt(point.metrics.totalUFL, 2)} icon={<Zap className="h-3 w-3" />} />
            <ResultBox label="PDI fournis" value={`${fmt(point.metrics.totalPDI, 0)} g`} icon={<Leaf className="h-3 w-3" />} />
          </div>

          {/* Environmental metrics */}
          <div className="mt-3 pt-3 border-t border-emerald-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ResultBox label="Méthane" value={`${fmt(point.environmental.methaneLiters, 1)} L`} icon={<Wind className="h-3 w-3" />} />
              <ResultBox label="CO2 total" value={`${fmt(point.environmental.co2Total, 3)} kg`} icon={<Wind className="h-3 w-3" />} />
              <ResultBox label="N excrété" value={`${fmt(point.environmental.nitrogenExcreted, 1)} g`} icon={<Leaf className="h-3 w-3" />} />
              <ResultBox label="Risque santé" value={`${fmt(point.healthScore, 0)}/100`} icon={<AlertTriangle className="h-3 w-3" />} />
            </div>
            <div className="mt-2 text-center">
              <Badge className={`text-[10px] ${impact.color === "text-emerald-700" ? "bg-emerald-100 text-emerald-800" : impact.color === "text-amber-700" ? "bg-amber-100 text-amber-800" : "bg-orange-100 text-orange-800"}`}>
                <Wind className="h-2.5 w-2.5 mr-1" />
                {impact.label} · {fmt(point.environmental.co2PerUFL, 3)} kg CO2e/UFL
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed mix */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Composition de la ration optimale</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Aliment</th>
                  <th className="text-right px-3 py-2 font-medium">kg MS/j</th>
                  <th className="text-right px-3 py-2 font-medium">kg brut/j</th>
                  <th className="text-right px-3 py-2 font-medium">€/kg</th>
                  <th className="text-right px-3 py-2 font-medium">Coût €/j</th>
                  <th className="text-right px-3 py-2 font-medium">% coût</th>
                </tr>
              </thead>
              <tbody>
                {enabledFeeds.map((f, i) => {
                  const kgMS = point.variables[i] || 0;
                  if (kgMS < 0.001) return null;
                  const msPct = f.msPct;
                  const kgBrut = msPct && msPct > 0 ? kgMS * 100 / msPct : kgMS;
                  const cost = (f.price || 0) * kgBrut;
                  const pctCost = point.metrics.totalCost > 0 ? (cost / point.metrics.totalCost) * 100 : 0;
                  return (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="px-3 py-1.5 text-stone-900">{f.name}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{fmt(kgMS, 3)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(kgBrut, 3)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-amber-700">{fmt(f.price || 0, 2)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium text-amber-800">{fmt(cost, 3)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(pctCost, 0)}%</td>
                    </tr>
                  );
                })}
                <tr className="bg-stone-50 font-semibold">
                  <td className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(point.metrics.totalMS, 2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">—</td>
                  <td className="px-3 py-2 text-right tabular-nums">—</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-800">{fmt(point.metrics.totalCost, 3)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!compact && (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-4 text-xs text-stone-600">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-stone-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-stone-700 mb-1">À propos de cette solution</p>
                <p>
                  Cette solution est l&apos;optimum mathématique calculé par l&apos;algorithme du Simplex (méthode à deux phases).
                  Les valeurs environnementales sont estimées à partir des équations INRA 2018 et IPCC 2019.
                  Méthane basé sur Ym (% énergie brute convertie en CH4), azote excrété = N ingéré × (1 - taux de rétention).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------- Helper components ----------
function NeedBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-2 text-center">
      <div className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-bold text-stone-900">{value}</div>
    </div>
  );
}

function ResultBox({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2.5 ${highlight ? "bg-amber-100 ring-1 ring-amber-300" : "bg-white border border-stone-200"}`}>
      <div className="text-[10px] text-stone-500 uppercase tracking-wide flex items-center gap-1">{icon}{label}</div>
      <div className={`text-base font-bold ${highlight ? "text-amber-900" : "text-stone-900"}`}>{value}</div>
    </div>
  );
}

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-xs px-3 py-1.5 rounded-md bg-white border border-stone-200 hover:bg-amber-50 hover:border-amber-300 transition-colors">
      {label}
    </button>
  );
}

function FeedPicker({ kind, onPick }: { kind: "fourrage" | "concentre"; onPick: (r: FourrageRecord | ConcentreRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const data = kind === "fourrage" ? allFourrages : allConcentres;
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
            <Input autoFocus placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-sm" />
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
