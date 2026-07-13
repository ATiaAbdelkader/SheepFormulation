"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, type AnimalRecord, type FourrageRecord, type ConcentreRecord } from "@/lib/alim-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck, Plus, Trash2, AlertTriangle, CheckCircle2, Info,
  Target, Sparkles, TrendingUp, TrendingDown, Lightbulb,
} from "lucide-react";

type MixIngredient = {
  id: string;
  kind: "fourrage" | "concentre";
  record: FourrageRecord | ConcentreRecord;
  percentage: number; // % of total mix (dry matter basis)
};

type MixAnalysis = {
  msPct: number;
  ufl: number;
  ufv: number;
  pdin: number;
  pdie: number;
  pdi: number;
  pabs: number;
  caabs: number;
  uem: number;
  costPerKgBrut: number;
  costPerKgMS: number;
  caPRatio: number;
  derm: number; // UFL/UEM
  proteinPerUFL: number; // g PDI / UFL
};

type AnimalMatch = {
  animal: AnimalRecord;
  score: number; // 0-100, higher is better
  requiredMS: number; // kg MS needed to meet UFL
  feasible: boolean; // within UEM capacity
  coverage: {
    UFL: number;
    PDI: number;
    Pabs: number;
    Caabs: number;
    UEM: number;
  };
};

type Correction = {
  type: "deficit" | "excess" | "ok";
  nutrient: string;
  message: string;
  suggestion?: string;
};

