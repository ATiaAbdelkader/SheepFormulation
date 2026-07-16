"use client";

import { useState, useMemo } from "react";
import {
  predictFeedValues, compareWithLab, LABEL_TEMPLATES,
  type LabelAnalysis, type PredictionResult, type LabComparison,
} from "@/lib/feed-decoder";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Telescope, Info, Sparkles, Calculator, FlaskConical, GitCompare,
  CheckCircle2, AlertTriangle, ArrowRight, Star, Award, FileText,
} from "lucide-react";

type Tab = "decoder" | "equations" | "compare" | "templates";

export function AlimPrevision() {
  const [tab, setTab] = useState<Tab>("decoder");
  const [analysis, setAnalysis] = useState<LabelAnalysis>({
    name: "Aliment composé brebis (16%)",
    mat: 16, cb: 7, mg: 3.5, mm: 7, amidon: 45, sucre: 5,
    msPct: 88, price: 0.30, adf: null, ndf: null, adl: null,
  });

  const result = useMemo(() => predictFeedValues(analysis), [analysis]);

  const update = (field: keyof LabelAnalysis, value: string | number) => {
    setAnalysis({ ...analysis, [field]: typeof value === "string" ? value : value });
  };

  const loadTemplate = (templateId: string) => {
    const t = LABEL_TEMPLATES.find((t) => t.id === templateId);
    if (!t) return;
    setAnalysis({ name: t.name, ...t.values, msPct: t.msPct, price: t.typicalPrice });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Telescope className="h-5 w-5 text-purple-700" />
          Décodeur d&apos;étiquette — Valeur alimentaire prédite
        </h2>
        <p className="text-sm text-stone-500">
          Décodez l&apos;étiquette d&apos;un aliment commercial pour estimer sa valeur nutritionnelle (UFL, PDI, dMO)
          avec intervalles de confiance à 95%, comparaison laboratoire, et modèles d&apos;étiquettes.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-1">
        <TabButton active={tab === "decoder"} onClick={() => setTab("decoder")} icon={<Telescope className="h-3.5 w-3.5" />} label="Décodeur" />
        <TabButton active={tab === "equations"} onClick={() => setTab("equations")} icon={<Calculator className="h-3.5 w-3.5" />} label="Équations & CI" />
        <TabButton active={tab === "compare"} onClick={() => setTab("compare")} icon={<GitCompare className="h-3.5 w-3.5" />} label="Comparaison labo" />
        <TabButton active={tab === "templates"} onClick={() => setTab("templates")} icon={<FileText className="h-3.5 w-3.5" />} label="Modèles" />
      </div>

      {tab === "decoder" && <DecoderTab analysis={analysis} result={result} update={update} loadTemplate={loadTemplate} />}
      {tab === "equations" && <EquationsTab result={result} />}
      {tab === "compare" && <CompareTab result={result} />}
      {tab === "templates" && <TemplatesTab loadTemplate={loadTemplate} setTab={setTab} />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${
        active ? "bg-purple-100 text-purple-900 border-b-2 border-purple-600" : "text-stone-600 hover:bg-stone-100"
      }`}>
      {icon}{label}
    </button>
  );
}

// ==================== DECODER TAB ====================
function DecoderTab({ analysis, result, update, loadTemplate }: {
  analysis: LabelAnalysis;
  result: PredictionResult;
  update: (field: keyof LabelAnalysis, value: string | number) => void;
  loadTemplate: (id: string) => void;
}) {
  const p = result.predicted;

  return (
    <div className="space-y-4">
      {/* Quick templates */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold">Modèles rapides</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {LABEL_TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => loadTemplate(t.id)}
              className="text-[10px] px-2 py-1 rounded-md bg-stone-100 hover:bg-purple-100 hover:text-purple-800 transition-colors">
              {t.name}
            </button>
          ))}
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
            <CardDescription className="text-xs">Valeurs en % de matière sèche</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom de l&apos;aliment</Label>
              <Input value={analysis.name} onChange={(e) => update("name", e.target.value)} className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AnalysisInput label="MAT (Protéines)" value={analysis.mat} onChange={(v) => update("mat", v)} unit="% MS" hint="PB = N × 6.25" />
              <AnalysisInput label="CB (Cellulose)" value={analysis.cb} onChange={(v) => update("cb", v)} unit="% MS" />
              <AnalysisInput label="MG (Matière grasse)" value={analysis.mg} onChange={(v) => update("mg", v)} unit="% MS" />
              <AnalysisInput label="MM (Cendres)" value={analysis.mm} onChange={(v) => update("mm", v)} unit="% MS" />
              <AnalysisInput label="Amidon" value={analysis.amidon} onChange={(v) => update("amidon", v)} unit="% MS" />
              <AnalysisInput label="Sucres" value={analysis.sucre} onChange={(v) => update("sucre", v)} unit="% MS" />
              <AnalysisInput label="% MS" value={analysis.msPct} onChange={(v) => update("msPct", v)} unit="%" />
              <AnalysisInput label="Prix" value={analysis.price} onChange={(v) => update("price", v)} unit="€/kg" />
            </div>
            {/* Optional advanced fields */}
            <div className="pt-2 border-t border-stone-200">
              <Label className="text-[10px] text-stone-500 uppercase">Champs avancés (optionnel)</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <AnalysisInput label="NDF" value={analysis.ndf ?? 0} onChange={(v) => update("ndf", v || null)} unit="%" />
                <AnalysisInput label="ADF" value={analysis.adf ?? 0} onChange={(v) => update("adf", v || null)} unit="%" />
                <AnalysisInput label="ADL" value={analysis.adl ?? 0} onChange={(v) => update("adl", v || null)} unit="%" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Predicted values */}
        <Card className="border-purple-300 bg-gradient-to-br from-purple-50/40 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-700" />
              Valeurs prédites
            </CardTitle>
            <CardDescription className="text-xs">
              Équations INRA 2018 · Intervalle de confiance à 95%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Quality badge */}
            <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-stone-200">
              <div>
                <div className="text-[10px] text-stone-500 uppercase">Qualité prédite</div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ${
                    p.qualityGrade === "A" ? "bg-emerald-100 text-emerald-700" :
                    p.qualityGrade === "B" ? "bg-lime-100 text-lime-700" :
                    p.qualityGrade === "C" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                  }`}>{p.qualityGrade}</span>
                  <span className="text-sm font-semibold text-stone-900">Score: {p.qualityScore}/100</span>
                </div>
              </div>
              <div className="flex">{Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < Math.floor(p.qualityScore / 20) ? "text-amber-400 fill-amber-400" : "text-stone-200"}`} />
              ))}</div>
            </div>

            {/* Energy */}
            <div className="grid grid-cols-2 gap-2">
              <PredictedBox label="UFL" value={p.ufl} unit="UFL/kg MS" ci={result.confidence.ufl} highlight />
              <PredictedBox label="UFV" value={p.ufv} unit="UFV/kg MS" ci={result.confidence.ufv} />
              <PredictedBox label="dMO" value={p.dMO} unit="%" ci={result.confidence.dMO} />
              <PredictedBox label="dN" value={p.dN} unit="%" ci={result.confidence.dN} />
            </div>

            {/* Protein */}
            <div className="grid grid-cols-3 gap-2">
              <PredictedBox label="PDIN" value={p.pdin} unit="g/kg" ci={result.confidence.pdin} decimals={0} highlight />
              <PredictedBox label="PDIE" value={p.pdie} unit="g/kg" ci={result.confidence.pdie} decimals={0} />
              <PredictedBox label="PDIA" value={p.pdia} unit="g/kg" ci={result.confidence.pdia} decimals={1} />
            </div>

            {/* Minerals */}
            <div className="grid grid-cols-2 gap-2">
              <PredictedBox label="Pabs (est.)" value={p.pabs} unit="g/kg" ci={result.confidence.pabs} decimals={1} />
              <PredictedBox label="Caabs (est.)" value={p.caabs} unit="g/kg" ci={result.confidence.caabs} decimals={1} />
            </div>

            {/* Cost */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
              <div className="text-[10px] text-amber-700 uppercase font-medium">Coût par UFL</div>
              <div className="text-lg font-bold text-amber-900">
                {analysis.msPct > 0 && p.ufl > 0 ? (analysis.price * 100 / analysis.msPct / p.ufl).toFixed(3) : "—"} €/UFL
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="space-y-1">
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-800">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnalysisInput({ label, value, onChange, unit, hint }: { label: string; value: number; onChange: (v: number) => void; unit: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-stone-500">{label}</Label>
      <div className="relative">
        <Input type="number" step="any" value={value || ""} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-8 text-sm pr-10" />
        <span className="absolute right-2 top-1.5 text-[10px] text-stone-400">{unit}</span>
      </div>
      {hint && <p className="text-[9px] text-stone-400">{hint}</p>}
    </div>
  );
}

function PredictedBox({ label, value, unit, ci, decimals = 3, highlight }: {
  label: string; value: number; unit: string;
  ci?: { lower: number; upper: number; confidenceLevel: number };
  decimals?: number; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-2.5 ${highlight ? "bg-purple-100 ring-1 ring-purple-300" : "bg-white border border-stone-200"}`}>
      <div className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</div>
      <div className={`text-base font-bold ${highlight ? "text-purple-900" : "text-stone-900"}`}>
        {value.toFixed(decimals)}
      </div>
      <div className="text-[9px] text-stone-400">{unit}</div>
      {ci && (
        <div className="text-[8px] text-stone-400 mt-0.5">
          IC 95%: [{ci.lower.toFixed(decimals)}, {ci.upper.toFixed(decimals)}]
        </div>
      )}
    </div>
  );
}

