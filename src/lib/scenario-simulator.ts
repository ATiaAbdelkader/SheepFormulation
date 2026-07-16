// Scenario Simulation Engine
// Compares rations, simulates flock transitions, computes annual savings

import { num, fmt } from "./alim-data";
import { assessAllHealthRisks, getOverallRiskScore, type RationContext } from "./health-risks";

export type ComputedRation = {
  name: string;
  animalCategory: string;
  totalMS: number;
  totalUFL: number;
  totalPDI: number;
  totalPDIN: number;
  totalPDIE: number;
  totalPabs: number;
  totalCaabs: number;
  totalCost: number;
  costPerUFL: number | null;
  derm: number | null;
  rmic: number | null;
  caPRatio: number | null;
  needs: { UEM: number | null; UFL: number | null; PDI: number | null; Pabs: number | null; Caabs: number | null };
  coverage: { UFL: number | null; PDI: number | null; Pabs: number | null; Caabs: number | null };
  feedCount: number;
};

export type ScenarioResult = {
  // Input
  flockSize: number;
  switchPct: number; // % of flock switching to new ration
  feedingDays: number;
  // Rations
  currentRation: ComputedRation;
  newRation: ComputedRation;
  // Per animal
  costDiffPerAnimalPerDay: number;
  // Flock level
  animalsSwitched: number;
  animalsUnchanged: number;
  // Costs
  currentDailyCost: number;
  newDailyCost: number;
  dailySavings: number;
  annualSavings: number;
  periodSavings: number;
  // Nutrition impact
  uflDiff: number;
  pdiDiff: number;
  coverageDiff: { UFL: number; PDI: number; Pabs: number; Caabs: number };
  // Risk
  currentRiskScore: number;
  newRiskScore: number;
  riskImprovement: number;
  // Recommendation
  recommendation: string;
  recommendationLevel: "positive" | "neutral" | "negative";
};

export function simulateScenario(
  currentRation: ComputedRation,
  newRation: ComputedRation,
  flockSize: number,
  switchPct: number,
  feedingDays: number
): ScenarioResult {
  const animalsSwitched = Math.round(flockSize * switchPct / 100);
  const animalsUnchanged = flockSize - animalsSwitched;

  const costDiffPerAnimalPerDay = newRation.totalCost - currentRation.totalCost;

  const currentDailyCost = currentRation.totalCost * flockSize;
  const newDailyCost = (currentRation.totalCost * animalsUnchanged) + (newRation.totalCost * animalsSwitched);
  const dailySavings = currentDailyCost - newDailyCost;
  const annualSavings = dailySavings * 365;
  const periodSavings = dailySavings * feedingDays;

  const uflDiff = newRation.totalUFL - currentRation.totalUFL;
  const pdiDiff = newRation.totalPDI - currentRation.totalPDI;
  const coverageDiff = {
    UFL: (newRation.coverage.UFL ?? 0) - (currentRation.coverage.UFL ?? 0),
    PDI: (newRation.coverage.PDI ?? 0) - (currentRation.coverage.PDI ?? 0),
    Pabs: (newRation.coverage.Pabs ?? 0) - (currentRation.coverage.Pabs ?? 0),
    Caabs: (newRation.coverage.Caabs ?? 0) - (currentRation.coverage.Caabs ?? 0),
  };

  // Risk scores (simplified)
  const currentRiskScore = estimateRiskScore(currentRation);
  const newRiskScore = estimateRiskScore(newRation);
  const riskImprovement = currentRiskScore - newRiskScore;

  // Recommendation
  let recommendation = "";
  let recommendationLevel: "positive" | "neutral" | "negative" = "neutral";

  const costGood = dailySavings > 0;
  const nutritionGood = coverageDiff.UFL >= -5 && coverageDiff.PDI >= -5;
  const riskGood = riskImprovement > 0;

  if (costGood && nutritionGood && riskGood) {
    recommendation = `Excellent changement: économie de ${fmt(periodSavings, 0)}€ sur ${feedingDays}j, nutrition maintenue, risque sanitaire réduit de ${fmt(riskImprovement, 0)} points.`;
    recommendationLevel = "positive";
  } else if (costGood && nutritionGood) {
    recommendation = `Bon changement: économie de ${fmt(periodSavings, 0)}€ sur ${feedingDays}j sans impact nutritionnel négatif.`;
    recommendationLevel = "positive";
  } else if (costGood && !nutritionGood) {
    recommendation = `Économie de ${fmt(periodSavings, 0)}€ mais attention: la couverture nutritionnelle diminue (${coverageDiff.PDI < 0 ? "PDI" : "UFL"} ${fmt(Math.min(coverageDiff.UFL, coverageDiff.PDI), 0)}%).`;
    recommendationLevel = "neutral";
  } else if (!costGood && nutritionGood && riskGood) {
    recommendation = `Coût supplémentaire de ${fmt(Math.abs(periodSavings), 0)}€ sur ${feedingDays}j mais meilleure couverture et risque réduit. Justifié si performances zootechniques améliorées.`;
    recommendationLevel = "neutral";
  } else if (!costGood && !nutritionGood) {
    recommendation = `Déconseillé: coût supérieur de ${fmt(Math.abs(periodSavings), 0)}€ et couverture nutritionnelle réduite.`;
    recommendationLevel = "negative";
  } else {
    recommendation = `Changement neutre: économie de ${fmt(periodSavings, 0)}€ sur ${feedingDays}j avec ajustements nutritionnels mineurs.`;
    recommendationLevel = "neutral";
  }

  return {
    flockSize, switchPct, feedingDays,
    currentRation, newRation,
    costDiffPerAnimalPerDay,
    animalsSwitched, animalsUnchanged,
    currentDailyCost, newDailyCost, dailySavings, annualSavings, periodSavings,
    uflDiff, pdiDiff, coverageDiff,
    currentRiskScore, newRiskScore, riskImprovement,
    recommendation, recommendationLevel,
  };
}

