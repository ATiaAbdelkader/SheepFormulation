"use client";

import { useState, useMemo } from "react";
import { allConcentres, num, fmt, type ConcentreRecord } from "@/lib/alim-data";
import {
  solve2Mix, solveMultiMix, solveLeastCostMix, generateBatchInstructions,
  listRecipes, saveRecipe, deleteRecipe,
  type MixFeed, type MixResult, type SavedRecipe,
} from "@/lib/mix-calculator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Blend, Plus, Trash2, Calculator, Target, Euro, Save, FileText,
  CheckCircle2, AlertTriangle, Info, Package, Beaker, ArrowRight, Copy,
} from "lucide-react";

type Tab = "two-mix" | "multi-mix" | "least-cost" | "recipes";

export function AlimMelange() {
  const [tab, setTab] = useState<Tab>("two-mix");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Blend className="h-5 w-5 text-cyan-700" />
          Calculateur de mélange avancé
        </h2>
        <p className="text-sm text-stone-500">
          Mélange 2 concentrés (système 2×2), multi-concentrés (3+), moindre coût (LP), et recettes sauvegardées.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-1">
        <TabButton active={tab === "two-mix"} onClick={() => setTab("two-mix")} icon={<Calculator className="h-3.5 w-3.5" />} label="Mélange 2" />
        <TabButton active={tab === "multi-mix"} onClick={() => setTab("multi-mix")} icon={<Blend className="h-3.5 w-3.5" />} label="Multi (3+)" />
        <TabButton active={tab === "least-cost"} onClick={() => setTab("least-cost")} icon={<Euro className="h-3.5 w-3.5" />} label="Moindre coût" />
        <TabButton active={tab === "recipes"} onClick={() => setTab("recipes")} icon={<Save className="h-3.5 w-3.5" />} label="Recettes" />
      </div>

      {tab === "two-mix" && <TwoMixTab />}
      {tab === "multi-mix" && <MultiMixTab />}
      {tab === "least-cost" && <LeastCostTab />}
      {tab === "recipes" && <RecipesTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${
        active ? "bg-cyan-100 text-cyan-900 border-b-2 border-cyan-600" : "text-stone-600 hover:bg-stone-100"
      }`}>
      {icon}{label}
    </button>
  );
}

// ---------- Feed to MixFeed converter ----------
function toMixFeed(c: ConcentreRecord): MixFeed {
  return {
    name: c.name, ufl: num(c.ufl), pdin: num(c.pdin), pdie: num(c.pdie),
    pabs: num(c.pabs), caabs: num(c.caabs), ms_pct: num(c.ms_pct), price: num(c.price),
  };
}

// ---------- Feed picker ----------
function FeedPicker({ onPick }: { onPick: (r: ConcentreRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = allConcentres.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(!open)}
        className="border-cyan-300 text-cyan-800 hover:bg-cyan-50">
        <Plus className="h-4 w-4 mr-1" /> Concentré
      </Button>
      {open && (
        <div className="absolute z-30 mt-1 w-72 rounded-md border border-stone-200 bg-white shadow-lg">
          <div className="p-1.5 border-b border-stone-100">
            <Input autoFocus placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-7 text-xs" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.slice(0, 30).map((d, i) => (
              <button key={i} className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-stone-50 border-b border-stone-100"
                onClick={() => { onPick(d); setOpen(false); setSearch(""); }}>
                <div className="font-medium text-stone-900">{d.name}</div>
                <div className="text-[9px] text-stone-500">UFL {fmt(num(d.ufl))} · PDIN {fmt(num(d.pdin), 0)}{num(d.price) !== null ? ` · ${fmt(num(d.price), 2)}€` : ""}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Result display (shared) ----------
function MixResultDisplay({ result, onSave }: { result: MixResult; onSave?: () => void }) {
  const [batchSize, setBatchSize] = useState<number>(500);
  const [showBatch, setShowBatch] = useState(false);
  const batch = useMemo(() => generateBatchInstructions(result, batchSize), [result, batchSize]);

  return (
    <div className="space-y-4">
      {/* Composition */}
      <Card className="border-2 border-cyan-300 bg-gradient-to-br from-cyan-50/40 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-cyan-700" /> Composition du mélange
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Visual bar */}
          <div className="flex h-8 rounded-lg overflow-hidden ring-1 ring-stone-200 mb-3">
            {result.feeds.map((f, i) => {
              const colors = ["#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899", "#84cc16", "#f97316", "#6366f1"];
              return (
                <div key={i} className="flex items-center justify-center text-[10px] text-white font-medium"
                  style={{ width: `${f.proportion * 100}%`, backgroundColor: colors[i % colors.length] }}>
                  {f.proportion > 0.08 ? `${f.name.slice(0, 12)} ${(f.proportion * 100).toFixed(0)}%` : ""}
                </div>
              );
            })}
          </div>

          {/* Feed details */}
          <div className="space-y-1">
            {result.feeds.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-stone-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ["#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899", "#84cc16", "#f97316", "#6366f1"][i % 7] }} />
                  {f.name}
                </span>
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="font-medium text-stone-900">{(f.proportion * 100).toFixed(1)}%</span>
                  <span className="text-stone-500">{f.kgPerTon.toFixed(0)} kg/t</span>
                  <span className="text-amber-700">{f.costPerTon.toFixed(0)} €/t</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Predicted values */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricBox label="UFL/kg" value={fmt(result.totalUFL, 3)} highlight />
        <MetricBox label="PDIN (g/kg)" value={fmt(result.totalPDIN, 0)} />
        <MetricBox label="PDIE (g/kg)" value={fmt(result.totalPDIE, 0)} />
        <MetricBox label="PDI (g/kg)" value={fmt(result.totalPDI, 0)} highlight />
        <MetricBox label="Pabs (g/kg)" value={fmt(result.totalPabs, 2)} />
        <MetricBox label="Caabs (g/kg)" value={fmt(result.totalCaabs, 2)} />
        <MetricBox label="Ca/P" value={fmt(result.caPRatio, 2)} />
        <MetricBox label="Prot/UFL" value={fmt(result.proteinPerUFL, 0)} unit="g" />
      </div>

      {/* Cost */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-amber-300 bg-amber-50/40">
          <CardContent className="p-3 text-center">
            <Euro className="h-4 w-4 text-amber-600 mx-auto mb-1" />
            <div className="text-[10px] text-stone-500 uppercase">Coût / kg</div>
            <div className="text-lg font-bold text-amber-900">{fmt(result.costPerKg, 3)} €</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-300 bg-emerald-50/40">
          <CardContent className="p-3 text-center">
            <Target className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
            <div className="text-[10px] text-stone-500 uppercase">Coût / UFL</div>
            <div className="text-lg font-bold text-emerald-900">{fmt(result.costPerUFL, 3)} €</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-3 text-center">
            <Package className="h-4 w-4 text-stone-500 mx-auto mb-1" />
            <div className="text-[10px] text-stone-500 uppercase">Coût / tonne</div>
            <div className="text-lg font-bold text-stone-900">{fmt(result.costPerKg * 1000, 0)} €</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {onSave && <Button size="sm" onClick={onSave}><Save className="h-4 w-4 mr-1" /> Sauvegarder recette</Button>}
        <Button size="sm" variant="outline" onClick={() => setShowBatch(!showBatch)}>
          <Package className="h-4 w-4 mr-1" /> {showBatch ? "Masquer" : "Instructions batch"}
        </Button>
      </div>

      {/* Batch instructions */}
      {showBatch && (
        <Card className="border-cyan-300 bg-cyan-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-cyan-700" /> Instructions de mélange en batch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Taille du batch (kg)</Label>
              <Input type="number" step="100" min="100" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value) || 100)} className="h-8 w-32 text-xs" />
              <span className="text-[10px] text-stone-500">≈ {Math.ceil(batchSize / 25)} sacs de 25kg</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Aliment</th>
                    <th className="text-right px-3 py-2 font-medium">Proportion</th>
                    <th className="text-right px-3 py-2 font-medium">Kg nécessaires</th>
                    <th className="text-right px-3 py-2 font-medium">Sacs 25kg</th>
                    <th className="text-right px-3 py-2 font-medium">Coût</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.feeds.map((f, i) => (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="px-3 py-1.5 font-medium text-stone-900">{f.name}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{(result.feeds[i].proportion * 100).toFixed(1)}%</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{f.kgNeeded.toFixed(1)} kg</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{f.bagsNeeded}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-amber-700">{f.cost.toFixed(0)} €</td>
                    </tr>
                  ))}
                  <tr className="bg-stone-50 font-semibold">
                    <td className="px-3 py-2" colSpan={2}>TOTAL ({batch.batchSize} kg)</td>
                    <td className="px-3 py-2 text-right tabular-nums">{batchSize} kg</td>
                    <td className="px-3 py-2 text-right tabular-nums">{batch.totalBags}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-800">{batch.totalCost.toFixed(0)} €</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="rounded bg-cyan-50 p-2 text-[10px] text-stone-600">
              <Info className="h-3 w-3 inline mr-1" />
              Coût du mélange: {batch.costPerKgMix.toFixed(3)} €/kg · {batch.totalBags} sacs de 25 kg à commander.
              Mélanger soigneusement les constituants pour assurer une homogénéité optimale.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricBox({ label, value, unit, highlight }: { label: string; value: string; unit?: string; highlight?: boolean }) {
  return (
    <Card className={`border-stone-200 ${highlight ? "border-cyan-300 bg-cyan-50/30" : ""}`}>
      <CardContent className="p-3 text-center">
        <div className="text-[10px] text-stone-500 uppercase">{label}</div>
        <div className={`text-base font-bold ${highlight ? "text-cyan-900" : "text-stone-900"}`}>{value}{unit && <span className="text-[10px] text-stone-400 ml-0.5">{unit}</span>}</div>
      </CardContent>
    </Card>
  );
}

// ==================== TWO-MIX TAB ====================
function TwoMixTab() {
  const [c1Id, setC1Id] = useState<string>("");
  const [c2Id, setC2Id] = useState<string>("");
  const [targetUFL, setTargetUFL] = useState<string>("");
  const [targetPDIN, setTargetPDIN] = useState<string>("");

  const c1 = allConcentres.find((c) => c.name === c1Id);
  const c2 = allConcentres.find((c) => c.name === c2Id);

  const result = useMemo(() => {
    if (!c1 || !c2) return null;
    const r = solve2Mix(toMixFeed(c1), toMixFeed(c2),
      targetUFL ? Number(targetUFL) : undefined,
      targetPDIN ? Number(targetPDIN) : undefined
    );
    return "error" in r ? null : r;
  }, [c1, c2, targetUFL, targetPDIN]);

  const error = useMemo(() => {
    if (!c1 || !c2) return null;
    const r = solve2Mix(toMixFeed(c1), toMixFeed(c2),
      targetUFL ? Number(targetUFL) : undefined,
      targetPDIN ? Number(targetPDIN) : undefined
    );
    return "error" in r ? r.error : null;
  }, [c1, c2, targetUFL, targetPDIN]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-stone-200">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Concentrés</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Concentré N°1</Label>
              <Select value={c1Id} onValueChange={setC1Id}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>{allConcentres.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              {c1 && <FeedMini c={c1} />}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Concentré N°2</Label>
              <Select value={c2Id} onValueChange={setC2Id}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>{allConcentres.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              {c2 && <FeedMini c={c2} />}
            </div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Objectifs du mélange</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">UFL cible (par kg)</Label>
              <Input type="number" step="0.01" value={targetUFL} onChange={(e) => setTargetUFL(e.target.value)} placeholder="ex: 1.0" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">PDIN cible (g/kg)</Label>
              <Input type="number" step="1" value={targetPDIN} onChange={(e) => setTargetPDIN(e.target.value)} placeholder="ex: 150" className="h-9" />
            </div>
            <p className="text-[10px] text-stone-500">Si UFL est défini, il est utilisé en priorité. Sinon PDIN.</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-rose-300 bg-rose-50">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span className="text-sm text-rose-800">{error}</span>
          </CardContent>
        </Card>
      )}

      {result && <MixResultDisplay result={result} onSave={() => {
        saveRecipe({
          name: `Mélange ${c1?.name.slice(0, 10)} + ${c2?.name.slice(0, 10)}`,
          feedNames: [c1!.name, c2!.name],
          proportions: result.feeds.map((f) => f.proportion),
          mode: "2-mix",
          targetUFL: targetUFL ? Number(targetUFL) : undefined,
          targetPDIN: targetPDIN ? Number(targetPDIN) : undefined,
          result: { totalUFL: result.totalUFL, totalPDIN: result.totalPDIN, totalPDIE: result.totalPDIE, totalPDI: result.totalPDI, costPerKg: result.costPerKg, costPerUFL: result.costPerUFL },
        });
        alert("Recette sauvegardée!");
      }} />}
    </div>
  );
}

function FeedMini({ c }: { c: ConcentreRecord }) {
  return (
    <div className="grid grid-cols-4 gap-1 text-[10px]">
      <div className="rounded bg-stone-100 p-1 text-center"><div className="text-stone-500">UFL</div><div className="font-medium">{fmt(num(c.ufl))}</div></div>
      <div className="rounded bg-stone-100 p-1 text-center"><div className="text-stone-500">PDIN</div><div className="font-medium">{fmt(num(c.pdin), 0)}</div></div>
      <div className="rounded bg-stone-100 p-1 text-center"><div className="text-stone-500">Pabs</div><div className="font-medium">{fmt(num(c.pabs), 1)}</div></div>
      <div className="rounded bg-stone-100 p-1 text-center"><div className="text-stone-500">€/kg</div><div className="font-medium">{num(c.price) !== null ? fmt(num(c.price), 2) : "—"}</div></div>
    </div>
  );
}

// ==================== MULTI-MIX TAB ====================
function MultiMixTab() {
  const [selectedFeeds, setSelectedFeeds] = useState<ConcentreRecord[]>([]);
  const [proportions, setProportions] = useState<number[]>([]);

  const addFeed = (c: ConcentreRecord) => {
    setSelectedFeeds([...selectedFeeds, c]);
    setProportions([...proportions, 1]);
  };
  const removeFeed = (i: number) => {
    setSelectedFeeds(selectedFeeds.filter((_, idx) => idx !== i));
    setProportions(proportions.filter((_, idx) => idx !== i));
  };
  const updateProp = (i: number, val: number) => {
    setProportions(proportions.map((p, idx) => idx === i ? val : p));
  };

  const total = proportions.reduce((s, p) => s + p, 0);

  const result = useMemo(() => {
    if (selectedFeeds.length < 2 || total <= 0) return null;
    const r = solveMultiMix(selectedFeeds.map(toMixFeed), proportions);
    return "error" in r ? null : r;
  }, [selectedFeeds, proportions, total]);

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div><CardTitle className="text-sm font-semibold">Multi-mélange (3+ concentrés)</CardTitle><CardDescription className="text-xs">Définissez les proportions de chaque concentré</CardDescription></div>
            <FeedPicker onPick={addFeed} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {selectedFeeds.length === 0 ? (
            <div className="text-center text-sm text-stone-500 py-4">Ajoutez au moins 2 concentrés.</div>
          ) : (
            selectedFeeds.map((c, i) => (
              <div key={i} className="flex items-center gap-2 rounded border border-stone-200 p-2">
                <Badge variant="outline" className="text-[9px] bg-orange-50 text-orange-700">#{i + 1}</Badge>
                <span className="text-xs font-medium text-stone-900 flex-1 truncate">{c.name}</span>
                <div className="flex items-center gap-1">
                  <Input type="number" step="0.1" min="0" value={proportions[i]} onChange={(e) => updateProp(i, Number(e.target.value) || 0)} className="h-7 w-16 text-xs text-right" />
                  <span className="text-[9px] text-stone-400">{total > 0 ? `${(proportions[i] / total * 100).toFixed(0)}%` : ""}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-rose-600" onClick={() => removeFeed(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
          {selectedFeeds.length > 0 && (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
              <span className="text-stone-500">Total: {total.toFixed(1)}</span>
              <span className="text-stone-500">{selectedFeeds.length} concentré(s)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {result && <MixResultDisplay result={result} onSave={() => {
        saveRecipe({
          name: `Multi-mélange (${selectedFeeds.length} composants)`,
          feedNames: selectedFeeds.map((f) => f.name),
          proportions: result.feeds.map((f) => f.proportion),
          mode: "multi-mix",
          result: { totalUFL: result.totalUFL, totalPDIN: result.totalPDIN, totalPDIE: result.totalPDIE, totalPDI: result.totalPDI, costPerKg: result.costPerKg, costPerUFL: result.costPerUFL },
        });
        alert("Recette sauvegardée!");
      }} />}
    </div>
  );
}

// ==================== LEAST-COST TAB ====================
function LeastCostTab() {
  const [selectedFeeds, setSelectedFeeds] = useState<ConcentreRecord[]>([]);
  const [targets, setTargets] = useState({
    minUFL: "1.0", minPDIN: "100", minPDIE: "", minPabs: "", minCaabs: "",
  });

  const addFeed = (c: ConcentreRecord) => setSelectedFeeds([...selectedFeeds, c]);
  const removeFeed = (i: number) => setSelectedFeeds(selectedFeeds.filter((_, idx) => idx !== i));

  const result = useMemo(() => {
    if (selectedFeeds.length < 2) return null;
    const r = solveLeastCostMix(selectedFeeds.map(toMixFeed), {
      minUFL: targets.minUFL ? Number(targets.minUFL) : undefined,
      minPDIN: targets.minPDIN ? Number(targets.minPDIN) : undefined,
      minPDIE: targets.minPDIE ? Number(targets.minPDIE) : undefined,
      minPabs: targets.minPabs ? Number(targets.minPabs) : undefined,
      minCaabs: targets.minCaabs ? Number(targets.minCaabs) : undefined,
    });
    return "error" in r ? null : r;
  }, [selectedFeeds, targets]);

  const error = useMemo(() => {
    if (selectedFeeds.length < 2) return null;
    const r = solveLeastCostMix(selectedFeeds.map(toMixFeed), {
      minUFL: targets.minUFL ? Number(targets.minUFL) : undefined,
      minPDIN: targets.minPDIN ? Number(targets.minPDIN) : undefined,
      minPDIE: targets.minPDIE ? Number(targets.minPDIE) : undefined,
      minPabs: targets.minPabs ? Number(targets.minPabs) : undefined,
      minCaabs: targets.minCaabs ? Number(targets.minCaabs) : undefined,
    });
    return "error" in r ? r.error : null;
  }, [selectedFeeds, targets]);

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Euro className="h-4 w-4 text-emerald-700" /> Mélange au moindre coût (LP)
              </CardTitle>
              <CardDescription className="text-xs">L&apos;algorithme trouve automatiquement les proportions optimales</CardDescription>
            </div>
            <FeedPicker onPick={addFeed} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedFeeds.length === 0 ? (
            <div className="text-center text-sm text-stone-500 py-4">Ajoutez au moins 2 concentrés.</div>
          ) : (
            <div className="space-y-1">
              {selectedFeeds.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-[9px] bg-orange-50 text-orange-700">#{i + 1}</Badge>
                  <span className="font-medium text-stone-900 flex-1 truncate">{c.name}</span>
                  <span className="text-stone-500">UFL {fmt(num(c.ufl))} · € {num(c.price) !== null ? fmt(num(c.price), 2) : "—"}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-rose-600" onClick={() => removeFeed(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {/* Targets */}
          <div className="pt-2 border-t border-stone-200">
            <Label className="text-xs font-semibold text-stone-700">Contraintes nutritionnelles (minimums par kg)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
              <div><Label className="text-[10px] text-stone-500">UFL min</Label><Input type="number" step="0.01" value={targets.minUFL} onChange={(e) => setTargets({ ...targets, minUFL: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px] text-stone-500">PDIN min (g)</Label><Input type="number" value={targets.minPDIN} onChange={(e) => setTargets({ ...targets, minPDIN: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px] text-stone-500">PDIE min (g)</Label><Input type="number" value={targets.minPDIE} onChange={(e) => setTargets({ ...targets, minPDIE: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px] text-stone-500">Pabs min (g)</Label><Input type="number" step="0.1" value={targets.minPabs} onChange={(e) => setTargets({ ...targets, minPabs: e.target.value })} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px] text-stone-500">Caabs min (g)</Label><Input type="number" step="0.1" value={targets.minCaabs} onChange={(e) => setTargets({ ...targets, minCaabs: e.target.value })} className="h-8 text-xs" /></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-rose-300 bg-rose-50">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span className="text-sm text-rose-800">{error}</span>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-emerald-300 bg-emerald-50/30">
          <CardContent className="p-2">
            <p className="text-xs text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              Solution optimale trouvée — coût minimum: <strong>{fmt(result.costPerKg, 3)} €/kg</strong>
            </p>
          </CardContent>
        </Card>
      )}

      {result && <MixResultDisplay result={result} onSave={() => {
        saveRecipe({
          name: `Moindre coût (${selectedFeeds.length} composants)`,
          feedNames: selectedFeeds.map((f) => f.name),
          proportions: result.feeds.map((f) => f.proportion),
          mode: "least-cost",
          result: { totalUFL: result.totalUFL, totalPDIN: result.totalPDIN, totalPDIE: result.totalPDIE, totalPDI: result.totalPDI, costPerKg: result.costPerKg, costPerUFL: result.costPerUFL },
        });
        alert("Recette sauvegardée!");
      }} />}
    </div>
  );
}

// ==================== RECIPES TAB ====================
function RecipesTab() {
  const [recipes, setRecipes] = useState<SavedRecipe[]>(() => listRecipes());

  const handleDelete = (id: string) => {
    deleteRecipe(id);
    setRecipes(listRecipes());
  };

  if (recipes.length === 0) {
    return (
      <Card className="border-stone-200 bg-stone-50">
        <CardContent className="p-8 text-center text-sm text-stone-500">
          <Save className="h-10 w-10 mx-auto mb-2 text-stone-400" />
          Aucune recette sauvegardée. Créez un mélange et cliquez sur &quot;Sauvegarder&quot;.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Badge variant="outline" className="bg-stone-50">{recipes.length} recette(s)</Badge>
      {recipes.map((r) => (
        <Card key={r.id} className="border-stone-200">
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-sm font-semibold text-stone-900">{r.name}</div>
                <div className="text-[10px] text-stone-500">
                  {r.mode} · {r.feedNames.length} composants · {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-rose-600" onClick={() => handleDelete(r.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {/* Composition */}
            <div className="flex h-6 rounded overflow-hidden ring-1 ring-stone-200 mb-2">
              {r.proportions.map((p, i) => {
                const colors = ["#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899", "#84cc16", "#f97316"];
                return (
                  <div key={i} className="flex items-center justify-center text-[8px] text-white font-medium"
                    style={{ width: `${p * 100}%`, backgroundColor: colors[i % colors.length] }}>
                    {p > 0.1 ? `${(p * 100).toFixed(0)}%` : ""}
                  </div>
                );
              })}
            </div>
            {/* Feed list */}
            <div className="space-y-0.5">
              {r.feedNames.map((name, i) => (
                <div key={i} className="flex items-center justify-between text-[10px]">
                  <span className="text-stone-700">{name}</span>
                  <span className="font-medium text-stone-900 tabular-nums">{(r.proportions[i] * 100).toFixed(1)}% · {(r.proportions[i] * 1000).toFixed(0)} kg/t</span>
                </div>
              ))}
            </div>
            {/* Metrics */}
            <div className="grid grid-cols-4 gap-1 mt-2 pt-2 border-t border-stone-100">
              <MetricMini label="UFL" value={r.result.totalUFL.toFixed(2)} />
              <MetricMini label="PDI" value={r.result.totalPDI.toFixed(0)} />
              <MetricMini label="€/kg" value={r.result.costPerKg.toFixed(3)} />
              <MetricMini label="€/UFL" value={r.result.costPerUFL.toFixed(3)} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-stone-50 p-1 text-center">
      <div className="text-[8px] text-stone-500 uppercase">{label}</div>
      <div className="text-[10px] font-bold text-stone-900">{value}</div>
    </div>
  );
}
