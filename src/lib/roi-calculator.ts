// ROI Calculator Engine
// Computes financial impact of using OvinFormulation for farmers and feed mills
// Based on industry benchmarks and OvinFormulation's optimization capabilities

export type FarmerROI = {
  // Inputs
  flockSize: number;
  costPerEwePerDay: number; // € current average cost
  improvementPct: number; // % cost reduction from better formulation
  feedingDaysPerYear: number;
  // Computed
  currentAnnualCost: number;
  optimizedAnnualCost: number;
  annualSavings: number;
  monthlySavings: number;
  savingsPerEwe: number;
  // Additional benefits
  healthRiskReduction: number; // % fewer health incidents
  estimatedHealthSavings: number; // € from fewer vet visits, treatments
  totalAnnualBenefit: number; // savings + health
  // ROI ratio
  toolCost: number; // 0 (free)
  roiRatio: number; // total benefit / cost (infinity for free tool)
};

export function computeFarmerROI(params: {
  flockSize: number;
  costPerEwePerDay: number;
  improvementPct: number;
  feedingDaysPerYear: number;
}): FarmerROI {
  const { flockSize, costPerEwePerDay, improvementPct, feedingDaysPerYear } = params;

  const currentAnnualCost = flockSize * costPerEwePerDay * feedingDaysPerYear;
  const costReduction = improvementPct / 100;
  const optimizedAnnualCost = currentAnnualCost * (1 - costReduction);
  const annualSavings = currentAnnualCost - optimizedAnnualCost;
  const monthlySavings = annualSavings / 12;
  const savingsPerEwe = annualSavings / flockSize;

  // Health risk reduction: better formulation reduces acidosis, toxemia, etc.
  // Benchmark: 15-30% reduction in health incidents with balanced rations
  const healthRiskReduction = Math.min(30, improvementPct * 2.5);
  // Average vet cost per ewe per year: ~8-15€ (treatments, visits, mortality)
  const avgVetCostPerEwe = 10;
  const estimatedHealthSavings = flockSize * avgVetCostPerEwe * (healthRiskReduction / 100);

  const totalAnnualBenefit = annualSavings + estimatedHealthSavings;
  const toolCost = 0; // free
  const roiRatio = toolCost > 0 ? totalAnnualBenefit / toolCost : Infinity;

  return {
    flockSize,
    costPerEwePerDay,
    improvementPct,
    feedingDaysPerYear,
    currentAnnualCost,
    optimizedAnnualCost,
    annualSavings,
    monthlySavings,
    savingsPerEwe,
    healthRiskReduction,
    estimatedHealthSavings,
    totalAnnualBenefit,
    toolCost,
    roiRatio,
  };
}

export type FeedMillROI = {
  // Inputs
  annualIngredientSpend: number; // € total ingredient purchases per year
  inventoryValue: number; // € current raw material stock value
  adminHoursPerWeek: number; // hours spent on manual tracking
  formulaImprovementPct: number; // % formula cost improvement
  // Computed — Formula cost
  formulaCostSavings: number;
  // Computed — Working capital
  inventoryReductionPct: number; // % of inventory freed
  workingCapitalFreed: number;
  workingCapitalValue: number; // at 20% carrying cost
  // Computed — Admin time
  adminTimeSaved: number; // hours/year
  adminTimeValue: number; // € at 35€/hour
  // Computed — Quality & risk
  qualityImprovement: number; // % fewer out-of-spec batches
  recallRiskReduction: number; // € estimated value of reduced recall exposure
  // Total
  totalAnnualSavings: number;
  // ROI
  toolCost: number;
  roiRatio: number;
  paybackDays: number; // days to recover tool cost (0 if free)
};

export function computeFeedMillROI(params: {
  annualIngredientSpend: number;
  inventoryValue: number;
  adminHoursPerWeek: number;
  formulaImprovementPct: number;
}): FeedMillROI {
  const { annualIngredientSpend, inventoryValue, adminHoursPerWeek, formulaImprovementPct } = params;

  // 1. Formula cost savings
  const formulaCostSavings = annualIngredientSpend * (formulaImprovementPct / 100);

  // 2. Working capital freed (10% of inventory value freed)
  const inventoryReductionPct = 10;
  const workingCapitalFreed = inventoryValue * (inventoryReductionPct / 100);
  const workingCapitalValue = workingCapitalFreed * 0.20; // 20% annual carrying cost

  // 3. Admin time saved (50% reduction in manual tracking)
  const adminTimeSaved = adminHoursPerWeek * 52 * 0.5; // hours/year
  const adminTimeValue = adminTimeSaved * 35; // €35/hour

  // 4. Quality & risk reduction
  const qualityImprovement = Math.min(25, formulaImprovementPct * 3);
  // Average recall cost for small feed mill: ~5,000€ per incident, ~1 incident every 3 years
  const recallRiskReduction = (qualityImprovement / 100) * (5000 / 3);

  const totalAnnualSavings = formulaCostSavings + workingCapitalValue + adminTimeValue + recallRiskReduction;
  const toolCost = 0; // free (OvinFormulation)
  const roiRatio = toolCost > 0 ? totalAnnualSavings / toolCost : Infinity;
  const paybackDays = toolCost > 0 ? Math.ceil(toolCost / (totalAnnualSavings / 365)) : 0;

  return {
    annualIngredientSpend,
    inventoryValue,
    adminHoursPerWeek,
    formulaImprovementPct,
    formulaCostSavings,
    inventoryReductionPct,
    workingCapitalFreed,
    workingCapitalValue,
    adminTimeSaved,
    adminTimeValue,
    qualityImprovement,
    recallRiskReduction,
    totalAnnualSavings,
    toolCost,
    roiRatio,
    paybackDays,
  };
}

// Formatting helper
export function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M €`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K €`;
  return `${value.toFixed(0)} €`;
}

export function formatHours(hours: number): string {
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}K h`;
  return `${hours.toFixed(0)} h`;
}
