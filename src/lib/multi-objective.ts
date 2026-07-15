// Multi-Objective Optimization Engine for OvinFormulation
// Uses weighted sum method to combine multiple objectives into a single LP problem
// Generates Pareto frontier by varying weights

import { solveLP, type LPProblem, type LPConstraint, type LPSolution } from "./lp-solver";
import {
  computeEnvironmentalImpact,
  estimateHealthRiskScore,
  type FeedEnvironmentalData,
} from "./environmental-impact";

export type OptimizationObjective = {
  id: "cost" | "methane" | "nitrogen" | "co2" | "health";
  label: string;
  description: string;
  unit: string;
  // Whether to minimize (true) or maximize (false)
  minimize: boolean;
};

export const OBJECTIVES: OptimizationObjective[] = [
  { id: "cost", label: "Coût", description: "Coût de la ration (€/animal/jour)", unit: "€/jour", minimize: true },
  { id: "methane", label: "Méthane", description: "Émissions de méthane (L CH4/jour)", unit: "L/jour", minimize: true },
  { id: "nitrogen", label: "Azote excrété", description: "Excrétion d'azote (g N/jour)", unit: "g/jour", minimize: true },
  { id: "co2", label: "CO2 équivalent", description: "Total CO2e (kg/jour)", unit: "kg/jour", minimize: true },
  { id: "health", label: "Risque sanitaire", description: "Score de risque santé (0-100)", unit: "/100", minimize: true },
];

export type MultiObjectiveConfig = {
  weights: Record<string, number>; // e.g. { cost: 0.5, methane: 0.3, health: 0.2 }
  // Normalization ranges (for weighted sum — objectives must be on same scale)
  // If not provided, will be auto-estimated
  normalize?: Record<string, { min: number; max: number }>;
};

export type ParetoPoint = {
  weights: Record<string, number>;
  variables: number[];
  // Actual objective values at this Pareto point
  values: Record<string, number>;
  // Computed ration metrics
  metrics: {
    totalMS: number;
    totalUFL: number;
    totalPDI: number;
    totalPabs: number;
    totalCaabs: number;
    totalCost: number;
    coverageUFL: number;
    coveragePDI: number;
    foragePct: number;
    concentratePct: number;
    derm: number;
    caPRatio: number;
    rmic: number;
  };
  // Environmental metrics
  environmental: {
    methaneLiters: number;
    nitrogenExcreted: number;
    co2Total: number;
    co2PerUFL: number;
  };
  // Health risk score
  healthScore: number;
};

export type FeedCandidate = {
  name: string;
  msPct: number | null;
  ufl: number | null;
  pdin: number | null;
  pdie: number | null;
  pabs: number | null;
  caabs: number | null;
  price: number | null;
  proteinPct: number | null;
  ndfPct: number | null;
  starchPct: number | null;
  fatPct: number | null;
  uem: number | null;
  minKg: number;
  maxKg: number;
  enabled: boolean;
};

export type AnimalNeeds = {
  UEM: number | null;
  UFL: number | null;
  PDI: number | null;
  Pabs: number | null;
  Caabs: number | null;
  stage: string;
};

