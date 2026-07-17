"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  PiggyBank, TrendingUp, Heart, Clock, ShieldCheck, Euro,
  Users, Package, AlertTriangle, Factory, Zap,
} from "lucide-react";
import {
  computeFarmerROI, computeFeedMillROI, formatCurrency, formatHours,
} from "@/lib/roi-calculator";
import type { UserRole } from "@/lib/user-roles";

export function ROICalculator({ role }: { role: UserRole }) {
  if (role === "feedmill") return <FeedMillROICalculator />;
  return <FarmerROICalculator />;
}

// ==================== FARMER ROI ====================
function FarmerROICalculator() {
  const [flockSize, setFlockSize] = useState(100);
  const [costPerEwe, setCostPerEwe] = useState(0.50);
  const [improvement, setImprovement] = useState(5);
  const [feedingDays, setFeedingDays] = useState(300);

  const roi = useMemo(() => computeFarmerROI({
    flockSize, costPerEwePerDay: costPerEwe, improvementPct: improvement, feedingDaysPerYear: feedingDays,
  }), [flockSize, costPerEwe, improvement, feedingDays]);

  return (
    <Card className="border-emerald-300 bg-gradient-to-br from-emerald-50/50 to-amber-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-emerald-700" />
          Calculateur de rentabilité
        </CardTitle>
        <CardDescription className="text-xs">
          Estimez l&apos;impact financier de l&apos;optimisation de vos rations avec OvinFormulation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Headline result */}
        <div className="rounded-xl bg-white p-4 border-2 border-emerald-300 text-center">
          <div className="text-[10px] text-stone-500 uppercase tracking-wide">Économie annuelle estimée</div>
          <div className="text-3xl font-bold text-emerald-700">{formatCurrency(roi.totalAnnualBenefit)}</div>
          <div className="text-xs text-stone-500 mt-1">soit {formatCurrency(roi.monthlySavings)}/mois</div>
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          <SliderInput
            label="Taille du troupeau"
            icon={<Users className="h-3.5 w-3.5" />}
            value={flockSize} min={5} max={500} step={5}
            unit="têtes"
            onChange={setFlockSize}
          />
          <SliderInput
            label="Coût actuel / brebis / jour"
            icon={<Euro className="h-3.5 w-3.5" />}
            value={costPerEwe} min={0.10} max={2.00} step={0.05}
            unit="€"
            onChange={setCostPerEwe}
            format={(v) => v.toFixed(2)}
          />
          <SliderInput
            label="Amélioration de la formulation"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            value={improvement} min={1} max={20} step={1}
            unit="%"
            onChange={setImprovement}
          />
          <SliderInput
            label="Jours d'alimentation / an"
            icon={<Clock className="h-3.5 w-3.5" />}
            value={feedingDays} min={120} max={365} step={5}
            unit="jours"
            onChange={setFeedingDays}
          />
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ROIBreakdownCard
            icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
            label="Économie sur l'aliment"
            value={formatCurrency(roi.annualSavings)}
            detail={`${formatCurrency(roi.savingsPerEwe)} / brebis / an`}
            color="emerald"
          />
          <ROIBreakdownCard
            icon={<Heart className="h-4 w-4 text-rose-500" />}
            label="Économie sanitaire"
            value={formatCurrency(roi.estimatedHealthSavings)}
            detail={`-${roi.healthRiskReduction.toFixed(0)}% de risques sanitaires`}
            color="rose"
          />
        </div>

        {/* Annual comparison */}
        <div className="rounded-lg bg-white p-3 border border-stone-200">
          <div className="text-[10px] font-semibold text-stone-500 uppercase mb-2">Coût annuel comparé</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-600 w-24">Actuel:</span>
              <div className="flex-1 h-6 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-stone-400 rounded-full flex items-center justify-end pr-2" style={{ width: "100%" }}>
                  <span className="text-[10px] text-white font-medium">{formatCurrency(roi.currentAnnualCost)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-600 w-24">Optimisé:</span>
              <div className="flex-1 h-6 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full flex items-center justify-end pr-2" style={{ width: `${(roi.optimizedAnnualCost / roi.currentAnnualCost) * 100}%` }}>
                  <span className="text-[10px] text-white font-medium">{formatCurrency(roi.optimizedAnnualCost)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROI ratio */}
        <div className="flex items-center justify-between rounded-lg bg-emerald-100 p-3">
          <div>
            <div className="text-[10px] text-stone-600 uppercase">ROI (Retour sur investissement)</div>
            <div className="text-lg font-bold text-emerald-800">
              {roi.roiRatio === Infinity ? "∞ (gratuit)" : `${roi.roiRatio.toFixed(0)}x`}
            </div>
          </div>
          <Badge className="bg-emerald-600 text-white text-[10px]">OvinFormulation est 100% gratuit</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== FEED MILL ROI ====================
function FeedMillROICalculator() {
  const [ingredientSpend, setIngredientSpend] = useState(500000);
  const [inventoryValue, setInventoryValue] = useState(75000);
  const [adminHours, setAdminHours] = useState(10);
  const [formulaImprovement, setFormulaImprovement] = useState(2);

  const roi = useMemo(() => computeFeedMillROI({
    annualIngredientSpend: ingredientSpend,
    inventoryValue,
    adminHoursPerWeek: adminHours,
    formulaImprovementPct: formulaImprovement,
  }), [ingredientSpend, inventoryValue, adminHours, formulaImprovement]);

  return (
    <Card className="border-amber-400 bg-gradient-to-br from-amber-50/50 to-emerald-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Factory className="h-4 w-4 text-amber-700" />
          Calculateur de rentabilité — Mini-usine
        </CardTitle>
        <CardDescription className="text-xs">
          Impact financier de la digitalisation: formulation, inventaire, qualité, traçabilité.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Headline */}
        <div className="rounded-xl bg-white p-4 border-2 border-amber-400 text-center">
          <div className="text-[10px] text-stone-500 uppercase tracking-wide">Impact annuel total estimé</div>
          <div className="text-3xl font-bold text-amber-700">{formatCurrency(roi.totalAnnualSavings)}</div>
          <div className="text-xs text-stone-500 mt-1">
            {roi.paybackDays > 0 ? `Remboursé en ${roi.paybackDays} jours` : "OvinFormulation est gratuit"}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          <SliderInput
            label="Dépense annuelle en ingrédients"
            icon={<Package className="h-3.5 w-3.5" />}
            value={ingredientSpend} min={50000} max={5000000} step={50000}
            unit="€"
            onChange={setIngredientSpend}
            format={(v) => formatCurrency(v)}
          />
          <SliderInput
            label="Valeur du stock actuel"
            icon={<Package className="h-3.5 w-3.5" />}
            value={inventoryValue} min={5000} max={500000} step={5000}
            unit="€"
            onChange={setInventoryValue}
            format={(v) => formatCurrency(v)}
          />
          <SliderInput
            label="Heures/semaine de suivi manuel"
            icon={<Clock className="h-3.5 w-3.5" />}
            value={adminHours} min={2} max={40} step={1}
            unit="h/sem"
            onChange={setAdminHours}
          />
          <SliderInput
            label="Amélioration du coût de formule"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            value={formulaImprovement} min={0.5} max={10} step={0.5}
            unit="%"
            onChange={setFormulaImprovement}
            format={(v) => v.toFixed(1)}
          />
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ROIBreakdownCard
            icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
            label="Coût de formule réduit"
            value={formatCurrency(roi.formulaCostSavings)}
            detail={`${roi.formulaImprovementPct.toFixed(1)}% de ${formatCurrency(roi.annualIngredientSpend)}`}
            color="emerald"
          />
          <ROIBreakdownCard
            icon={<PiggyBank className="h-4 w-4 text-amber-600" />}
            label="Fonds de roulement libéré"
            value={formatCurrency(roi.workingCapitalValue)}
            detail={`${formatCurrency(roi.workingCapitalFreed)} libérés (20% coût de stockage)`}
            color="amber"
          />
          <ROIBreakdownCard
            icon={<Clock className="h-4 w-4 text-blue-500" />}
            label="Temps administratif économisé"
            value={formatCurrency(roi.adminTimeValue)}
            detail={`${formatHours(roi.adminTimeSaved)} / an (à 35€/h)`}
            color="blue"
          />
          <ROIBreakdownCard
            icon={<ShieldCheck className="h-4 w-4 text-purple-500" />}
            label="Risque qualité réduit"
            value={formatCurrency(roi.recallRiskReduction)}
            detail={`+${roi.qualityImprovement.toFixed(0)}% de conformité`}
            color="purple"
          />
        </div>

        {/* ROI */}
        <div className="flex items-center justify-between rounded-lg bg-amber-100 p-3">
          <div>
            <div className="text-[10px] text-stone-600 uppercase">ROI (Retour sur investissement)</div>
            <div className="text-lg font-bold text-amber-800">
              {roi.roiRatio === Infinity ? "∞ (gratuit)" : `${roi.roiRatio.toFixed(0)}x`}
            </div>
          </div>
          <Badge className="bg-amber-600 text-white text-[10px]">100% gratuit</Badge>
        </div>

        {/* Industry benchmark */}
        <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
          <div className="text-[10px] font-semibold text-stone-500 uppercase mb-1 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Référence secteur
          </div>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            Une amélioration de 1% du coût de formule représente <strong>{formatCurrency(ingredientSpend * 0.01)}</strong>/an
            sur {formatCurrency(ingredientSpend)} de dépenses. Les outils professionnels comme Feedsoft
            coûtent 5,000-50,000€/an — OvinFormulation offre des capacités similaires gratuitement.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== SHARED COMPONENTS ====================
function SliderInput({
  label, icon, value, min, max, step, unit, onChange, format,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const displayValue = format ? format(value) : value.toString();
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs flex items-center gap-1.5 text-stone-600">
          {icon} {label}
        </Label>
        <span className="text-sm font-bold text-stone-900 tabular-nums">
          {displayValue} <span className="text-[10px] text-stone-400">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-emerald-600 cursor-pointer"
      />
    </div>
  );
}

function ROIBreakdownCard({
  icon, label, value, detail, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  color: "emerald" | "amber" | "rose" | "blue" | "purple";
}) {
  const colorMap: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50/50",
    amber: "border-amber-200 bg-amber-50/50",
    rose: "border-rose-200 bg-rose-50/50",
    blue: "border-blue-200 bg-blue-50/50",
    purple: "border-purple-200 bg-purple-50/50",
  };
  return (
    <div className={`rounded-lg p-2.5 border ${colorMap[color]}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className="text-[10px] text-stone-600 font-medium">{label}</span>
      </div>
      <div className="text-sm font-bold text-stone-900">{value}</div>
      <div className="text-[9px] text-stone-500">{detail}</div>
    </div>
  );
}
