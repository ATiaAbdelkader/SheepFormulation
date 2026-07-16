"use client";

import { useState, useMemo, useEffect } from "react";
import { alimData, num, fmt, type FourrageRecord, type ConcentreRecord } from "@/lib/alim-data";
import { listRations, type SavedRation } from "@/lib/ration-storage";
import {
  buildComparisonRows, simulateScenario,
  type ComputedRation, type ScenarioResult, type ComparisonRow,
} from "@/lib/scenario-simulator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  GitCompare, Users, Activity, ShieldCheck, ArrowLeft, ArrowRight, Equal,
  TrendingUp, TrendingDown, Euro, AlertTriangle, CheckCircle2, Info,
  Calculator, PiggyBank,
} from "lucide-react";

type Tab = "two-way" | "three-way" | "simulator" | "risk";

export function AlimComparer() {
  const [tab, setTab] = useState<Tab>("two-way");
  const savedRations = listRations();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-indigo-700" />
          Simulateur de scénarios — Comparaison de rations
        </h2>
        <p className="text-sm text-stone-500">
          Comparez 2 ou 3 rations, simulez un changement de ration pour votre troupeau, et évaluez les risques sanitaires.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-1">
        <TabButton active={tab === "two-way"} onClick={() => setTab("two-way")} icon={<GitCompare className="h-3.5 w-3.5" />} label="Comparaison 2" />
        <TabButton active={tab === "three-way"} onClick={() => setTab("three-way")} icon={<GitCompare className="h-3.5 w-3.5" />} label="Comparaison 3" />
        <TabButton active={tab === "simulator"} onClick={() => setTab("simulator")} icon={<Calculator className="h-3.5 w-3.5" />} label="Simulateur" />
        <TabButton active={tab === "risk"} onClick={() => setTab("risk")} icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Risques" />
      </div>

      {savedRations.length < 2 ? (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-8 text-center text-sm text-stone-500">
            <Info className="h-8 w-8 mx-auto mb-2 text-stone-400" />
            Vous avez besoin d&apos;au moins 2 rations enregistrées pour les comparer.
            <br />
            <span className="text-xs">Allez dans le module <strong>Ration</strong>, créez et enregistrez des rations.</span>
            <div className="mt-3 text-xs">Rations actuelles: <Badge variant="outline">{savedRations.length}</Badge></div>
          </CardContent>
        </Card>
      ) : (
        <>
          {tab === "two-way" && <TwoWayTab rations={savedRations} />}
          {tab === "three-way" && <ThreeWayTab rations={savedRations} />}
          {tab === "simulator" && <SimulatorTab rations={savedRations} />}
          {tab === "risk" && <RiskTab rations={savedRations} />}
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${
        active ? "bg-indigo-100 text-indigo-900 border-b-2 border-indigo-600" : "text-stone-600 hover:bg-stone-100"
      }`}>
      {icon}{label}
    </button>
  );
}

// ---------- Compute ration from saved data ----------
function computeRation(ration: SavedRation): ComputedRation | null {
  const animal = alimData.animals.find((a) => a.category === ration.animalCategory);
  if (!animal) return null;
  const needs = {
    UEM: num(animal.UEM), UFL: num(animal.UFL), PDI: num(animal.PDI),
    Pabs: num(animal.Pabs), Caabs: num(animal.Caabs),
  };

  let totalMS = 0, totalUFL = 0, totalPDIN = 0, totalPDIE = 0, totalPabs = 0, totalCaabs = 0, totalCost = 0;

  ration.feedItems.forEach((s) => {
    const source = s.kind === "fourrage" ? alimData.fourrages : alimData.concentres;
    const record = source.find((f) => f.name === s.recordName);
    if (!record) return;
    const msPct = num(record.ms_pct);
    const msQty = msPct && msPct > 0 ? s.quantityKgBrut * (msPct / 100) : 0;
    const ufl = num(record.ufl);
    const pdin = num((record as FourrageRecord).pdin ?? (record as ConcentreRecord).pdin);
    const pdie = num((record as FourrageRecord).pdie ?? (record as ConcentreRecord).pdie);
    const pabs = num(record.pabs);
    const caabs = num(record.caabs);
    if (ufl !== null) totalUFL += ufl * msQty;
    if (pdin !== null) totalPDIN += pdin * msQty;
    if (pdie !== null) totalPDIE += pdie * msQty;
    if (pabs !== null) totalPabs += pabs * msQty;
    if (caabs !== null) totalCaabs += caabs * msQty;
    totalMS += msQty;
    totalCost += s.quantityKgBrut * s.pricePerKg;
  });

  const cmv = alimData.cmvs.find((c) => c.name === ration.cmvId);
  if (cmv && ration.cmvQuantity > 0) {
    const cmvKg = ration.cmvQuantity / 1000;
    const pabsPerKg = num(cmv.pabs_per_kg);
    const caabsPerKg = num(cmv.caabs_per_kg);
    if (pabsPerKg !== null) totalPabs += pabsPerKg * cmvKg;
    if (caabsPerKg !== null) totalCaabs += caabsPerKg * cmvKg;
    totalCost += cmvKg * ration.cmvPricePerKg;
  }

  const totalPDI = Math.min(totalPDIN, totalPDIE);
  const coverage = {
    UFL: needs.UFL !== null && needs.UFL > 0 ? (totalUFL / needs.UFL) * 100 : null,
    PDI: needs.PDI !== null && needs.PDI > 0 ? (totalPDI / needs.PDI) * 100 : null,
    Pabs: needs.Pabs !== null && needs.Pabs > 0 ? (totalPabs / needs.Pabs) * 100 : null,
    Caabs: needs.Caabs !== null && needs.Caabs > 0 ? (totalCaabs / needs.Caabs) * 100 : null,
  };
  const costPerUFL = totalUFL > 0 ? totalCost / totalUFL : null;
  const rmic = totalUFL > 0 ? (totalPDIN - totalPDIE) / totalUFL : null;
  const caPRatio = totalPabs > 0 ? totalCaabs / totalPabs : null;

  return {
    name: ration.name, animalCategory: ration.animalCategory,
    totalMS, totalUFL, totalPDI, totalPDIN, totalPDIE, totalPabs, totalCaabs, totalCost,
    costPerUFL, derm: null, rmic, caPRatio, needs, coverage, feedCount: ration.feedItems.length,
  };
}

// ==================== TWO-WAY TAB ====================
function TwoWayTab({ rations }: { rations: SavedRation[] }) {
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");

  const rationA = useMemo(() => {
    if (!aId) return null;
    const r = rations.find((s) => s.id === aId);
    return r ? computeRation(r) : null;
  }, [aId, rations]);

  const rationB = useMemo(() => {
    if (!bId) return null;
    const r = rations.find((s) => s.id === bId);
    return r ? computeRation(r) : null;
  }, [bId, rations]);

  const rows = useMemo(() => {
    if (!rationA || !rationB) return [];
    return buildComparisonRows(rationA, rationB);
  }, [rationA, rationB]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <RationSelector label="Ration A" color="indigo" rations={rations} value={aId} onChange={setAId} />
        <RationSelector label="Ration B" color="purple" rations={rations} value={bId} onChange={setBId} />
      </div>

      {rationA && rationB && (
        <>
          {/* Radar overlay */}
          <ComparisonRadar a={rationA} b={rationB} />

          {/* Table */}
          <Card className="border-stone-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Tableau comparatif</CardTitle>
              <CardDescription className="text-xs">Différence = B − A</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-medium">Indicateur</th>
                      <th className="text-right px-3 py-2.5 font-medium">A: {rationA.name.slice(0, 15)}</th>
                      <th className="text-right px-3 py-2.5 font-medium">B: {rationB.name.slice(0, 15)}</th>
                      <th className="text-right px-3 py-2.5 font-medium">Diff.</th>
                      <th className="text-center px-3 py-2.5 font-medium">Avantage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => <ComparisonRowDisplay key={i} row={row} />)}
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

// ==================== THREE-WAY TAB ====================
function ThreeWayTab({ rations }: { rations: SavedRation[] }) {
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [cId, setCId] = useState("");

  const rationA = useMemo(() => { const r = rations.find((s) => s.id === aId); return r ? computeRation(r) : null; }, [aId, rations]);
  const rationB = useMemo(() => { const r = rations.find((s) => s.id === bId); return r ? computeRation(r) : null; }, [bId, rations]);
  const rationC = useMemo(() => { const r = rations.find((s) => s.id === cId); return r ? computeRation(r) : null; }, [cId, rations]);

  const rows = useMemo(() => {
    if (!rationA || !rationB) return [];
    return buildComparisonRows(rationA, rationB, rationC ?? undefined);
  }, [rationA, rationB, rationC]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <RationSelector label="Ration A" color="indigo" rations={rations} value={aId} onChange={setAId} />
        <RationSelector label="Ration B" color="purple" rations={rations} value={bId} onChange={setBId} />
        <RationSelector label="Ration C" color="emerald" rations={rations} value={cId} onChange={setCId} />
      </div>

      {rationA && rationB && (
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Comparaison 3 rations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-medium">Indicateur</th>
                    <th className="text-right px-3 py-2.5 font-medium">A</th>
                    <th className="text-right px-3 py-2.5 font-medium">B</th>
                    <th className="text-right px-3 py-2.5 font-medium">C</th>
                    <th className="text-center px-3 py-2.5 font-medium">Meilleur</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-stone-100 hover:bg-stone-50/50">
                      <td className="px-3 py-2 text-stone-700 text-xs">{row.label}</td>
                      <td className={`px-3 py-2 text-right tabular-nums text-xs ${row.better === "b" || row.better === "c" ? "text-rose-600" : ""}`}>{row.a}</td>
                      <td className={`px-3 py-2 text-right tabular-nums text-xs ${row.better === "a" || row.better === "c" ? "text-rose-600" : ""}`}>{row.b}</td>
                      <td className={`px-3 py-2 text-right tabular-nums text-xs ${row.c && (row.better === "a" || row.better === "b") ? "text-rose-600" : ""}`}>{row.c || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        {row.better === "a" && <span className="text-[10px] text-emerald-700 font-medium">A</span>}
                        {row.better === "b" && <span className="text-[10px] text-emerald-700 font-medium">B</span>}
                        {row.better === "c" && <span className="text-[10px] text-emerald-700 font-medium">C</span>}
                        {row.better === "equal" && <Equal className="h-3 w-3 text-stone-400 mx-auto" />}
                        {row.better === null && <span className="text-[10px] text-stone-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== SIMULATOR TAB ====================
function SimulatorTab({ rations }: { rations: SavedRation[] }) {
  const [currentId, setCurrentId] = useState("");
  const [newId, setNewId] = useState("");
  const [flockSize, setFlockSize] = useState(100);
  const [switchPct, setSwitchPct] = useState(100);
  const [feedingDays, setFeedingDays] = useState(90);

  const currentRation = useMemo(() => { const r = rations.find((s) => s.id === currentId); return r ? computeRation(r) : null; }, [currentId, rations]);
  const newRation = useMemo(() => { const r = rations.find((s) => s.id === newId); return r ? computeRation(r) : null; }, [newId, rations]);

  const scenario = useMemo(() => {
    if (!currentRation || !newRation) return null;
    return simulateScenario(currentRation, newRation, flockSize, switchPct, feedingDays);
  }, [currentRation, newRation, flockSize, switchPct, feedingDays]);

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4 text-indigo-700" /> Paramètres de simulation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RationSelector label="Ration actuelle" color="indigo" rations={rations} value={currentId} onChange={setCurrentId} />
            <RationSelector label="Nouvelle ration" color="emerald" rations={rations} value={newId} onChange={setNewId} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> Taille troupeau</Label>
              <Input type="number" min="1" value={flockSize} onChange={(e) => setFlockSize(Number(e.target.value) || 1)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">% du troupeau à convertir</Label>
              <Input type="number" min="0" max="100" value={switchPct} onChange={(e) => setSwitchPct(Number(e.target.value) || 0)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Durée (jours)</Label>
              <Input type="number" min="1" value={feedingDays} onChange={(e) => setFeedingDays(Number(e.target.value) || 1)} className="h-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      {scenario && <ScenarioDisplay scenario={scenario} />}
    </div>
  );
}

function ScenarioDisplay({ scenario }: { scenario: ScenarioResult }) {
  const s = scenario;
  const savingsColor = s.dailySavings > 0 ? "text-emerald-700" : s.dailySavings < 0 ? "text-rose-700" : "text-stone-600";
  const recoColor = s.recommendationLevel === "positive" ? "border-emerald-300 bg-emerald-50" : s.recommendationLevel === "negative" ? "border-rose-300 bg-rose-50" : "border-amber-300 bg-amber-50";

  return (
    <div className="space-y-4">
      {/* Headline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-stone-200">
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 text-stone-500 mx-auto mb-1" />
            <div className="text-[10px] text-stone-500 uppercase">Animaux convertis</div>
            <div className="text-lg font-bold text-stone-900">{s.animalsSwitched}</div>
            <div className="text-[9px] text-stone-400">/ {s.flockSize}</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-3 text-center">
            <Euro className="h-4 w-4 text-stone-500 mx-auto mb-1" />
            <div className="text-[10px] text-stone-500 uppercase">Économie / jour</div>
            <div className={`text-lg font-bold ${savingsColor}`}>{s.dailySavings > 0 ? "+" : ""}{fmt(s.dailySavings, 2)} €</div>
          </CardContent>
        </Card>
        <Card className={`border-2 ${s.periodSavings > 0 ? "border-emerald-300 bg-emerald-50/40" : "border-rose-300 bg-rose-50/40"}`}>
          <CardContent className="p-3 text-center">
            <PiggyBank className="h-4 w-4 mx-auto mb-1 text-stone-500" />
            <div className="text-[10px] text-stone-500 uppercase">Économie / {s.feedingDays}j</div>
            <div className={`text-lg font-bold ${savingsColor}`}>{s.periodSavings > 0 ? "+" : ""}{fmt(s.periodSavings, 0)} €</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 text-stone-500 mx-auto mb-1" />
            <div className="text-[10px] text-stone-500 uppercase">Économie annuelle</div>
            <div className={`text-lg font-bold ${savingsColor}`}>{s.annualSavings > 0 ? "+" : ""}{fmt(s.annualSavings, 0)} €</div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendation */}
      <Card className={`border-2 ${recoColor}`}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            {s.recommendationLevel === "positive" ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            : s.recommendationLevel === "negative" ? <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
            : <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />}
            <p className="text-xs text-stone-800">{s.recommendation}</p>
          </div>
        </CardContent>
      </Card>

      {/* Comparison radar */}
      <ComparisonRadar a={s.currentRation} b={s.newRation} labelA="Actuelle" labelB="Nouvelle" />

      {/* Detailed comparison */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold">Impact détaillé</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Indicateur</th>
                  <th className="text-right px-3 py-2 font-medium">Ration actuelle</th>
                  <th className="text-right px-3 py-2 font-medium">Nouvelle ration</th>
                  <th className="text-right px-3 py-2 font-medium">Différence</th>
                </tr>
              </thead>
              <tbody>
                <SimRow label="Coût / animal / jour (€)" a={fmt(s.currentRation.totalCost, 3)} b={fmt(s.newRation.totalCost, 3)} diff={`${s.costDiffPerAnimalPerDay > 0 ? "+" : ""}${fmt(s.costDiffPerAnimalPerDay, 3)}`} good={s.costDiffPerAnimalPerDay < 0} />
                <SimRow label="UFL fournis" a={fmt(s.currentRation.totalUFL, 2)} b={fmt(s.newRation.totalUFL, 2)} diff={`${s.uflDiff > 0 ? "+" : ""}${fmt(s.uflDiff, 2)}`} good={s.uflDiff >= 0} />
                <SimRow label="PDI fournis (g)" a={fmt(s.currentRation.totalPDI, 0)} b={fmt(s.newRation.totalPDI, 0)} diff={`${s.pdiDiff > 0 ? "+" : ""}${fmt(s.pdiDiff, 0)}`} good={s.pdiDiff >= 0} />
                <SimRow label="Couverture UFL (%)" a={fmt(s.currentRation.coverage.UFL ?? 0, 0) + "%"} b={fmt(s.newRation.coverage.UFL ?? 0, 0) + "%"} diff={`${s.coverageDiff.UFL > 0 ? "+" : ""}${fmt(s.coverageDiff.UFL, 0)}%`} good={s.coverageDiff.UFL >= 0} />
                <SimRow label="Couverture PDI (%)" a={fmt(s.currentRation.coverage.PDI ?? 0, 0) + "%"} b={fmt(s.newRation.coverage.PDI ?? 0, 0) + "%"} diff={`${s.coverageDiff.PDI > 0 ? "+" : ""}${fmt(s.coverageDiff.PDI, 0)}%`} good={s.coverageDiff.PDI >= 0} />
                <SimRow label="Risque sanitaire" a={fmt(s.currentRiskScore, 0) + "/100"} b={fmt(s.newRiskScore, 0) + "/100"} diff={`${s.riskImprovement > 0 ? "+" : ""}${fmt(s.riskImprovement, 0)}`} good={s.riskImprovement > 0} />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SimRow({ label, a, b, diff, good }: { label: string; a: string; b: string; diff: string; good: boolean }) {
  return (
    <tr className="border-b border-stone-100">
      <td className="px-3 py-1.5 text-stone-700">{label}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{a}</td>
      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{b}</td>
      <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${good ? "text-emerald-700" : "text-rose-700"}`}>{diff}</td>
    </tr>
  );
}

