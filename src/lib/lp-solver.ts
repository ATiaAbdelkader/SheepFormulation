// Simplex Linear Programming solver (minimization)
// Pure TypeScript implementation — no external dependency
// Two-phase Simplex Method with Bland's anti-cycling rule
//
// Problem form:
//   minimize   c^T x
//   subject to A x  { <= | = | >= }  b
//              x >= 0 (or x >= lower_i with shift substitution)
//              x <= upper_i (optional)

export type ConstraintOp = "<=" | ">=" | "=";

export type LPConstraint = {
  coeffs: number[];
  op: ConstraintOp;
  rhs: number;
};

export type LPProblem = {
  objective: number[];
  constraints: LPConstraint[];
  varLowerBounds?: number[];
  varUpperBounds?: number[];
  varLabels?: string[];
};

export type LPSolution = {
  status: "optimal" | "infeasible" | "unbounded" | "iter_limit";
  optimalValue: number | null;
  variables: number[];
  iterations: number;
  message?: string;
};

const EPS = 1e-9;
const MAX_ITER = 1000;

export function solveLP(problem: LPProblem): LPSolution {
  const { objective, constraints, varLowerBounds, varUpperBounds } = problem;
  const numVars = objective.length;

  if (numVars === 0) {
    return { status: "infeasible", optimalValue: null, variables: [], iterations: 0, message: "No variables" };
  }
  for (const c of constraints) {
    if (c.coeffs.length !== numVars) {
      return { status: "infeasible", optimalValue: null, variables: [], iterations: 0, message: "Constraint coefficient length mismatch" };
    }
  }

  // Handle lower bounds via shift substitution: y_i = x_i - L_i, y_i >= 0
  const lowerBounds = varLowerBounds ?? new Array(numVars).fill(0);
  const shifts = lowerBounds.map((b) => Math.max(0, b || 0));

  // Adjust constraint RHS for shifts
  const adjustedConstraints: LPConstraint[] = constraints.map((c) => {
    let adjustedRhs = c.rhs;
    const adjustedCoeffs = c.coeffs.map((coef, i) => {
      adjustedRhs -= coef * shifts[i];
      return coef;
    });
    return { coeffs: adjustedCoeffs, op: c.op, rhs: adjustedRhs };
  });

  // Add upper bounds as explicit <= constraints
  const upperBounds = varUpperBounds ?? new Array(numVars).fill(Infinity);
  for (let i = 0; i < numVars; i++) {
    if (upperBounds[i] !== Infinity && upperBounds[i] > 0) {
      const coeffs = new Array(numVars).fill(0);
      coeffs[i] = 1;
      adjustedConstraints.push({ coeffs, op: "<=", rhs: upperBounds[i] - shifts[i] });
    }
  }

  const numConstraints = adjustedConstraints.length;
  const slackCount = adjustedConstraints.filter((c) => c.op !== "=").length;
  let artificialCount = 0;
  adjustedConstraints.forEach((c) => {
    if (c.op === ">=" || c.op === "=") artificialCount++;
  });

  const totalVars = numVars + slackCount + artificialCount;
  const artificialStart = numVars + slackCount; // first artificial variable index

  // Build tableau
  const tableau: number[][] = [];
  const basis: number[] = [];

  let slackPos = 0;
  let artificialPos = 0;
  for (let r = 0; r < numConstraints; r++) {
    const c = adjustedConstraints[r];
    const row = new Array(totalVars + 1).fill(0);
    for (let i = 0; i < numVars; i++) row[i] = c.coeffs[i];
    if (c.op === "<=") {
      row[numVars + slackPos] = 1;
      basis[r] = numVars + slackPos;
      slackPos++;
    } else if (c.op === ">=") {
      row[numVars + slackPos] = -1; // surplus
      slackPos++;
      const artIdx = artificialStart + artificialPos;
      row[artIdx] = 1;
      basis[r] = artIdx;
      artificialPos++;
    } else {
      const artIdx = artificialStart + artificialPos;
      row[artIdx] = 1;
      basis[r] = artIdx;
      artificialPos++;
    }
    // Ensure RHS is non-negative
    if (c.rhs < 0) {
      for (let i = 0; i <= totalVars; i++) row[i] = -row[i];
    }
    row[totalVars] = Math.abs(c.rhs);
    tableau.push(row);
  }

  // ----- Phase 1: minimize sum of artificials -----
  if (artificialCount > 0) {
    const phase1Obj = new Array(totalVars).fill(0);
    for (let i = artificialStart; i < totalVars; i++) phase1Obj[i] = 1;

    const zRow = computeReducedCostRow(tableau, phase1Obj, basis, totalVars);
    const phase1Result = simplexIterate(tableau, zRow, basis, totalVars, null);

    if (phase1Result.status !== "optimal") {
      return { status: phase1Result.status, optimalValue: null, variables: new Array(numVars).fill(0), iterations: phase1Result.iterations };
    }
    // Check if any artificial remains in basis with positive value
    for (let r = 0; r < numConstraints; r++) {
      if (basis[r] >= artificialStart && Math.abs(tableau[r][totalVars]) > EPS) {
        return { status: "infeasible", optimalValue: null, variables: new Array(numVars).fill(0), iterations: phase1Result.iterations, message: "Problem infeasible" };
      }
    }
  }

  // ----- Phase 2: minimize original objective -----
  // IMPORTANT: forbid artificial variables from re-entering the basis
  const forbidden = new Set<number>();
  for (let i = artificialStart; i < totalVars; i++) forbidden.add(i);

  const phase2Obj = new Array(totalVars).fill(0);
  for (let i = 0; i < numVars; i++) phase2Obj[i] = objective[i];
  const zRow2 = computeReducedCostRow(tableau, phase2Obj, basis, totalVars);

  const phase2Result = simplexIterate(tableau, zRow2, basis, totalVars, forbidden);
  if (phase2Result.status !== "optimal") {
    return { status: phase2Result.status, optimalValue: null, variables: new Array(numVars).fill(0), iterations: phase2Result.iterations };
  }

  // Extract solution
  const x = new Array(numVars).fill(0);
  for (let r = 0; r < numConstraints; r++) {
    if (basis[r] < numVars) {
      x[basis[r]] = tableau[r][totalVars];
    }
  }
  // Add back shifts
  for (let i = 0; i < numVars; i++) x[i] += shifts[i];
  // Clamp tiny negatives to 0
  for (let i = 0; i < numVars; i++) if (Math.abs(x[i]) < EPS) x[i] = 0;

  let optimalValue = 0;
  for (let i = 0; i < numVars; i++) optimalValue += objective[i] * x[i];

  return {
    status: "optimal",
    optimalValue,
    variables: x,
    iterations: phase2Result.iterations,
  };
}

