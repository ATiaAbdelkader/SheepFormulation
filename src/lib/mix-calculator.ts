// Advanced Mix Calculator Engine
// Supports 2+ concentrate mixing, least-cost optimization, recipe export
// Uses the existing LP solver for least-cost mode

import { solveLP, type LPProblem } from "./lp-solver";
import { num } from "./alim-data";

export type MixFeed = {
  name: string;
  ufl: number | null;
  pdin: number | null;
  pdie: number | null;
  pabs: number | null;
  caabs: number | null;
  ms_pct: number | null;
  price: number | null;
};

export type MixResult = {
  feeds: Array<{ name: string; proportion: number; kgPerTon: number; costPerTon: number }>;
  totalUFL: number;
  totalPDIN: number;
  totalPDIE: number;
  totalPDI: number;
  totalPabs: number;
  totalCaabs: number;
  totalMS: number;
  costPerKg: number;
  costPerUFL: number;
  caPRatio: number;
  proteinPerUFL: number;
  feasible: boolean;
  message?: string;
};

// ---------- 2-mix solver (existing, enhanced) ----------
export function solve2Mix(
  c1: MixFeed, c2: MixFeed,
  targetUFL?: number, targetPDIN?: number
): MixResult | { error: string } {
  const ufl1 = num(c1.ufl), ufl2 = num(c2.ufl);
  const pdin1 = num(c1.pdin), pdin2 = num(c2.pdin);

  if (ufl1 === null || ufl2 === null) return { error: "UFL manquant pour au moins un concentré" };

  // Try UFL target first
  let x = 0.5, y = 0.5;
  let solved = false;

  if (targetUFL !== undefined && Math.abs(ufl1 - ufl2) > 0.001) {
    x = (targetUFL - ufl2) / (ufl1 - ufl2);
    y = 1 - x;
    solved = true;
  } else if (targetPDIN !== undefined && pdin1 !== null && pdin2 !== null && Math.abs(pdin1 - pdin2) > 0.1) {
    x = (targetPDIN - pdin2) / (pdin1 - pdin2);
    y = 1 - x;
    solved = true;
  }

  if (!solved) {
    if (Math.abs(ufl1 - ufl2) < 0.001 && (targetUFL !== undefined)) {
      return { error: "UFL identiques — le mélange basé sur UFL est impossible." };
    }
    return { error: "Impossible de résoudre — vérifiez les valeurs cibles." };
  }

  if (x < 0 || y < 0 || x > 1 || y > 1) {
    return { error: "Mélange impossible — les valeurs cibles sont hors de portée des deux concentrés." };
  }

  return computeMixResult(
    [{ name: c1.name, proportion: x }, { name: c2.name, proportion: y }],
    [c1, c2]
  );
}

// ---------- Multi-mix solver (3+ concentrates, user-defined proportions) ----------
export function solveMultiMix(
  feeds: MixFeed[],
  proportions: number[]
): MixResult | { error: string } {
  if (feeds.length < 2) return { error: "Au moins 2 concentrés requis" };
  if (feeds.length !== proportions.length) return { error: "Nombre de proportions ≠ nombre de concentrés" };

  const total = proportions.reduce((s, p) => s + p, 0);
  if (total <= 0) return { error: "La somme des proportions doit être > 0" };

  const normalized = proportions.map((p) => p / total);

  const feedProportions = feeds.map((f, i) => ({ name: f.name, proportion: normalized[i] }));

  return computeMixResult(feedProportions, feeds);
}

// ---------- Least-cost mix solver (uses LP) ----------
export function solveLeastCostMix(
  feeds: MixFeed[],
  target: {
    minUFL?: number;
    minPDIN?: number;
    minPDIE?: number;
    minPabs?: number;
    minCaabs?: number;
    maxUFL?: number;
  }
): MixResult | { error: string } {
  if (feeds.length < 2) return { error: "Au moins 2 concentrés requis" };

  const n = feeds.length;

  // Objective: minimize cost per kg of mix
  // Variables: proportion of each feed (0-1, sum = 1)
  // We minimize sum(price_i × x_i) subject to nutritional constraints

  const objective = feeds.map((f) => num(f.price) ?? 0);

  const constraints: LPProblem["constraints"] = [];

  // Sum of proportions = 1
  constraints.push({ coeffs: new Array(n).fill(1), op: "=", rhs: 1 });

  // Nutritional constraints (per kg of mix)
  if (target.minUFL !== undefined) {
    constraints.push({ coeffs: feeds.map((f) => num(f.ufl) ?? 0), op: ">=", rhs: target.minUFL });
  }
  if (target.minPDIN !== undefined) {
    constraints.push({ coeffs: feeds.map((f) => num(f.pdin) ?? 0), op: ">=", rhs: target.minPDIN });
  }
  if (target.minPDIE !== undefined) {
    constraints.push({ coeffs: feeds.map((f) => num(f.pdie) ?? 0), op: ">=", rhs: target.minPDIE });
  }
  if (target.minPabs !== undefined) {
    constraints.push({ coeffs: feeds.map((f) => num(f.pabs) ?? 0), op: ">=", rhs: target.minPabs });
  }
  if (target.minCaabs !== undefined) {
    constraints.push({ coeffs: feeds.map((f) => num(f.caabs) ?? 0), op: ">=", rhs: target.minCaabs });
  }

  const problem: LPProblem = {
    objective,
    constraints,
    varLowerBounds: new Array(n).fill(0),
    varUpperBounds: new Array(n).fill(1),
  };

  const solution = solveLP(problem);

  if (solution.status !== "optimal") {
    return { error: `Optimisation impossible: ${solution.status}. Les contraintes sont peut-être trop strictes.` };
  }

  // Normalize proportions (in case sum isn't exactly 1 due to LP)
  const sum = solution.variables.reduce((s, v) => s + v, 0);
  const normalized = solution.variables.map((v) => (sum > 0 ? v / sum : 0));

  const feedProportions = feeds.map((f, i) => ({ name: f.name, proportion: normalized[i] }));

  return computeMixResult(feedProportions, feeds);
}

