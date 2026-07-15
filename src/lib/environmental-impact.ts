// Environmental Impact Engine for OvinFormulation
// Calculates methane (CH4), nitrogen excretion, and CO2 equivalent for sheep rations
// References: INRA 2018, IPCC 2019, Sauvant et al. 2011

export type FeedEnvironmentalData = {
  name: string;
  msKg: number;
  proteinPct: number | null; // MAT %
  ndfPct: number | null;     // NDF %
  starchPct: number | null;  // starch %
  fatPct: number | null;     // ether extract %
  ufl: number | null;
};

export type EnvironmentalImpact = {
  // Methane
  methaneLiters: number;     // L CH4 / day
  methaneGrams: number;      // g CH4 / day (1 L CH4 ≈ 0.717 g)
  methanePerKgMS: number;    // L CH4 / kg MS ingested
  // Nitrogen
  nitrogenIntake: number;    // g N / day (from protein)
  nitrogenExcreted: number;  // g N / day (intake - retained)
  nitrogenRetentionRate: number; // % of N retained (depends on animal stage)
  // CO2 equivalent
  co2FromMethane: number;    // kg CO2e / day (CH4 × GWP100=28)
  co2FromManure: number;     // kg CO2e / day (N2O from manure)
  co2Total: number;          // kg CO2e / day total
  co2PerKgMS: number;        // kg CO2e / kg MS
  co2PerUFL: number;         // kg CO2e / UFL
  // Energy loss from methane
  energyLossPct: number;     // % of gross energy lost as CH4
};

// Methane conversion factor (Ym) — fraction of gross energy converted to CH4
// IPCC 2019: Sheep Ym = 6.5% ± 1.0 for forage-based, lower for concentrate
// INRA 2018: More refined based on feed composition
function estimateYm(feeds: FeedEnvironmentalData[]): number {
  const totalMS = feeds.reduce((s, f) => s + f.msKg, 0);
  if (totalMS === 0) return 6.5;

  const avgNDF = feeds.reduce((s, f) => s + (f.ndfPct || 0) * f.msKg, 0) / totalMS;
  const avgStarch = feeds.reduce((s, f) => s + (f.starchPct || 0) * f.msKg, 0) / totalMS;

  // Higher NDF = higher Ym (more fibrous = more methane)
  // Higher starch = lower Ym (more starch = less methane, different fermentation pathway)
  let ym = 6.5 + (avgNDF - 40) * 0.04 - (avgStarch - 20) * 0.03;
  return Math.max(3.0, Math.min(9.0, ym));
}

// Gross energy of feed (kcal/kg MS) — approximate
// Average: ~4400 kcal/kg MS for mixed rations
function estimateGrossEnergy(feeds: FeedEnvironmentalData[]): number {
  const totalMS = feeds.reduce((s, f) => s + f.msKg, 0);
  if (totalMS === 0) return 4400;

  // GE = 5.72*CP + 9.5*EE + 4.79*NFE + 4.65*CF (kcal/kg)
  // Simplified: use average based on composition
  const avgProtein = feeds.reduce((s, f) => s + (f.proteinPct || 0) * f.msKg, 0) / totalMS;
  const avgFat = feeds.reduce((s, f) => s + (f.fatPct || 0) * f.msKg, 0) / totalMS;
  const avgNDF = feeds.reduce((s, f) => s + (f.ndfPct || 0) * f.msKg, 0) / totalMS;

  const ge = 5.72 * avgProtein + 9.5 * avgFat + 4.0 * (100 - avgProtein - avgFat - avgNDF) + 4.65 * avgNDF;
  return Math.max(3500, Math.min(5500, ge));
}

// Nitrogen retention rate depends on animal physiological stage
// Reference: INRA 2018
export function getNitrogenRetentionRate(stage: string): number {
  const s = stage.toLowerCase();
  if (s.includes("croissance") || s.includes("engrais")) return 0.30; // growing animals retain 30%
  if (s.includes("allaitante") || s.includes("lactation")) return 0.25; // lactating retain 25% (milk)
  if (s.includes("gestante")) return 0.20; // gestating retain 20% (fetus)
  if (s.includes("traite")) return 0.28; // dairy retain 28%
  return 0.22; // default: maintenance
}