// Compute the reduced cost row: zRow[j] = c_j - sum(c_basis[r] * tableau[r][j])
function computeReducedCostRow(
  tableau: number[][],
  obj: number[],
  basis: number[],
  totalVars: number
): number[] {
  const numConstraints = tableau.length;
  const zRow = new Array(totalVars + 1).fill(0);
  for (let j = 0; j <= totalVars; j++) {
    let s = j < totalVars ? obj[j] : 0;
    for (let r = 0; r < numConstraints; r++) {
      const basisVar = basis[r];
      const objBasis = basisVar < totalVars ? obj[basisVar] : 0;
      s -= objBasis * tableau[r][j];
    }
    zRow[j] = s;
  }
  return zRow;
}

function simplexIterate(
  tableau: number[][],
  zRow: number[],
  basis: number[],
  totalVars: number,
  forbidden: Set<number> | null
): { status: "optimal" | "unbounded" | "iter_limit"; iterations: number } {
  const numConstraints = tableau.length;
  let iter = 0;
  while (iter < MAX_ITER) {
    // Find entering variable (Bland's rule: smallest index with negative reduced cost)
    let pivotCol = -1;
    for (let j = 0; j < totalVars; j++) {
      if (forbidden && forbidden.has(j)) continue;
      if (zRow[j] < -EPS) {
        pivotCol = j;
        break;
      }
    }
    if (pivotCol === -1) {
      return { status: "optimal", iterations: iter };
    }
    // Find leaving variable (min ratio test)
    let minRatio = Infinity;
    let pivotRow = -1;
    for (let r = 0; r < numConstraints; r++) {
      if (tableau[r][pivotCol] > EPS) {
        const ratio = tableau[r][totalVars] / tableau[r][pivotCol];
        if (ratio < minRatio - EPS) {
          minRatio = ratio;
          pivotRow = r;
        }
      }
    }
    if (pivotRow === -1) {
      return { status: "unbounded", iterations: iter };
    }
    // Pivot
    const pivotVal = tableau[pivotRow][pivotCol];
    for (let j = 0; j <= totalVars; j++) tableau[pivotRow][j] /= pivotVal;
    for (let r = 0; r < numConstraints; r++) {
      if (r === pivotRow) continue;
      const factor = tableau[r][pivotCol];
      if (Math.abs(factor) < EPS) continue;
      for (let j = 0; j <= totalVars; j++) {
        tableau[r][j] -= factor * tableau[pivotRow][j];
      }
    }
    // Update z-row
    const zFactor = zRow[pivotCol];
    for (let j = 0; j <= totalVars; j++) {
      zRow[j] -= zFactor * tableau[pivotRow][j];
    }
    basis[pivotRow] = pivotCol;
    iter++;
  }
  return { status: "iter_limit", iterations: iter };
}