// ---------- Build single-objective LP problem ----------
function buildLPProblem(
  feeds: FeedCandidate[],
  needs: AnimalNeeds,
  tolerance: number,
  // Objective coefficients: cost per kg MS for each feed
  objectiveCoeffs: number[],
  extraConstraints?: LPConstraint[]
): LPProblem {
  const enabledFeeds = feeds.filter((f) => f.enabled);
  const n = enabledFeeds.length;

  const constraints: LPConstraint[] = [];

  // Nutritional constraints (>= needs × (1 - tol))
  if (needs.UFL !== null) {
    constraints.push({
      coeffs: enabledFeeds.map((f) => f.ufl || 0),
      op: ">=",
      rhs: needs.UFL * (1 - tolerance / 100),
    });
  }
  if (needs.PDI !== null) {
    constraints.push({
      coeffs: enabledFeeds.map((f) => f.pdin || 0),
      op: ">=",
      rhs: needs.PDI * (1 - tolerance / 100),
    });
    constraints.push({
      coeffs: enabledFeeds.map((f) => f.pdie || 0),
      op: ">=",
      rhs: needs.PDI * (1 - tolerance / 100),
    });
  }
  if (needs.Pabs !== null) {
    constraints.push({
      coeffs: enabledFeeds.map((f) => f.pabs || 0),
      op: ">=",
      rhs: needs.Pabs * (1 - tolerance / 100),
    });
  }
  if (needs.Caabs !== null) {
    constraints.push({
      coeffs: enabledFeeds.map((f) => f.caabs || 0),
      op: ">=",
      rhs: needs.Caabs * (1 - tolerance / 100),
    });
  }
  // Ingestion capacity: total MS <= UEM
  if (needs.UEM !== null) {
    constraints.push({
      coeffs: enabledFeeds.map(() => 1),
      op: "<=",
      rhs: needs.UEM,
    });
  }

  if (extraConstraints) constraints.push(...extraConstraints);

  return {
    objective: objectiveCoeffs,
    constraints,
    varLowerBounds: enabledFeeds.map((f) => f.minKg),
    varUpperBounds: enabledFeeds.map((f) => f.maxKg),
    varLabels: enabledFeeds.map((f) => f.name),
  };
}

// ---------- Compute ration metrics from solution ----------
function computeMetrics(
  variables: number[],
  feeds: FeedCandidate[],
  needs: AnimalNeeds
): ParetoPoint["metrics"] {
  const enabledFeeds = feeds.filter((f) => f.enabled);
  let totalMS = 0, totalUFL = 0, totalPDIN = 0, totalPDIE = 0, totalPabs = 0, totalCaabs = 0, totalCost = 0;
  let forageMS = 0, concentrateMS = 0;

  enabledFeeds.forEach((f, i) => {
    const kgMS = variables[i] || 0;
    const msPct = f.msPct;
    const kgBrut = msPct && msPct > 0 ? kgMS * 100 / msPct : kgMS;
    totalMS += kgMS;
    totalUFL += (f.ufl || 0) * kgMS;
    totalPDIN += (f.pdin || 0) * kgMS;
    totalPDIE += (f.pdie || 0) * kgMS;
    totalPabs += (f.pabs || 0) * kgMS;
    totalCaabs += (f.caabs || 0) * kgMS;
    totalCost += (f.price || 0) * kgBrut;
    // Estimate forage vs concentrate
    if (f.uem !== null && f.uem > 0) forageMS += kgMS;
    else concentrateMS += kgMS;
  });

  const coverageUFL = needs.UFL && needs.UFL > 0 ? (totalUFL / needs.UFL) * 100 : 0;
  const coveragePDI = needs.PDI && needs.PDI > 0 ? (Math.min(totalPDIN, totalPDIE) / needs.PDI) * 100 : 0;
  const foragePct = totalMS > 0 ? (forageMS / totalMS) * 100 : 0;
  const concentratePct = totalMS > 0 ? (concentrateMS / totalMS) * 100 : 0;
  const derm = totalMS > 0 ? totalUFL / totalMS : 0; // simplified
  const caPRatio = totalPabs > 0 ? totalCaabs / totalPabs : 0;
  const rmic = totalUFL > 0 ? (totalPDIN - totalPDIE) / totalUFL : 0;

  return {
    totalMS, totalUFL, totalPDI: Math.min(totalPDIN, totalPDIE),
    totalPabs, totalCaabs, totalCost,
    coverageUFL, coveragePDI, foragePct, concentratePct, derm, caPRatio, rmic,
  };
}

// ---------- Compute environmental impact from solution ----------
function computeEnv(
  variables: number[],
  feeds: FeedCandidate[],
  needs: AnimalNeeds
): ParetoPoint["environmental"] & { healthScore: number } {
  const enabledFeeds = feeds.filter((f) => f.enabled);
  const envFeeds: FeedEnvironmentalData[] = enabledFeeds.map((f, i) => ({
    name: f.name,
    msKg: variables[i] || 0,
    proteinPct: f.proteinPct,
    ndfPct: f.ndfPct,
    starchPct: f.starchPct,
    fatPct: f.fatPct,
    ufl: f.ufl,
  }));

  const impact = computeEnvironmentalImpact(envFeeds, needs.stage);
  const metrics = computeMetrics(variables, feeds, needs);
  const healthScore = estimateHealthRiskScore(
    metrics.foragePct,
    metrics.concentratePct,
    metrics.derm,
    metrics.caPRatio,
    metrics.rmic
  );

  return {
    methaneLiters: impact.methaneLiters,
    nitrogenExcreted: impact.nitrogenExcreted,
    co2Total: impact.co2Total,
    co2PerUFL: impact.co2PerUFL,
    healthScore,
  };
}