export function computeEnvironmentalImpact(
  feeds: FeedEnvironmentalData[],
  animalStage: string
): EnvironmentalImpact {
  const totalMS = feeds.reduce((s, f) => s + f.msKg, 0);
  const totalUFL = feeds.reduce((s, f) => s + (f.ufl || 0) * f.msKg, 0);

  if (totalMS === 0) {
    return {
      methaneLiters: 0, methaneGrams: 0, methanePerKgMS: 0,
      nitrogenIntake: 0, nitrogenExcreted: 0, nitrogenRetentionRate: 0,
      co2FromMethane: 0, co2FromManure: 0, co2Total: 0,
      co2PerKgMS: 0, co2PerUFL: 0, energyLossPct: 0,
    };
  }

  // ----- Methane (CH4) -----
  const ym = estimateYm(feeds); // % of gross energy as CH4
  const ge = estimateGrossEnergy(feeds); // kcal/kg MS
  const totalGE = ge * totalMS; // kcal/day
  // CH4 energy = Ym% × GE
  const ch4Energy = (ym / 100) * totalGE; // kcal/day
  // 1 L CH4 = 9.45 kcal (gross energy of methane)
  const methaneLiters = ch4Energy / 9.45; // L CH4 / day
  const methaneGrams = methaneLiters * 0.717; // g CH4 / day (density 0.717 g/L at STP)
  const methanePerKgMS = methaneLiters / totalMS;

  // ----- Nitrogen -----
  // N intake = sum(protein% × MS) / 6.25 (protein = N × 6.25)
  const nitrogenIntake = feeds.reduce((s, f) => s + ((f.proteinPct || 0) * f.msKg * 10 / 6.25), 0); // g N/day
  const retentionRate = getNitrogenRetentionRate(animalStage);
  const nitrogenRetained = nitrogenIntake * retentionRate;
  const nitrogenExcreted = nitrogenIntake - nitrogenRetained;

  // ----- CO2 equivalent -----
  // CH4 → CO2e: GWP100 = 28 (IPCC AR5)
  // 1 g CH4 = 0.028 kg CO2e
  const co2FromMethane = methaneGrams * 0.028; // kg CO2e/day

  // N2O from manure: ~1% of excreted N is emitted as N2O-N
  // N2O = N_excreted × 0.01 × (44/28) = N_excreted × 0.0157 g N2O
  // GWP100 N2O = 265
  const n2oGrams = nitrogenExcreted * 0.01 * (44 / 28); // g N2O/day
  const co2FromManure = n2oGrams * 0.001 * 265; // kg CO2e/day (g → kg × GWP)

  const co2Total = co2FromMethane + co2FromManure;
  const co2PerKgMS = co2Total / totalMS;
  const co2PerUFL = totalUFL > 0 ? co2Total / totalUFL : 0;

  // Energy loss as % of GE
  const energyLossPct = ym;

  return {
    methaneLiters,
    methaneGrams,
    methanePerKgMS,
    nitrogenIntake,
    nitrogenExcreted,
    nitrogenRetentionRate: retentionRate * 100,
    co2FromMethane,
    co2FromManure,
    co2Total,
    co2PerKgMS,
    co2PerUFL,
    energyLossPct,
  };
}

// Environmental impact level assessment
export type ImpactLevel = "low" | "moderate" | "high" | "very_high";

export function assessImpact(co2PerUFL: number): { level: ImpactLevel; color: string; label: string } {
  if (co2PerUFL < 0.15) return { level: "low", color: "text-emerald-700", label: "Faible impact" };
  if (co2PerUFL < 0.25) return { level: "moderate", color: "text-amber-700", label: "Impact modéré" };
  if (co2PerUFL < 0.35) return { level: "high", color: "text-orange-700", label: "Impact élevé" };
  return { level: "very_high", color: "text-red-700", label: "Impact très élevé" };
}

// Health risk score (simplified from health-risks.ts)
export function estimateHealthRiskScore(
  foragePct: number,
  concentratePct: number,
  derm: number,
  caPRatio: number,
  rmic: number
): number {
  let score = 0;
  // Acidosis risk
  if (concentratePct > 60) score += 40;
  else if (concentratePct > 45) score += 20;
  else if (concentratePct > 30) score += 10;

  if (foragePct < 30) score += 25;
  else if (foragePct < 50) score += 10;

  if (derm > 0.95) score += 20;
  else if (derm > 0.85) score += 10;

  // Ca/P risk
  if (caPRatio < 0.8 || caPRatio > 2.5) score += 20;
  else if (caPRatio < 1.0 || caPRatio > 2.0) score += 10;

  // RMIC risk
  if (rmic < -12) score += 15;
  else if (rmic < -6) score += 8;

  return Math.min(100, score);
}