// ==================== EQUATIONS TAB ====================
function EquationsTab({ result }: { result: PredictionResult }) {
  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Calculator className="h-3.5 w-3.5 text-purple-700" />
            Équations INRA 2018 utilisées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {result.equations.map((eq, i) => (
              <div key={i} className="rounded-lg bg-stone-50 p-2 font-mono text-xs text-stone-700">
                {eq}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confidence intervals detail */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold">Intervalles de confiance (95%)</CardTitle>
          <CardDescription className="text-xs">
            Basés sur les R² de validation INRA. Plus le R² est élevé, plus la prédiction est fiable.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Paramètre</th>
                  <th className="text-right px-3 py-2 font-medium">Valeur prédite</th>
                  <th className="text-right px-3 py-2 font-medium">Borne inf.</th>
                  <th className="text-right px-3 py-2 font-medium">Borne sup.</th>
                  <th className="text-right px-3 py-2 font-medium">Amplitude IC</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.confidence).map(([key, ci]) => (
                  <tr key={key} className="border-b border-stone-100">
                    <td className="px-3 py-1.5 font-medium text-stone-900 uppercase">{key}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-bold">{ci.value.toFixed(key === "pdin" || key === "pdie" ? 0 : 3)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-stone-500">{ci.lower.toFixed(key === "pdin" || key === "pdie" ? 0 : 3)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-stone-500">{ci.upper.toFixed(key === "pdin" || key === "pdie" ? 0 : 3)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-amber-700">
                      ±{((ci.upper - ci.lower) / 2).toFixed(key === "pdin" || key === "pdie" ? 0 : 3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Equation reference */}
      <Card className="border-stone-200 bg-stone-50">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-stone-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700 space-y-1">
              <p><strong>R² (coefficient de détermination):</strong> Mesure la fiabilité de l&apos;équation. Plus R² est proche de 1, plus la prédiction est précise.</p>
              <p><strong>n:</strong> Nombre d&apos;échantillons utilisés pour calibrer l&apos;équation (plus n est grand, plus fiable).</p>
              <p><strong>IC 95%:</strong> Intervalle dans lequel la vraie valeur a 95% de chances de se trouver. Pour les minéraux (Pabs, Caabs), l&apos;IC est large car les équations sont moins précises (R² ≈ 0.55-0.60).</p>
              <p className="italic text-[10px]">Référence: INRA 2018 — Alimentation des ruminants. Équations validées sur plus de 5000 échantillons.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== COMPARE TAB ====================
function CompareTab({ result }: { result: PredictionResult }) {
  const [labValues, setLabValues] = useState({
    ufl: "", pdin: "", pdie: "", pabs: "", caabs: "", dMO: "",
  });

  const comparisons = useMemo(() => {
    const lab: any = {};
    if (labValues.ufl) lab.ufl = Number(labValues.ufl);
    if (labValues.pdin) lab.pdin = Number(labValues.pdin);
    if (labValues.pdie) lab.pdie = Number(labValues.pdie);
    if (labValues.pabs) lab.pabs = Number(labValues.pabs);
    if (labValues.caabs) lab.caabs = Number(labValues.caabs);
    if (labValues.dMO) lab.dMO = Number(labValues.dMO);
    return compareWithLab(result, lab);
  }, [result, labValues]);

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-purple-700" />
            Comparaison valeurs prédites vs analyse laboratoire
          </CardTitle>
          <CardDescription className="text-xs">
            Saisissez les valeurs de votre analyse de laboratoire pour vérifier la précision des prédictions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: "ufl", label: "UFL labo", placeholder: "ex: 1.05" },
              { key: "pdin", label: "PDIN labo", placeholder: "ex: 85" },
              { key: "pdie", label: "PDIE labo", placeholder: "ex: 80" },
              { key: "pabs", label: "Pabs labo", placeholder: "ex: 2.5" },
              { key: "caabs", label: "Caabs labo", placeholder: "ex: 3.0" },
              { key: "dMO", label: "dMO labo (%)", placeholder: "ex: 78" },
            ].map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-[10px] text-stone-500">{f.label}</Label>
                <Input type="number" step="any" value={(labValues as any)[f.key]} onChange={(e) => setLabValues({ ...labValues, [f.key]: e.target.value })} placeholder={f.placeholder} className="h-8 text-xs" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {comparisons.length > 0 && (
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">Résultats de comparaison</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Paramètre</th>
                    <th className="text-right px-3 py-2 font-medium">Prédit</th>
                    <th className="text-right px-3 py-2 font-medium">Labo</th>
                    <th className="text-right px-3 py-2 font-medium">Δ</th>
                    <th className="text-right px-3 py-2 font-medium">Δ %</th>
                    <th className="text-center px-3 py-2 font-medium">Dans IC?</th>
                    <th className="text-center px-3 py-2 font-medium">Évaluation</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c, i) => (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="px-3 py-1.5 font-medium text-stone-900">{c.parameter}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{c.predicted.toFixed(c.parameter === "PDIN" || c.parameter === "PDIE" ? 0 : 3)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{c.actual.toFixed(c.parameter === "PDIN" || c.parameter === "PDIE" ? 0 : 3)}</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums ${c.difference > 0 ? "text-amber-700" : c.difference < 0 ? "text-rose-700" : "text-stone-400"}`}>
                        {c.difference > 0 ? "+" : ""}{c.difference.toFixed(c.parameter === "PDIN" || c.parameter === "PDIE" ? 0 : 3)}
                      </td>
                      <td className={`px-3 py-1.5 text-right tabular-nums ${Math.abs(c.differencePct) < 5 ? "text-emerald-700" : Math.abs(c.differencePct) < 10 ? "text-amber-700" : "text-rose-700"}`}>
                        {c.differencePct > 0 ? "+" : ""}{c.differencePct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {c.withinCI ? <CheckCircle2 className="h-3 w-3 text-emerald-600 mx-auto" /> : <AlertTriangle className="h-3 w-3 text-amber-600 mx-auto" />}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <Badge className={`text-[9px] ${
                          c.assessment === "excellent" ? "bg-emerald-100 text-emerald-800"
                          : c.assessment === "good" ? "bg-lime-100 text-lime-800"
                          : c.assessment === "acceptable" ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                        }`}>{c.assessment}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {comparisons.length > 0 && (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-stone-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-stone-700">
                <strong>Interprétation:</strong> Si la valeur labo est dans l&apos;intervalle de confiance (✓),
                l&apos;équation prédit correctement. Si elle est hors IC (⚠), l&apos;aliment peut avoir une composition
                atypique ou l&apos;équation est moins adaptée. Pour les minéraux (Pabs, Caabs), des écarts sont fréquents
                car les équations sont moins précises (R² ≈ 0.55).
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== TEMPLATES TAB ====================
function TemplatesTab({ loadTemplate, setTab }: { loadTemplate: (id: string) => void; setTab: (t: Tab) => void }) {
  return (
    <div className="space-y-3">
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-purple-700" />
            Modèles d&apos;étiquettes commerciales ({LABEL_TEMPLATES.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Cliquez pour charger un modèle type et voir sa valeur nutritionnelle prédite.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {LABEL_TEMPLATES.map((t) => {
          const analysis: LabelAnalysis = { name: t.name, ...t.values, msPct: t.msPct, price: t.typicalPrice };
          const result = predictFeedValues(analysis);
          const p = result.predicted;
          return (
            <Card key={t.id} className="border-stone-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { loadTemplate(t.id); setTab("decoder"); }}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-stone-900">{t.name}</div>
                    <div className="text-[10px] text-stone-500">{t.description}</div>
                  </div>
                  <Badge className={`text-[9px] ${
                    p.qualityGrade === "A" ? "bg-emerald-100 text-emerald-700"
                    : p.qualityGrade === "B" ? "bg-lime-100 text-lime-700"
                    : p.qualityGrade === "C" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                  }`}>{p.qualityGrade}</Badge>
                </div>

                {/* Composition */}
                <div className="flex flex-wrap gap-1 text-[9px] text-stone-500 mb-2">
                  <span className="px-1 py-0.5 rounded bg-stone-100">MAT {t.values.mat}%</span>
                  <span className="px-1 py-0.5 rounded bg-stone-100">CB {t.values.cb}%</span>
                  <span className="px-1 py-0.5 rounded bg-stone-100">Amidon {t.values.amidon}%</span>
                  <span className="px-1 py-0.5 rounded bg-stone-100">MG {t.values.mg}%</span>
                </div>

                {/* Predicted values */}
                <div className="grid grid-cols-4 gap-1">
                  <PredMini label="UFL" value={p.ufl.toFixed(2)} />
                  <PredMini label="PDIN" value={p.pdin.toFixed(0)} />
                  <PredMini label="dMO" value={`${p.dMO.toFixed(0)}%`} />
                  <PredMini label="€/UFL" value={(t.typicalPrice * 100 / t.msPct / p.ufl).toFixed(3)} />
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="text-stone-500">Prix: {t.typicalPrice} €/kg</span>
                  <span className="text-purple-700 flex items-center gap-0.5">Décoder <ArrowRight className="h-2.5 w-2.5" /></span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PredMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-stone-50 p-1 text-center">
      <div className="text-[8px] text-stone-500 uppercase">{label}</div>
      <div className="text-[10px] font-bold text-stone-900">{value}</div>
    </div>
  );
}