// ---------- Estimate feed composition parameters (if not available) ----------
function estimateFeedParams(feed: FeedCandidate): FeedCandidate {
  // If proteinPct is missing, estimate from PDIN (rough: PDIN ≈ MAT × 6-10)
  let proteinPct = feed.proteinPct;
  if (proteinPct === null && feed.pdin !== null) {
    proteinPct = feed.pdin > 150 ? feed.pdin / 12 : feed.pdin / 6;
  }
  // If NDF missing, estimate from UEM (forages have UEM)
  let ndfPct = feed.ndfPct;
  if (ndfPct === null) {
    if (feed.uem !== null && feed.uem > 0) {
      ndfPct = feed.uem * 35; // rough: UEM 1.2 ≈ NDF 42%
    } else {
      ndfPct = 15; // concentrate default
    }
  }
  // If starch missing, estimate from UFL (high UFL = likely high starch)
  let starchPct = feed.starchPct;
  if (starchPct === null) {
    if (feed.ufl !== null && feed.ufl > 0.9) starchPct = 50;
    else if (feed.uem !== null && feed.uem > 0) starchPct = 5; // forage
    else starchPct = 20;
  }
  // Fat: default 2.5% if missing
  let fatPct = feed.fatPct;
  if (fatPct === null) fatPct = 2.5;

  return { ...feed, proteinPct, ndfPct, starchPct, fatPct };
}

// ---------- Single-objective optimization ----------
export function optimizeSingleObjective(
  feeds: FeedCandidate[],
  needs: AnimalNeeds,
  tolerance: number,
  objective: "cost" | "methane" | "nitrogen" | "co2" | "health"
): ParetoPoint | null {
  const enrichedFeeds = feeds.map(estimateFeedParams);
  const enabledFeeds = enrichedFeeds.filter((f) => f.enabled);

  if (enabledFeeds.length === 0) return null;

  // Build objective coefficients per objective
  let objectiveCoeffs: number[];
  switch (objective) {
    case "cost":
      // Cost per kg MS = price per kg brut × (100 / MS%)
      objectiveCoeffs = enabledFeeds.map((f) => {
        const msPct = f.msPct;
        return msPct && msPct > 0 ? (f.price || 0) * 100 / msPct : (f.price || 0);
      });
      break;
    case "methane":
      // Methane per kg MS ≈ f(NDF, starch). Higher NDF = more methane.
      // Coefficient: NDF% × 0.03 - starch% × 0.01 (L CH4 per kg MS)
      objectiveCoeffs = enabledFeeds.map((f) => {
        const ndf = f.ndfPct || 0;
        const starch = f.starchPct || 0;
        return Math.max(0, ndf * 0.03 - starch * 0.01 + 0.3);
      });
      break;
    case "nitrogen":
      // N excretion per kg MS ≈ protein% / 6.25 × 0.7 (70% excreted on average)
      objectiveCoeffs = enabledFeeds.map((f) => {
        const protein = f.proteinPct || 0;
        return protein * 10 / 6.25 * 0.7;
      });
      break;
    case "co2":
      // CO2 per kg MS ≈ methane component + N component
      // Rough: 0.02 kg CO2e per kg MS base + NDF/starch/protein adjustments
      objectiveCoeffs = enabledFeeds.map((f) => {
        const ndf = f.ndfPct || 0;
        const starch = f.starchPct || 0;
        const protein = f.proteinPct || 0;
        const ch4Component = Math.max(0, ndf * 0.03 - starch * 0.01 + 0.3) * 0.717 * 0.028;
        const nComponent = protein * 10 / 6.25 * 0.7 * 0.01 * (44 / 28) * 0.001 * 265;
        return ch4Component + nComponent;
      });
      break;
    case "health":
      // Health risk proxy: high concentrate = high risk
      // Penalize concentrates (no UEM) more than forages
      objectiveCoeffs = enabledFeeds.map((f) => {
        let risk = 0;
        if (f.uem === null || f.uem === 0) risk += 5; // concentrate
        if (f.starchPct && f.starchPct > 40) risk += 3;
        if (f.proteinPct && f.proteinPct > 30) risk += 2;
        return risk;
      });
      break;
  }

  const problem = buildLPProblem(enrichedFeeds, needs, tolerance, objectiveCoeffs);
  const solution = solveLP(problem);

  if (solution.status !== "optimal") return null;

  const metrics = computeMetrics(solution.variables, enrichedFeeds, needs);
  const env = computeEnv(solution.variables, enrichedFeeds, needs);

  const values: Record<string, number> = {
    cost: metrics.totalCost,
    methane: env.methaneLiters,
    nitrogen: env.nitrogenExcreted,
    co2: env.co2Total,
    health: env.healthScore,
  };

  return {
    weights: { [objective]: 1 },
    variables: solution.variables,
    values,
    metrics,
    environmental: {
      methaneLiters: env.methaneLiters,
      nitrogenExcreted: env.nitrogenExcreted,
      co2Total: env.co2Total,
      co2PerUFL: env.co2PerUFL,
    },
    healthScore: env.healthScore,
  };
}