export function AlimVerificateur() {
  const [ingredients, setIngredients] = useState<MixIngredient[]>([]);
  const [analyzed, setAnalyzed] = useState(false);

  const addIngredient = (kind: "fourrage" | "concentre", record: FourrageRecord | ConcentreRecord) => {
    const id = `${kind}-${record.name}-${Date.now()}`;
    setIngredients([...ingredients, { id, kind, record, percentage: 0 }]);
  };

  const updateIngredient = (id: string, percentage: number) => {
    setIngredients(ingredients.map((it) => (it.id === id ? { ...it, percentage } : it)));
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter((it) => it.id !== id));
  };

  const totalPercentage = ingredients.reduce((s, it) => s + (it.percentage || 0), 0);

  // Compute mix analysis
  const analysis = useMemo<MixAnalysis | null>(() => {
    if (ingredients.length === 0 || totalPercentage <= 0) return null;
    const total = totalPercentage; // may not be 100
    let msPct = 0, ufl = 0, ufv = 0, pdin = 0, pdie = 0, pabs = 0, caabs = 0, uem = 0, costBrut = 0;
    ingredients.forEach((it) => {
      const w = (it.percentage || 0) / total; // weight fraction
      const r = it.record;
      const ms = num(r.ms_pct);
      if (ms !== null) msPct += ms * w;
      const u = num(r.ufl); if (u !== null) ufl += u * w;
      const uv = num((r as FourrageRecord).ufv); if (uv !== null) ufv += uv * w;
      const pn = num((r as FourrageRecord).pdin ?? (r as ConcentreRecord).pdin); if (pn !== null) pdin += pn * w;
      const pe = num((r as FourrageRecord).pdie ?? (r as ConcentreRecord).pdie); if (pe !== null) pdie += pe * w;
      const pa = num(r.pabs); if (pa !== null) pabs += pa * w;
      const ca = num(r.caabs); if (ca !== null) caabs += ca * w;
      const ue = num((r as FourrageRecord).uem); if (ue !== null) uem += ue * w;
      const price = num(r.price) ?? 0;
      // price is per kg brut; we weight by MS fraction, so convert
      if (ms !== null && ms > 0) costBrut += (price * 100 / ms) * w * ms / 100; // = price * w
      else costBrut += price * w;
    });
    const pdi = Math.min(pdin, pdie);
    const costPerKgMS = msPct > 0 ? costBrut * 100 / msPct : costBrut;
    const caPRatio = pabs > 0 ? caabs / pabs : 0;
    const derm = uem > 0 ? ufl / uem : 0;
    const proteinPerUFL = ufl > 0 ? pdi / ufl : 0;
    return { msPct, ufl, ufv, pdin, pdie, pdi, pabs, caabs, uem, costPerKgBrut: costBrut, costPerKgMS, caPRatio, derm, proteinPerUFL };
  }, [ingredients, totalPercentage]);

  // Find best animal matches
  const matches = useMemo<AnimalMatch[]>(() => {
    if (!analysis || analysis.ufl <= 0) return [];
    const candidates = alimData.animals.filter((a) => num(a.UFL) !== null && num(a.UEM) !== null);
    const scored = candidates.map((animal) => {
      const needs = {
        UEM: num(animal.UEM) ?? 0,
        UFL: num(animal.UFL) ?? 0,
        PDI: num(animal.PDI) ?? 0,
        Pabs: num(animal.Pabs) ?? 0,
        Caabs: num(animal.Caabs) ?? 0,
      };
      // Required MS to meet UFL needs
      const requiredMS = needs.UFL / analysis.ufl;
      // Encombrement at that intake
      const encombrement = requiredMS * analysis.uem;
      const feasible = encombrement <= needs.UEM * 1.05; // 5% tolerance
      // Coverage at that intake
      const coverage = {
        UFL: 100, // by construction
        PDI: needs.PDI > 0 ? (analysis.pdi * requiredMS / needs.PDI) * 100 : 0,
        Pabs: needs.Pabs > 0 ? (analysis.pabs * requiredMS / needs.Pabs) * 100 : 0,
        Caabs: needs.Caabs > 0 ? (analysis.caabs * requiredMS / needs.Caabs) * 100 : 0,
        UEM: needs.UEM > 0 ? (encombrement / needs.UEM) * 100 : 0,
      };
      // Score: how close are PDI, Pabs, Caabs to 100%? (UFL is always 100% by construction)
      // Penalize if not feasible (UEM exceeded)
      const deviations = [coverage.PDI, coverage.Pabs, coverage.Caabs].map((c) => Math.abs(c - 100));
      const avgDeviation = deviations.reduce((s, d) => s + d, 0) / deviations.length;
      let score = Math.max(0, 100 - avgDeviation);
      if (!feasible) score *= 0.5; // big penalty if not feasible
      return { animal, score, requiredMS, feasible, coverage };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [analysis]);

  // Compute corrections for the best match
  const corrections = useMemo<Correction[]>(() => {
    if (!analysis || matches.length === 0) return [];
    const best = matches[0];
    const c: Correction[] = [];

    // Feasibility
    if (!best.feasible) {
      c.push({
        type: "excess",
        nutrient: "Capacité d'ingestion (UEM)",
        message: `La ration est trop encombrante: ${fmt(best.coverage.UEM, 0)}% de la capacité d'ingestion de l'animal cible.`,
        suggestion: "Ajoutez un concentré ou réduisez les fourrages pour augmenter la densité énergétique (UFL/UEM).",
      });
    }

    // PDI
    if (best.coverage.PDI < 90) {
      c.push({
        type: "deficit",
        nutrient: "PDI (protéines)",
        message: `Déficit en protéines: ${fmt(best.coverage.PDI, 0)}% des besoins couverts.`,
        suggestion: "Ajoutez un tourteau (soja 48, colza 35) ou un protéagineux (lupin, féverole, pois) à raison de 5-15% du mélange.",
      });
    } else if (best.coverage.PDI > 115) {
      c.push({
        type: "excess",
        nutrient: "PDI (protéines)",
        message: `Excès de protéines: ${fmt(best.coverage.PDI, 0)}% des besoins. Gaspillage coûteux.`,
        suggestion: "Réduisez la part des tourteaux/protéagineux. Remplacez par une céréale (orge, blé).",
      });
    } else {
      c.push({ type: "ok", nutrient: "PDI (protéines)", message: `Protéines équilibrées: ${fmt(best.coverage.PDI, 0)}% des besoins.` });
    }

    // Pabs
    if (best.coverage.Pabs < 90) {
      c.push({
        type: "deficit",
        nutrient: "Pabs (phosphore)",
        message: `Déficit en phosphore: ${fmt(best.coverage.Pabs, 0)}% des besoins.`,
        suggestion: "Ajoutez un CMV riche en phosphore (ex: CMV 0-27 ou 2-28) à raison de 10-30 g/animal/jour.",
      });
    } else if (best.coverage.Pabs > 115) {
      c.push({
        type: "excess",
        nutrient: "Pabs (phosphore)",
        message: `Excès de phosphore: ${fmt(best.coverage.Pabs, 0)}%. Surplus environnemental.`,
        suggestion: "Réduisez les aliments riches en P (tourteaux, son).",
      });
    } else {
      c.push({ type: "ok", nutrient: "Pabs (phosphore)", message: `Phosphore équilibré: ${fmt(best.coverage.Pabs, 0)}%.` });
    }

    // Caabs
    if (best.coverage.Caabs < 90) {
      c.push({
        type: "deficit",
        nutrient: "Caabs (calcium)",
        message: `Déficit en calcium: ${fmt(best.coverage.Caabs, 0)}% des besoins.`,
        suggestion: "Ajoutez un CMV riche en calcium (ex: CMV 12-12 ou 8-18) ou de la luzerne déshydratée.",
      });
    } else if (best.coverage.Caabs > 115) {
      c.push({
        type: "excess",
        nutrient: "Caabs (calcium)",
        message: `Excès de calcium: ${fmt(best.coverage.Caabs, 0)}%. Peut interférer avec l'absorption du phosphore.`,
        suggestion: "Réduisez la luzerne ou les aliments riches en Ca. Vérifiez le rapport Ca/P.",
      });
    } else {
      c.push({ type: "ok", nutrient: "Caabs (calcium)", message: `Calcium équilibré: ${fmt(best.coverage.Caabs, 0)}%.` });
    }

    // Ca/P ratio
    if (analysis.caPRatio > 0) {
      if (analysis.caPRatio < 1.0) {
        c.push({
          type: "deficit",
          nutrient: "Rapport Ca/P",
          message: `Rapport Ca/P = ${fmt(analysis.caPRatio, 2)} (trop bas). Risque de calculs urinaires.`,
          suggestion: "Augmentez le calcium (luzerne, CMV riche en Ca) ou réduisez le phosphore.",
        });
      } else if (analysis.caPRatio > 2.0) {
        c.push({
          type: "excess",
          nutrient: "Rapport Ca/P",
          message: `Rapport Ca/P = ${fmt(analysis.caPRatio, 2)} (trop élevé). Interfère avec l'absorption du P.`,
          suggestion: "Augmentez le phosphore (CMV riche en P) ou réduisez le calcium.",
        });
      } else {
        c.push({ type: "ok", nutrient: "Rapport Ca/P", message: `Rapport Ca/P optimal: ${fmt(analysis.caPRatio, 2)} (cible: 1.0-1.5).` });
      }
    }

    // RMIC (protein/energy balance)
    if (analysis.proteinPerUFL > 0) {
      const rmic = (analysis.pdin - analysis.pdie) / analysis.ufl;
      if (rmic < -12) {
        c.push({
          type: "deficit",
          nutrient: "RMIC (équilibre azote/énergie)",
          message: `RMIC = ${fmt(rmic, 1)} g PDI/UFL. Déséquilibre microbial (déficit d'azote dégradable).`,
          suggestion: "Augmentez les protéines dégradables (tourteau de colza, luzerne) ou l'urée (avec précaution).",
        });
      } else if (rmic > 10) {
        c.push({
          type: "excess",
          nutrient: "RMIC (équilibre azote/énergie)",
          message: `RMIC = ${fmt(rmic, 1)} g PDI/UFL. Excès d'azote dégradable non utilisé.`,
          suggestion: "Augmentez l'énergie (céréales) pour valoriser l'azote disponible.",
        });
      }
    }

    return c;
  }, [analysis, matches]);

  const handleAnalyze = () => {
    setAnalyzed(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
          Vérificateur de ration
        </h2>
        <p className="text-sm text-stone-500">
          Vous avez une ration de composition inconnue ? Saisissez ses ingrédients et leurs proportions.
          L&apos;outil calcule la valeur nutritionnelle du mélange, identifie l&apos;animal cible le plus adapté,
          et suggère des corrections pour équilibrer la ration.
        </p>
      </div>

      {/* Info banner */}
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-emerald-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700">
              <strong className="text-emerald-900">Comment ça marche :</strong> Les pourcentages sont exprimés
              sur la base de la matière sèche (MS). L&apos;algorithme calcule la valeur nutritionnelle moyenne
              pondérée du mélange, puis simule la ration pour chaque catégorie d&apos;animal de la base de données
              (354 catégories) pour trouver celle dont les besoins sont les mieux couverts.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredient input */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">1</span>
                Composition de la ration
              </CardTitle>
              <CardDescription className="text-xs">Ajoutez les ingrédients et leurs pourcentages (% de la MS totale)</CardDescription>
            </div>
            <div className="flex gap-2">
              <IngredientPicker kind="fourrage" onPick={(r) => addIngredient("fourrage", r as FourrageRecord)} />
              <IngredientPicker kind="concentre" onPick={(r) => addIngredient("concentre", r as ConcentreRecord)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {ingredients.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-stone-200 p-6 text-center text-sm text-stone-500">
              <Plus className="h-6 w-6 mx-auto mb-2 text-stone-400" />
              Ajoutez des fourrages et concentrés pour composer la ration à analyser.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {ingredients.map((it) => (
                  <div key={it.id} className={`rounded-lg border p-3 ${it.kind === "fourrage" ? "border-lime-200 bg-lime-50/30" : "border-orange-200 bg-orange-50/30"}`}>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`text-[10px] ${it.kind === "fourrage" ? "bg-lime-100 text-lime-800" : "bg-orange-100 text-orange-800"}`}>
                        {it.kind === "fourrage" ? "F" : "C"}
                      </Badge>
                      <span className="text-sm font-medium text-stone-900 flex-1 truncate">{it.record.name}</span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={it.percentage || ""}
                          onChange={(e) => updateIngredient(it.id, Number(e.target.value) || 0)}
                          className="h-8 w-20 text-sm text-right"
                        />
                        <span className="text-xs text-stone-500">%</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeIngredient(it.id)} className="h-8 w-8 text-stone-400 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="text-[10px] text-stone-500 mt-1">
                      UFL {fmt(num(it.record.ufl))} · PDIN {fmt(num((it.record as FourrageRecord).pdin ?? (it.record as ConcentreRecord).pdin), 0)} · MS {fmt(num(it.record.ms_pct), 0)}%
                    </div>
                  </div>
                ))}
              </div>
              {/* Total percentage indicator */}
              <div className={`rounded-lg p-2.5 flex items-center justify-between ${Math.abs(totalPercentage - 100) < 0.1 ? "bg-emerald-50 border border-emerald-200" : totalPercentage > 0 ? "bg-amber-50 border border-amber-200" : "bg-stone-50 border border-stone-200"}`}>
                <span className="text-xs font-medium text-stone-700">Total des pourcentages</span>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold tabular-nums ${Math.abs(totalPercentage - 100) < 0.1 ? "text-emerald-700" : "text-amber-700"}`}>
                    {fmt(totalPercentage, 1)}%
                  </span>
                  {Math.abs(totalPercentage - 100) >= 0.1 && totalPercentage > 0 && (
                    <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-800">
                      <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                      Sera normalisé à 100%
                    </Badge>
                  )}
                  {Math.abs(totalPercentage - 100) < 0.1 && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
              </div>
              <Button onClick={handleAnalyze} disabled={totalPercentage <= 0} className="w-full bg-emerald-600 hover:bg-emerald-700">
                <ShieldCheck className="h-4 w-4 mr-2" />
                Analyser la ration
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {analyzed && analysis && (
        <div className="space-y-4">
          {/* Nutritional analysis */}
          <Card className="border-emerald-300 bg-gradient-to-br from-emerald-50/50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-700" />
                Analyse nutritionnelle du mélange
              </CardTitle>
              <CardDescription className="text-xs">Valeurs par kg de matière sèche (MS)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <AnalysisBox label="UFL" value={fmt(analysis.ufl, 2)} unit="UFL/kg MS" highlight />
                <AnalysisBox label="UFV" value={fmt(analysis.ufv, 2)} unit="UFV/kg MS" />
                <AnalysisBox label="PDIN" value={fmt(analysis.pdin, 0)} unit="g/kg MS" />
                <AnalysisBox label="PDIE" value={fmt(analysis.pdie, 0)} unit="g/kg MS" />
                <AnalysisBox label="PDI (min)" value={fmt(analysis.pdi, 0)} unit="g/kg MS" highlight />
                <AnalysisBox label="Pabs" value={fmt(analysis.pabs, 2)} unit="g/kg MS" />
                <AnalysisBox label="Caabs" value={fmt(analysis.caabs, 2)} unit="g/kg MS" />
                <AnalysisBox label="UEM" value={fmt(analysis.uem, 2)} unit="UEM/kg MS" />
                <AnalysisBox label="% MS" value={fmt(analysis.msPct, 0)} unit="%" />
                <AnalysisBox label="Ca/P" value={fmt(analysis.caPRatio, 2)} unit="ratio" />
                <AnalysisBox label="Densité énerg." value={fmt(analysis.derm, 3)} unit="UFL/UEM" />
                <AnalysisBox label="Protéines/UFL" value={fmt(analysis.proteinPerUFL, 0)} unit="g PDI/UFL" />
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-200 grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-600">Coût / kg brut</span>
                  <span className="font-medium text-stone-900">{fmt(analysis.costPerKgBrut, 3)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Coût / kg MS</span>
                  <span className="font-medium text-stone-900">{fmt(analysis.costPerKgMS, 3)} €</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Animal matches */}
          {matches.length > 0 && (
            <Card className="border-stone-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-indigo-700" />
                  Animaux cibles recommandés
                </CardTitle>
                <CardDescription className="text-xs">
                  Top 5 des catégories d&apos;animaux dont les besoins sont les mieux couverts par cette ration
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Catégorie</th>
                        <th className="text-right px-3 py-2 font-medium">Score</th>
                        <th className="text-right px-3 py-2 font-medium">MS requise</th>
                        <th className="text-right px-3 py-2 font-medium">UFL</th>
                        <th className="text-right px-3 py-2 font-medium">PDI</th>
                        <th className="text-right px-3 py-2 font-medium">Pabs</th>
                        <th className="text-right px-3 py-2 font-medium">Caabs</th>
                        <th className="text-center px-3 py-2 font-medium">Faisabilité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((m, i) => (
                        <tr key={i} className={`border-b border-stone-100 ${i === 0 ? "bg-emerald-50/50" : ""}`}>
                          <td className="px-3 py-2 text-stone-900">
                            <div className="flex items-center gap-1.5">
                              {i === 0 && <Target className="h-3 w-3 text-emerald-600 flex-shrink-0" />}
                              <span className="text-xs font-medium truncate max-w-xs">{m.animal.category}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={`font-bold tabular-nums ${m.score >= 80 ? "text-emerald-700" : m.score >= 60 ? "text-amber-700" : "text-rose-700"}`}>
                              {fmt(m.score, 0)}
                            </span>
                            <span className="text-[9px] text-stone-400">/100</span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmt(m.requiredMS, 2)} kg</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            <CoverageBadge pct={m.coverage.UFL} />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            <CoverageBadge pct={m.coverage.PDI} />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            <CoverageBadge pct={m.coverage.Pabs} />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            <CoverageBadge pct={m.coverage.Caabs} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            {m.feasible ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-rose-600 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Corrections for best match */}
          {matches.length > 0 && corrections.length > 0 && (
            <Card className="border-amber-300 bg-gradient-to-br from-amber-50/40 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-700" />
                  Corrections suggérées
                </CardTitle>
                <CardDescription className="text-xs">
                  Pour l&apos;animal cible: <strong>{matches[0].animal.category}</strong> (score: {fmt(matches[0].score, 0)}/100)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {corrections.map((c, i) => (
                  <div key={i} className={`rounded-lg p-3 border ${c.type === "ok" ? "bg-emerald-50 border-emerald-200" : c.type === "deficit" ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"}`}>
                    <div className="flex items-start gap-2">
                      {c.type === "ok" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      ) : c.type === "deficit" ? (
                        <TrendingDown className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-stone-900">{c.nutrient}</span>
                          <Badge variant="outline" className={`text-[9px] ${c.type === "ok" ? "bg-emerald-100 text-emerald-800" : c.type === "deficit" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                            {c.type === "ok" ? "Équilibré" : c.type === "deficit" ? "Déficit" : "Excès"}
                          </Badge>
                        </div>
                        <p className="text-xs text-stone-700">{c.message}</p>
                        {c.suggestion && (
                          <p className="text-xs text-stone-600 mt-1 italic">
                            <Lightbulb className="h-3 w-3 inline mr-1" />
                            {c.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Summary recommendation */}
          {matches.length > 0 && (
            <Card className="border-indigo-300 bg-indigo-50/40">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Target className="h-5 w-5 text-indigo-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-indigo-900">Recommandation</p>
                    <p className="text-xs text-stone-700 mt-1">
                      Cette ration convient le mieux à <strong>{matches[0].animal.category}</strong> avec un score
                      de <strong>{fmt(matches[0].score, 0)}/100</strong>. Pour cet animal, il faut distribuer
                      environ <strong>{fmt(matches[0].requiredMS, 2)} kg de MS par animal et par jour</strong> pour
                      couvrir les besoins en énergie (UFL).
                      {!matches[0].feasible && (
                        <span className="block mt-1 text-rose-700 font-medium">
                          ⚠ Attention: cette quantité dépasse la capacité d&apos;ingestion de l&apos;animal.
                          La ration doit être reformulée (plus de concentré, moins de fourrage).
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function AnalysisBox({ label, value, unit, highlight }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2.5 ${highlight ? "bg-emerald-100 ring-1 ring-emerald-300" : "bg-white border border-stone-200"}`}>
      <div className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</div>
      <div className={`text-base font-bold ${highlight ? "text-emerald-900" : "text-stone-900"}`}>{value}</div>
      <div className="text-[9px] text-stone-400">{unit}</div>
    </div>
  );
}

function CoverageBadge({ pct }: { pct: number }) {
  const color = pct >= 95 && pct <= 115 ? "text-emerald-700" : pct < 90 ? "text-rose-700" : "text-amber-700";
  return <span className={`tabular-nums font-medium ${color}`}>{fmt(pct, 0)}%</span>;
}

function IngredientPicker({ kind, onPick }: { kind: "fourrage" | "concentre"; onPick: (r: FourrageRecord | ConcentreRecord) => void }) {
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
            <Input
              autoFocus
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
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
                  MS {fmt(num(d.ms_pct), 0)}% · UFL {fmt(num(d.ufl))} · PDIN {fmt(num((d as FourrageRecord).pdin ?? (d as ConcentreRecord).pdin), 0)}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-stone-500">Aucun résultat</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