// ---------- Compute mix result from proportions ----------
function computeMixResult(
  feedProportions: Array<{ name: string; proportion: number }>,
  feeds: MixFeed[]
): MixResult {
  let totalUFL = 0, totalPDIN = 0, totalPDIE = 0, totalPabs = 0, totalCaabs = 0, totalMS = 0, totalCost = 0;

  const feedResults = feedProportions.map((fp, i) => {
    const f = feeds[i];
    const p = fp.proportion;
    const kgPerTon = p * 1000;
    const costPerTon = (num(f.price) ?? 0) * kgPerTon;

    totalUFL += (num(f.ufl) ?? 0) * p;
    totalPDIN += (num(f.pdin) ?? 0) * p;
    totalPDIE += (num(f.pdie) ?? 0) * p;
    totalPabs += (num(f.pabs) ?? 0) * p;
    totalCaabs += (num(f.caabs) ?? 0) * p;
    totalMS += (num(f.ms_pct) ?? 100) * p / 100; // weighted MS fraction
    totalCost += (num(f.price) ?? 0) * p;

    return { name: fp.name, proportion: p, kgPerTon, costPerTon };
  });

  const totalPDI = Math.min(totalPDIN, totalPDIE);
  const costPerKg = totalCost;
  const costPerUFL = totalUFL > 0 ? totalCost / totalUFL : 0;
  const caPRatio = totalPabs > 0 ? totalCaabs / totalPabs : 0;
  const proteinPerUFL = totalUFL > 0 ? totalPDI / totalUFL : 0;

  return {
    feeds: feedResults.filter((f) => f.proportion > 0.001),
    totalUFL, totalPDIN, totalPDIE, totalPDI, totalPabs, totalCaabs, totalMS,
    costPerKg, costPerUFL, caPRatio, proteinPerUFL,
    feasible: true,
  };
}

// ---------- Batch instructions ----------
export type BatchInstruction = {
  batchSize: number; // kg
  feeds: Array<{
    name: string;
    kgNeeded: number;
    bagsNeeded: number; // 25kg bags
    cost: number;
  }>;
  totalCost: number;
  totalBags: number;
  costPerKgMix: number;
};

export function generateBatchInstructions(
  mixResult: MixResult,
  batchSize: number
): BatchInstruction {
  const feeds = mixResult.feeds.map((f) => {
    const kgNeeded = (f.proportion / mixResult.feeds.reduce((s, x) => s + x.proportion, 0)) * batchSize;
    const bagsNeeded = Math.ceil(kgNeeded / 25);
    const cost = (mixResult.costPerKg) * kgNeeded;
    return { name: f.name, kgNeeded, bagsNeeded, cost };
  });

  const totalCost = feeds.reduce((s, f) => s + f.cost, 0);
  const totalBags = feeds.reduce((s, f) => s + f.bagsNeeded, 0);

  return {
    batchSize,
    feeds,
    totalCost,
    totalBags,
    costPerKgMix: batchSize > 0 ? totalCost / batchSize : 0,
  };
}

// ---------- Recipe storage (localStorage) ----------
export type SavedRecipe = {
  id: string;
  name: string;
  feedNames: string[];
  proportions: number[];
  mode: "2-mix" | "multi-mix" | "least-cost";
  targetUFL?: number;
  targetPDIN?: number;
  result: {
    totalUFL: number;
    totalPDIN: number;
    totalPDIE: number;
    totalPDI: number;
    costPerKg: number;
    costPerUFL: number;
  };
  createdAt: number;
};

const STORAGE_KEY = "ovinformulation:mix-recipes";

export function listRecipes(): SavedRecipe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).sort((a: SavedRecipe, b: SavedRecipe) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function saveRecipe(data: Omit<SavedRecipe, "id" | "createdAt">): SavedRecipe {
  if (typeof window === "undefined") throw new Error("localStorage not available");
  const existing = listRecipes();
  const recipe: SavedRecipe = { ...data, id: `recipe-${Date.now()}`, createdAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([recipe, ...existing]));
  return recipe;
}

export function deleteRecipe(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listRecipes().filter((r) => r.id !== id)));
}