// ---------- Multi-objective optimization (weighted sum) ----------
export function optimizeMultiObjective(
  feeds: FeedCandidate[],
  needs: AnimalNeeds,
  tolerance: number,
  config: MultiObjectiveConfig
): ParetoPoint | null {
  const enrichedFeeds = feeds.map(estimateFeedParams);
  const enabledFeeds = enrichedFeeds.filter((f) => f.enabled);

  if (enabledFeeds.length === 0) return null;

  // First, find the range of each objective by optimizing each independently
  const objectives: Array<keyof typeof config.weights> = ["cost", "methane", "nitrogen", "co2", "health"];
  const ranges: Record<string, { min: number; max: number }> = config.normalize || {};

  if (!config.normalize) {
    for (const obj of objectives) {
      if (!config.weights[obj]) continue;
      const single = optimizeSingleObjective(feeds, needs, tolerance, obj as any);
      if (single) {
        ranges[obj] = { min: single.values[obj], max: single.values[obj] * 2 }; // rough estimate
      }
    }
    // Refine by finding the "worst" for each objective
    for (const obj of objectives) {
      if (!config.weights[obj]) continue;
      // Optimize for a different objective to find the "worst" value
      for (const other of objectives) {
        if (other === obj || !config.weights[other]) continue;
        const otherSolution = optimizeSingleObjective(feeds, needs, tolerance, other as any);
        if (otherSolution) {
          if (!ranges[obj]) ranges[obj] = { min: otherSolution.values[obj], max: otherSolution.values[obj] };
          ranges[obj].max = Math.max(ranges[obj].max, otherSolution.values[obj]);
          ranges[obj].min = Math.min(ranges[obj].min, otherSolution.values[obj]);
        }
      }
    }
  }

  // Build combined objective coefficients (normalized weighted sum)
  const objectiveCoeffs = enabledFeeds.map((f, i) => {
    let combined = 0;
    const msPct = f.msPct;
    const kgBrutPerKgMS = msPct && msPct > 0 ? 100 / msPct : 1;

    if (config.weights.cost) {
      const costPerKgMS = (f.price || 0) * kgBrutPerKgMS;
      const range = ranges.cost || { min: 0, max: 1 };
      const normalized = range.max > range.min ? (costPerKgMS - range.min) / (range.max - range.min) : 0;
      combined += config.weights.cost * normalized;
    }
    if (config.weights.methane) {
      const ndf = f.ndfPct || 0;
      const starch = f.starchPct || 0;
      const methanePerKgMS = Math.max(0, ndf * 0.03 - starch * 0.01 + 0.3);
      const range = ranges.methane || { min: 0, max: 1 };
      const normalized = range.max > range.min ? (methanePerKgMS - range.min) / (range.max - range.min) : 0;
      combined += config.weights.methane * normalized;
    }
    if (config.weights.nitrogen) {
      const protein = f.proteinPct || 0;
      const nPerKgMS = protein * 10 / 6.25 * 0.7;
      const range = ranges.nitrogen || { min: 0, max: 1 };
      const normalized = range.max > range.min ? (nPerKgMS - range.min) / (range.max - range.min) : 0;
      combined += config.weights.nitrogen * normalized;
    }
    if (config.weights.co2) {
      const ndf = f.ndfPct || 0;
      const starch = f.starchPct || 0;
      const protein = f.proteinPct || 0;
      const ch4Comp = Math.max(0, ndf * 0.03 - starch * 0.01 + 0.3) * 0.717 * 0.028;
      const nComp = protein * 10 / 6.25 * 0.7 * 0.01 * (44 / 28) * 0.001 * 265;
      const co2PerKgMS = ch4Comp + nComp;
      const range = ranges.co2 || { min: 0, max: 1 };
      const normalized = range.max > range.min ? (co2PerKgMS - range.min) / (range.max - range.min) : 0;
      combined += config.weights.co2 * normalized;
    }
    if (config.weights.health) {
      let risk = 0;
      if (f.uem === null || f.uem === 0) risk += 5;
      if (f.starchPct && f.starchPct > 40) risk += 3;
      if (f.proteinPct && f.proteinPct > 30) risk += 2;
      const range = ranges.health || { min: 0, max: 10 };
      const normalized = range.max > range.min ? (risk - range.min) / (range.max - range.min) : 0;
      combined += config.weights.health * normalized;
    }

    return combined;
  });

  const problem = buildLPProblem(enrichedFeeds, needs, tolerance, objectiveCoeffs);
  const solution = solveLP(problem);

  if (solution.status !== "optimal") return null;

  const metrics = computeMetrics(solution.variables, enrichedFeeds, needs);
  const env = computeEnv(solution.variables, enrichedFeeds, needs);

  const values: Record<string, number> = {
    cost: metrics.totalCost,
    methane: env.methaneLiters,
    nitrogen: env.nitrogenExcreted,
    co2: env.co2Total,
    health: env.healthScore,
  };

  return {
    weights: { ...config.weights },
    variables: solution.variables,
    values,
    metrics,
    environmental: {
      methaneLiters: env.methaneLiters,
      nitrogenExcreted: env.nitrogenExcreted,
      co2Total: env.co2Total,
      co2PerUFL: env.co2PerUFL,
    },
    healthScore: env.healthScore,
  };
}

