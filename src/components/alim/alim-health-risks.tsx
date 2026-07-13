"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assessAllHealthRisks, getOverallRiskScore, type RationContext, type HealthRisk, type RiskLevel } from "@/lib/health-risks";
import { Activity, AlertTriangle, AlertOctagon, CheckCircle2, ShieldPlus } from "lucide-react";

export function HealthRiskPanel({ ctx }: { ctx: RationContext }) {
  const risks = assessAllHealthRisks(ctx);
  const overall = getOverallRiskScore(risks);

  return (
    <Card className={`border-2 ${
      overall.level === "critical" ? "border-red-400 bg-red-50/30"
      : overall.level === "high" ? "border-orange-400 bg-orange-50/30"
      : overall.level === "moderate" ? "border-amber-300 bg-amber-50/30"
      : "border-emerald-300 bg-emerald-50/30"
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className={`h-4 w-4 ${
                overall.level === "critical" || overall.level === "high" ? "text-red-600"
                : overall.level === "moderate" ? "text-amber-600"
                : "text-emerald-600"
              }`} />
              Prévisions des risques sanitaires
            </CardTitle>
            <CardDescription className="text-xs">
              Analyse prédictive basée sur la composition de la ration et le stade physiologique
            </CardDescription>
          </div>
          {/* Overall risk gauge */}
          <div className="flex flex-col items-center">
            <div className={`text-2xl font-bold ${
              overall.level === "critical" ? "text-red-700"
              : overall.level === "high" ? "text-orange-700"
              : overall.level === "moderate" ? "text-amber-700"
              : "text-emerald-700"
            }`}>
              {overall.score}
            </div>
            <div className="text-[9px] text-stone-500 uppercase">Score global</div>
            <Badge className={`mt-1 text-[10px] ${getLevelBadgeClass(overall.level)}`}>
              {overall.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {risks.map((risk) => (
          <RiskCard key={risk.id} risk={risk} />
        ))}
        {/* Disclaimer */}
        <div className="pt-2 border-t border-stone-200">
          <p className="text-[10px] text-stone-500 italic">
            <ShieldPlus className="h-3 w-3 inline mr-1" />
            Ces prévisions sont indicatives et basées sur l'analyse nutritionnelle de la ration.
            Elles ne remplacent pas l'avis d'un vétérinaire. En cas de doute, consultez un professionnel.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskCard({ risk }: { risk: HealthRisk }) {
  if (risk.score === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-2.5 opacity-70">
        <div className="flex items-center gap-2">
          <span className="text-lg">{risk.icon}</span>
          <div className="flex-1">
            <span className="text-xs font-medium text-stone-700">{risk.name}</span>
            <span className="text-[10px] text-stone-500 block">{risk.probability}</span>
          </div>
          <CheckCircle2 className="h-4 w-4 text-stone-400" />
        </div>
      </div>
    );
  }

  const levelConfig = getLevelConfig(risk.level);

  return (
    <div className={`rounded-lg border p-3 ${levelConfig.border} ${levelConfig.bg}`}>
      {/* Header */}
      <div className="flex items-start gap-2 mb-1.5">
        <span className="text-lg flex-shrink-0">{risk.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-stone-900">{risk.name}</span>
            <Badge className={`text-[9px] ${levelConfig.badge}`}>
              {risk.level === "critical" && <AlertOctagon className="h-2.5 w-2.5 mr-0.5" />}
              {risk.level === "high" && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
              {risk.label}
            </Badge>
            <span className="text-[10px] text-stone-500 tabular-nums">
              Score: {risk.score}/100
            </span>
          </div>
          <p className="text-[11px] text-stone-600 mt-0.5">{risk.probability}</p>
        </div>
        {/* Risk gauge */}
        <div className="flex-shrink-0">
          <div className="w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${levelConfig.bar}`}
              style={{ width: `${risk.score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-stone-700 mb-1.5 leading-relaxed">{risk.description}</p>

      {/* Causes */}
      {risk.causes.length > 0 && (
        <div className="mb-1.5">
          <span className="text-[10px] font-medium text-stone-600 uppercase">Facteurs de risque détectés:</span>
          <ul className="text-[11px] text-stone-700 mt-0.5 space-y-0.5">
            {risk.causes.map((cause, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-stone-400 mt-0.5">•</span>
                <span>{cause}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      <div className={`rounded p-2 ${levelConfig.recoBg} mt-2`}>
        <span className="text-[10px] font-medium text-stone-700 uppercase flex items-center gap-1 mb-1">
          <ShieldPlus className="h-3 w-3" />
          Recommandations:
        </span>
        <ul className="text-[11px] text-stone-700 space-y-0.5">
          {risk.recommendations.map((reco, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className={levelConfig.bullet}>→</span>
              <span>{reco}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function getLevelConfig(level: RiskLevel) {
  switch (level) {
    case "critical":
      return {
        border: "border-red-300",
        bg: "bg-red-50/60",
        badge: "bg-red-600 text-white",
        bar: "bg-red-600",
        recoBg: "bg-red-100",
        bullet: "text-red-600",
      };
    case "high":
      return {
        border: "border-orange-300",
        bg: "bg-orange-50/60",
        badge: "bg-orange-500 text-white",
        bar: "bg-orange-500",
        recoBg: "bg-orange-100",
        bullet: "text-orange-600",
      };
    case "moderate":
      return {
        border: "border-amber-300",
        bg: "bg-amber-50/60",
        badge: "bg-amber-200 text-amber-900",
        bar: "bg-amber-500",
        recoBg: "bg-amber-100",
        bullet: "text-amber-700",
      };
    default:
      return {
        border: "border-emerald-300",
        bg: "bg-emerald-50/60",
        badge: "bg-emerald-200 text-emerald-900",
        bar: "bg-emerald-500",
        recoBg: "bg-emerald-100",
        bullet: "text-emerald-700",
      };
  }
}

function getLevelBadgeClass(level: RiskLevel): string {
  return getLevelConfig(level).badge;
}