// ==================== RISK TAB ====================
function RiskTab({ rations }: { rations: SavedRation[] }) {
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");

  const rationA = useMemo(() => { const r = rations.find((s) => s.id === aId); return r ? computeRation(r) : null; }, [aId, rations]);
  const rationB = useMemo(() => { const r = rations.find((s) => s.id === bId); return r ? computeRation(r) : null; }, [bId, rations]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <RationSelector label="Ration A" color="indigo" rations={rations} value={aId} onChange={setAId} />
        <RationSelector label="Ration B" color="purple" rations={rations} value={bId} onChange={setBId} />
      </div>

      {rationA && rationB && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Risk card A */}
          <RiskCard ration={rationA} label="A" color="indigo" />
          {/* Risk card B */}
          <RiskCard ration={rationB} label="B" color="purple" />
        </div>
      )}

      {rationA && rationB && (
        <Card className="border-stone-200">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold">Comparaison des risques</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Risque</th>
                    <th className="text-right px-3 py-2 font-medium">Ration A</th>
                    <th className="text-right px-3 py-2 font-medium">Ration B</th>
                    <th className="text-center px-3 py-2 font-medium">Meilleur</th>
                  </tr>
                </thead>
                <tbody>
                  <RiskRow label="Score de risque global" a={fmt(estimateRiskScore(rationA), 0)} b={fmt(estimateRiskScore(rationB), 0)} lowerBetter />
                  <RiskRow label="Couverture UFL (%)" a={fmt(rationA.coverage.UFL ?? 0, 0) + "%"} b={fmt(rationB.coverage.UFL ?? 0, 0) + "%"} higherBetter />
                  <RiskRow label="Couverture PDI (%)" a={fmt(rationA.coverage.PDI ?? 0, 0) + "%"} b={fmt(rationB.coverage.PDI ?? 0, 0) + "%"} higherBetter />
                  <RiskRow label="Rapport Ca/P" a={fmt(rationA.caPRatio ?? 0, 2)} b={fmt(rationB.caPRatio ?? 0, 2)} />
                  <RiskRow label="RMIC" a={fmt(rationA.rmic ?? 0, 1)} b={fmt(rationB.rmic ?? 0, 1)} />
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function estimateRiskScore(ration: ComputedRation): number {
  let score = 0;
  if (ration.coverage.UFL !== null && ration.coverage.UFL < 90) score += 30;
  else if (ration.coverage.UFL !== null && ration.coverage.UFL < 95) score += 15;
  if (ration.coverage.PDI !== null && ration.coverage.PDI < 90) score += 25;
  else if (ration.coverage.PDI !== null && ration.coverage.PDI < 95) score += 12;
  if (ration.caPRatio !== null) {
    if (ration.caPRatio < 0.8 || ration.caPRatio > 2.5) score += 20;
    else if (ration.caPRatio < 1.0 || ration.caPRatio > 2.0) score += 10;
  }
  if (ration.rmic !== null && ration.rmic < -12) score += 15;
  else if (ration.rmic !== null && ration.rmic < -6) score += 8;
  return Math.min(100, score);
}

function RiskCard({ ration, label, color }: { ration: ComputedRation; label: string; color: string }) {
  const score = estimateRiskScore(ration);
  const level = score >= 50 ? "Élevé" : score >= 25 ? "Modéré" : "Faible";
  const colorClass = score >= 50 ? "text-rose-700 bg-rose-100" : score >= 25 ? "text-amber-700 bg-amber-100" : "text-emerald-700 bg-emerald-100";

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{ration.name}</CardTitle>
          <Badge className={`text-[10px] ${colorClass}`}>Risque {level}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-600">Score de risque</span>
          <span className={`text-2xl font-bold ${score >= 50 ? "text-rose-700" : score >= 25 ? "text-amber-700" : "text-emerald-700"}`}>{score}/100</span>
        </div>
        <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${score >= 50 ? "bg-rose-500" : score >= 25 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${score}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="rounded bg-stone-50 p-1.5 text-center">
            <div className="text-[9px] text-stone-500 uppercase">UFL couvert</div>
            <div className={`text-xs font-bold ${(ration.coverage.UFL ?? 0) < 90 ? "text-rose-700" : "text-emerald-700"}`}>{fmt(ration.coverage.UFL ?? 0, 0)}%</div>
          </div>
          <div className="rounded bg-stone-50 p-1.5 text-center">
            <div className="text-[9px] text-stone-500 uppercase">PDI couvert</div>
            <div className={`text-xs font-bold ${(ration.coverage.PDI ?? 0) < 90 ? "text-rose-700" : "text-emerald-700"}`}>{fmt(ration.coverage.PDI ?? 0, 0)}%</div>
          </div>
          <div className="rounded bg-stone-50 p-1.5 text-center">
            <div className="text-[9px] text-stone-500 uppercase">Ca/P</div>
            <div className={`text-xs font-bold ${ration.caPRatio !== null && (ration.caPRatio < 0.8 || ration.caPRatio > 2.0) ? "text-rose-700" : "text-emerald-700"}`}>{fmt(ration.caPRatio ?? 0, 2)}</div>
          </div>
          <div className="rounded bg-stone-50 p-1.5 text-center">
            <div className="text-[9px] text-stone-500 uppercase">RMIC</div>
            <div className={`text-xs font-bold ${ration.rmic !== null && ration.rmic < -12 ? "text-rose-700" : "text-emerald-700"}`}>{fmt(ration.rmic ?? 0, 1)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskRow({ label, a, b, lowerBetter, higherBetter }: { label: string; a: string; b: string; lowerBetter?: boolean; higherBetter?: boolean }) {
  const aNum = parseFloat(a);
  const bNum = parseFloat(b);
  let better: "a" | "b" | "equal" = "equal";
  if (lowerBetter) better = aNum < bNum ? "a" : aNum > bNum ? "b" : "equal";
  else if (higherBetter) better = aNum > bNum ? "a" : aNum < bNum ? "b" : "equal";

  return (
    <tr className="border-b border-stone-100">
      <td className="px-3 py-1.5 text-stone-700">{label}</td>
      <td className={`px-3 py-1.5 text-right tabular-nums ${better === "a" ? "text-emerald-700 font-bold" : ""}`}>{a}</td>
      <td className={`px-3 py-1.5 text-right tabular-nums ${better === "b" ? "text-emerald-700 font-bold" : ""}`}>{b}</td>
      <td className="px-3 py-1.5 text-center">
        {better === "a" && <span className="text-[10px] text-emerald-700">A ✓</span>}
        {better === "b" && <span className="text-[10px] text-emerald-700">B ✓</span>}
        {better === "equal" && <Equal className="h-3 w-3 text-stone-400 mx-auto" />}
      </td>
    </tr>
  );
}

// ==================== SHARED COMPONENTS ====================
function RationSelector({ label, color, rations, value, onChange }: {
  label: string; color: string; rations: SavedRation[]; value: string; onChange: (v: string) => void;
}) {
  const colors: Record<string, string> = {
    indigo: "border-indigo-200",
    purple: "border-purple-200",
    emerald: "border-emerald-200",
  };
  return (
    <Card className={colors[color] || "border-stone-200"}>
      <CardContent className="p-3">
        <Label className="text-xs font-semibold">{label}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
          <SelectContent>
            {rations.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

function ComparisonRowDisplay({ row }: { row: ComparisonRow }) {
  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50/50">
      <td className="px-3 py-2 text-stone-700 text-xs">{row.label}</td>
      <td className="px-3 py-2 text-right tabular-nums text-xs">
        <span className={row.better === "b" ? "text-rose-600" : ""}>{row.a}</span>
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-xs">
        <span className={row.better === "a" ? "text-rose-600" : ""}>{row.b}</span>
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-xs text-stone-500">{row.diff}</td>
      <td className="px-3 py-2 text-center">
        {row.better === "a" && <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium"><ArrowLeft className="h-3 w-3" />A</span>}
        {row.better === "b" && <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">B<ArrowRight className="h-3 w-3" /></span>}
        {row.better === "equal" && <Equal className="h-3 w-3 text-stone-400 mx-auto" />}
        {row.better === null && <span className="text-[10px] text-stone-300">—</span>}
      </td>
    </tr>
  );
}

function ComparisonRadar({ a, b, labelA, labelB }: { a: ComputedRation; b: ComputedRation; labelA?: string; labelB?: string }) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 90;
  const axes = [
    { label: "UFL", a: a.coverage.UFL ?? 0, b: b.coverage.UFL ?? 0 },
    { label: "PDI", a: a.coverage.PDI ?? 0, b: b.coverage.PDI ?? 0 },
    { label: "Pabs", a: a.coverage.Pabs ?? 0, b: b.coverage.Pabs ?? 0 },
    { label: "Caabs", a: a.coverage.Caabs ?? 0, b: b.coverage.Caabs ?? 0 },
    { label: "Coût⁻¹", a: a.totalCost > 0 ? Math.min(100, 50 / a.totalCost * 100) : 0, b: b.totalCost > 0 ? Math.min(100, 50 / b.totalCost * 100) : 0 },
  ];
  const n = axes.length;
  const rings = [25, 50, 75, 100];

  const axisPoints = axes.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle), angle };
  });

  const dataPointsA = axes.map((ax, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const r = Math.min(100, Math.max(0, ax.a)) / 100 * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), value: ax.a };
  });
  const dataPointsB = axes.map((ax, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const r = Math.min(100, Math.max(0, ax.b)) / 100 * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), value: ax.b };
  });

  const pathA = dataPointsA.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  const pathB = dataPointsB.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-indigo-700" /> Comparaison visuelle (radar)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-center gap-4">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-56 h-56 flex-shrink-0">
          {rings.map((ring, ri) => {
            const pts = axes.map((_, i) => {
              const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
              const r = (ring / 100) * maxR;
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            }).join(" ");
            return <polygon key={ri} points={pts} fill="none" stroke="#e7e5e4" strokeWidth="1" strokeDasharray={ring === 100 ? "0" : "2,2"} />;
          })}
          {axisPoints.map((p, i) => <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e7e5e4" strokeWidth="1" />)}
          <polygon points={dataPointsA.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" strokeWidth="2" />
          <polygon points={dataPointsB.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(168, 85, 247, 0.15)" stroke="#a855f7" strokeWidth="2" strokeDasharray="4,2" />
          {axisPoints.map((p, i) => {
            const labelR = maxR + 18;
            const lx = cx + labelR * Math.cos(p.angle);
            const ly = cy + labelR * Math.sin(p.angle);
            return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-stone-700 font-medium">{axes[i].label}</text>;
          })}
        </svg>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-4 h-3 bg-indigo-500/30 border-2 border-indigo-500" />
            <span className="text-stone-700">{labelA || "Ration A"}: {a.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-4 h-3 bg-purple-500/30 border-2 border-purple-500 border-dashed" />
            <span className="text-stone-700">{labelB || "Ration B"}: {b.name}</span>
          </div>
          <div className="text-[10px] text-stone-500 mt-2">
            Plus le polygone est grand, meilleure est la couverture.
            &quot;Coût⁻¹&quot; = inverse du coût (plus grand = moins cher).
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