// ---------- Generate Pareto frontier ----------
export function generateParetoFrontier(
  feeds: FeedCandidate[],
  needs: AnimalNeeds,
  tolerance: number,
  objectives: Array<"cost" | "methane" | "nitrogen" | "co2" | "health">,
  numPoints: number = 11
): ParetoPoint[] {
  const points: ParetoPoint[] = [];

  if (objectives.length < 2) return points;

  // For 2 objectives: vary weight from 0 to 1 in numPoints steps
  if (objectives.length === 2) {
    for (let i = 0; i <= numPoints; i++) {
      const w1 = i / numPoints;
      const w2 = 1 - w1;
      const config: MultiObjectiveConfig = {
        weights: { [objectives[0]]: w1, [objectives[1]]: w2 },
      };
      const point = optimizeMultiObjective(feeds, needs, tolerance, config);
      if (point) points.push(point);
    }
  } else {
    // For 3+ objectives: use simplex lattice design
    // Generate all combinations where weights sum to 1 with step 1/numPoints
    const step = 1 / numPoints;
    const generate = (remaining: number, idx: number, weights: number[]) => {
      if (idx === objectives.length - 1) {
        weights.push(remaining);
        const config: MultiObjectiveConfig = {
          weights: objectives.reduce((acc, obj, i) => ({ ...acc, [obj]: weights[i] }), {}),
        };
        const point = optimizeMultiObjective(feeds, needs, tolerance, config);
        if (point) points.push(point);
        weights.pop();
        return;
      }
      for (let w = 0; w <= remaining + 1e-9; w += step) {
        weights.push(w);
        generate(remaining - w, idx + 1, weights);
        weights.pop();
      }
    };
    generate(1, 0, []);
  }

  return points;
}