function estimateRiskScore(ration: ComputedRation): number {
  let score = 0;
  // Simplified risk estimation
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

// ---------- Comparison row type ----------
export type ComparisonRow = {
  label: string;
  a: string;
  b: string;
  c?: string;
  diff: string;
  better: "a" | "b" | "c" | "equal" | null;
  betterHint?: string;
};

export function buildComparisonRows(a: ComputedRation, b: ComputedRation, c?: ComputedRation): ComparisonRow[] {
  const rows: ComparisonRow[] = [
    {
      label: "Animal",
      a: a.animalCategory.slice(0, 40),
      b: b.animalCategory.slice(0, 40),
      c: c?.animalCategory.slice(0, 40),
      diff: a.animalCategory === b.animalCategory ? "Identique" : "Différent",
      better: a.animalCategory === b.animalCategory ? "equal" : null,
    },
    {
      label: "Nombre d'aliments",
      a: String(a.feedCount),
      b: String(b.feedCount),
      c: c ? String(c.feedCount) : undefined,
      diff: `${b.feedCount - a.feedCount > 0 ? "+" : ""}${b.feedCount - a.feedCount}`,
      better: null,
    },
    {
      label: "MS totale (kg/j)",
      a: fmt(a.totalMS, 2),
      b: fmt(b.totalMS, 2),
      c: c ? fmt(c.totalMS, 2) : undefined,
      diff: fmt(b.totalMS - a.totalMS, 2),
      better: null,
    },
    {
      label: "UFL fournis",
      a: fmt(a.totalUFL, 2),
      b: fmt(b.totalUFL, 2),
      c: c ? fmt(c.totalUFL, 2) : undefined,
      diff: fmt(b.totalUFL - a.totalUFL, 2),
      better: null,
    },
    {
      label: "PDI fournis (g)",
      a: fmt(a.totalPDI, 0),
      b: fmt(b.totalPDI, 0),
      c: c ? fmt(c.totalPDI, 0) : undefined,
      diff: fmt(b.totalPDI - a.totalPDI, 0),
      better: null,
    },
    {
      label: "Coût / animal / jour (€)",
      a: fmt(a.totalCost, 3),
      b: fmt(b.totalCost, 3),
      c: c ? fmt(c.totalCost, 3) : undefined,
      diff: `${b.totalCost - a.totalCost > 0 ? "+" : ""}${fmt(b.totalCost - a.totalCost, 3)}`,
      better: getBetterCost(a.totalCost, b.totalCost, c?.totalCost),
      betterHint: "moins cher",
    },
    {
      label: "Coût par UFL (€)",
      a: a.costPerUFL !== null ? fmt(a.costPerUFL, 3) : "—",
      b: b.costPerUFL !== null ? fmt(b.costPerUFL, 3) : "—",
      c: c && c.costPerUFL !== null ? fmt(c.costPerUFL, 3) : undefined,
      diff: a.costPerUFL !== null && b.costPerUFL !== null ? fmt(b.costPerUFL - a.costPerUFL, 3) : "—",
      better: getBetterCost(a.costPerUFL, b.costPerUFL, c?.costPerUFL),
      betterHint: "meilleur ratio coût/énergie",
    },
    {
      label: "Couverture UFL (%)",
      a: a.coverage.UFL !== null ? fmt(a.coverage.UFL, 0) + "%" : "—",
      b: b.coverage.UFL !== null ? fmt(b.coverage.UFL, 0) + "%" : "—",
      c: c && c.coverage.UFL !== null ? fmt(c.coverage.UFL, 0) + "%" : undefined,
      diff: a.coverage.UFL !== null && b.coverage.UFL !== null ? fmt(b.coverage.UFL - a.coverage.UFL, 0) + "%" : "—",
      better: null,
    },
    {
      label: "Couverture PDI (%)",
      a: a.coverage.PDI !== null ? fmt(a.coverage.PDI, 0) + "%" : "—",
      b: b.coverage.PDI !== null ? fmt(b.coverage.PDI, 0) + "%" : "—",
      c: c && c.coverage.PDI !== null ? fmt(c.coverage.PDI, 0) + "%" : undefined,
      diff: a.coverage.PDI !== null && b.coverage.PDI !== null ? fmt(b.coverage.PDI - a.coverage.PDI, 0) + "%" : "—",
      better: null,
    },
    {
      label: "RMIC (g PDI/UFL)",
      a: a.rmic !== null ? fmt(a.rmic, 1) : "—",
      b: b.rmic !== null ? fmt(b.rmic, 1) : "—",
      c: c && c.rmic !== null ? fmt(c.rmic, 1) : undefined,
      diff: a.rmic !== null && b.rmic !== null ? fmt(b.rmic - a.rmic, 1) : "—",
      better: null,
    },
    {
      label: "Rapport Ca/P",
      a: a.caPRatio !== null ? fmt(a.caPRatio, 2) : "—",
      b: b.caPRatio !== null ? fmt(b.caPRatio, 2) : "—",
      c: c && c.caPRatio !== null ? fmt(c.caPRatio, 2) : undefined,
      diff: a.caPRatio !== null && b.caPRatio !== null ? fmt(b.caPRatio - a.caPRatio, 2) : "—",
      better: null,
    },
    {
      label: "Risque sanitaire (score)",
      a: fmt(estimateRiskScore(a), 0),
      b: fmt(estimateRiskScore(b), 0),
      c: c ? fmt(estimateRiskScore(c), 0) : undefined,
      diff: fmt(estimateRiskScore(b) - estimateRiskScore(a), 0),
      better: getBetterCost(estimateRiskScore(a), estimateRiskScore(b), c ? estimateRiskScore(c) : null),
      betterHint: "risque plus faible",
    },
  ];

  return rows;
}

function getBetterCost(a: number | null, b: number | null, c?: number | null): "a" | "b" | "c" | "equal" | null {
  if (a === null || b === null) return null;
  if (c !== undefined && c !== null) {
    const min = Math.min(a, b, c);
    if (a === b && b === c) return "equal";
    if (a === min) return "a";
    if (b === min) return "b";
    return "c";
  }
  if (a === b) return "equal";
  return a < b ? "a" : "b";
}