// ---------- Sensitivity Analysis ----------
export type SensitivityResult = {
  feedName: string;
  basePrice: number;
  scenarios: Array<{
    priceChange: number; // % change
    newPrice: number;
    optimalCost: number | null;
    variables: number[] | null;
    stillUsesFeed: boolean;
    feedQuantity: number;
  }>;
};

export function runSensitivityAnalysis(
  feeds: FeedCandidate[],
  needs: AnimalNeeds,
  tolerance: number,
  priceChanges: number[] = [-20, -10, 0, 10, 20, 30]
): SensitivityResult[] {
  const enabledFeeds = feeds.filter((f) => f.enabled);
  const results: SensitivityResult[] = [];

  // First, find baseline solution to know which feeds are used
  const baseline = optimizeSingleObjective(feeds, needs, tolerance, "cost");

  for (const feed of enabledFeeds) {
    const scenarios = priceChanges.map((change) => {
      const newPrice = (feed.price || 0) * (1 + change / 100);
      const modifiedFeeds = feeds.map((f) =>
        f.name === feed.name ? { ...f, price: newPrice } : f
      );
      const result = optimizeSingleObjective(modifiedFeeds, needs, tolerance, "cost");
      if (!result) {
        return {
          priceChange: change,
          newPrice,
          optimalCost: null,
          variables: null,
          stillUsesFeed: false,
          feedQuantity: 0,
        };
      }
      // Check if this feed is still in the solution
      const feedIdx = modifiedFeeds.filter((f) => f.enabled).findIndex((f) => f.name === feed.name);
      const feedQty = feedIdx >= 0 ? result.variables[feedIdx] || 0 : 0;
      return {
        priceChange: change,
        newPrice,
        optimalCost: result.metrics.totalCost,
        variables: result.variables,
        stillUsesFeed: feedQty > 0.01,
        feedQuantity: feedQty,
      };
    });

    results.push({
      feedName: feed.name,
      basePrice: feed.price || 0,
      scenarios,
    });
  }

  return results;
}

// ---------- Constraint Relaxation Analysis ----------
export type RelaxationResult = {
  tolerance: number;
  optimalCost: number | null;
  costSavings: number; // vs baseline (tolerance=0)
  savingsPct: number;
  coverageUFL: number;
  coveragePDI: number;
  coveragePabs: number;
  coverageCaabs: number;
};

export function runConstraintRelaxation(
  feeds: FeedCandidate[],
  needs: AnimalNeeds,
  tolerances: number[] = [0, 2, 5, 8, 10, 15, 20]
): RelaxationResult[] {
  const results: RelaxationResult[] = [];
  const baseline = optimizeSingleObjective(feeds, needs, 0, "cost");
  const baselineCost = baseline?.metrics.totalCost || 0;

  for (const tol of tolerances) {
    const result = optimizeSingleObjective(feeds, needs, tol, "cost");
    if (result) {
      const savings = baselineCost - result.metrics.totalCost;
      const savingsPct = baselineCost > 0 ? (savings / baselineCost) * 100 : 0;
      results.push({
        tolerance: tol,
        optimalCost: result.metrics.totalCost,
        costSavings: savings,
        savingsPct,
        coverageUFL: result.metrics.coverageUFL,
        coveragePDI: result.metrics.coveragePDI,
        coveragePabs: needs.Pabs ? (result.metrics.totalPabs / needs.Pabs) * 100 : 0,
        coverageCaabs: needs.Caabs ? (result.metrics.totalCaabs / needs.Caabs) * 100 : 0,
      });
    } else {
      results.push({
        tolerance: tol,
        optimalCost: null,
        costSavings: 0,
        savingsPct: 0,
        coverageUFL: 0,
        coveragePDI: 0,
        coveragePabs: 0,
        coverageCaabs: 0,
      });
    }
  }

  return results;
}
