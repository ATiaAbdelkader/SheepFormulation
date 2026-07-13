// Simplex Linear Programming solver (minimization)
// Pure TypeScript implementation — no external dependency
// Reference: Standard Two-Phase Simplex Method
//
// Problem form:
//   minimize   c^T x
//   subject to A x  { <= | = | >= }  b
//              x >= 0
//
// All coefficients must be finite numbers. Returns null if infeasible/unbounded.

export type ConstraintOp = "<=" | ">=" | "=";

export type LPConstraint = {
  coeffs: number[]; // length = number of variables
  op: ConstraintOp;
  rhs: number;
};

export type LPProblem = {
  objective: number[]; // coefficients (minimization)
  constraints: LPConstraint[];
  // Optional variable bounds (x_i >= lower_i, defaults to 0)
  varLowerBounds?: number[];
  // Optional variable upper bounds (x_i <= upper_i, Infinity if not set)
  varUpperBounds?: number[];
  // Optional: variable labels for diagnostics
  varLabels?: string[];
};

export type LPSolution = {
  status: "optimal" | "infeasible" | "unbounded" | "iter_limit";
  optimalValue: number | null;
  variables: number[]; // values of x_i
  iterations: number;
  // Shadow prices (dual values) — only meaningful for inequality constraints
  shadowPrices?: number[];
  message?: string;
};

const EPS = 1e-9;
const MAX_ITER = 500;

/**
 * Solve a Linear Program using the two-phase Simplex method.
 * Supports <=, >=, = constraints with non-negative variables.
 * For variable upper bounds, we add explicit <= constraints.
 */
export function solveLP(problem: LPProblem): LPSolution {
  const { objective, constraints, varLowerBounds, varUpperBounds, varLabels } = problem;
  const numVars = objective.length;

  // Sanity check
  if (numVars === 0) {
    return { status: "infeasible", optimalValue: null, variables: [], iterations: 0, message: "No variables" };
  }
  for (const c of constraints) {
    if (c.coeffs.length !== numVars) {
      return { status: "infeasible", optimalValue: null, variables: [], iterations: 0, message: "Constraint coefficient length mismatch" };
    }
  }

  // Handle variable lower bounds (offset substitution) — assume 0 for simplicity
  // For lower bound L_i > 0, substitute y_i = x_i - L_i (so y_i >= 0)
  // For now we assume lower bounds are 0 (standard form). If lower > 0, we shift.
  const lowerBounds = varLowerBounds ?? new Array(numVars).fill(0);
  const shifts = lowerBounds.map((b) => Math.max(0, b || 0));
  // Adjust RHS of constraints: A(x+y) = b → Ay = b - A*shift
  const adjustedConstraints: LPConstraint[] = constraints.map((c) => {
    let adjustedRhs = c.rhs;
    const adjustedCoeffs = c.coeffs.map((coef, i) => {
      adjustedRhs -= coef * shifts[i];
      return coef;
    });
    return { coeffs: adjustedCoeffs, op: c.op, rhs: adjustedRhs };
  });

  // Add upper bounds as additional <= constraints
  const upperBounds = varUpperBounds ?? new Array(numVars).fill(Infinity);
  for (let i = 0; i < numVars; i++) {
    if (upperBounds[i] !== Infinity && upperBounds[i] > 0) {
      const coeffs = new Array(numVars).fill(0);
      coeffs[i] = 1;
      adjustedConstraints.push({ coeffs, op: "<=", rhs: upperBounds[i] - shifts[i] });
    }
  }

  // Build standard form: minimize c^T x subject to A x = b, x >= 0
  // Add slack/surplus variables and artificial variables as needed
  const numConstraints = adjustedConstraints.length;
  const slackCount = adjustedConstraints.filter((c) => c.op !== "=").length;
  // For >= we need surplus (-1 slack) and artificial
  // For <= we add +1 slack
  // For = we add artificial only

  // Total variables: original + slacks/surplus + artificials
  let slackIdx = 0;
  let artificialCount = 0;
  // First pass: count artificials
  adjustedConstraints.forEach((c) => {
    if (c.op === ">=" || c.op === "=") artificialCount++;
  });

  const totalVars = numVars + slackCount + artificialCount;
  // Build tableau: rows = constraints, cols = variables + RHS
  // We also track basis
  const tableau: number[][] = [];
  const basis: number[] = [];

  // Helper: variable index ranges
  // 0..numVars-1: original variables
  // numVars..numVars+slackCount-1: slack/surplus variables
  // numVars+slackCount..totalVars-1: artificial variables

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
      // Artificial
      const artIdx = numVars + slackCount + artificialPos;
      row[artIdx] = 1;
      basis[r] = artIdx;
      artificialPos++;
    } else {
      // equality — only artificial
      const artIdx = numVars + slackCount + artificialPos;
      row[artIdx] = 1;
      basis[r] = artIdx;
      artificialPos++;
    }
    // RHS — make sure it's non-negative (if negative, multiply row by -1)
    if (c.rhs < 0) {
      for (let i = 0; i <= totalVars; i++) row[i] = -row[i];
    }
    row[totalVars] = Math.abs(c.rhs);
    tableau.push(row);
  }

  // ----- Phase 1: minimize sum of artificials -----
  if (artificialCount > 0) {
    // Objective: sum of artificial variables
    const phase1Obj = new Array(totalVars).fill(0);
    for (let i = numVars + slackCount; i < totalVars; i++) phase1Obj[i] = 1;
    // Reduce objective row using basis (artificials are basic)
    // We compute z-row: c_j - sum(c_basis[i] * tableau[i][j])
    const zRow = new Array(totalVars + 1).fill(0);
    for (let j = 0; j <= totalVars; j++) {
      // RHS column (j === totalVars) has no objective coefficient
      let s = j < totalVars ? phase1Obj[j] : 0;
      for (let r = 0; r < numConstraints; r++) {
        const basisVar = basis[r];
        const objBasis = basisVar < totalVars ? phase1Obj[basisVar] : 0;
        s -= objBasis * tableau[r][j];
      }
      zRow[j] = s;
    }
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.log("[LP] Phase 1 start: basis=", basis, "tableau=", tableau.map((r) => r.slice()), "zRow=", zRow.slice());
    }
    if (typeof process !== "undefined" && process.env.LP_DEBUG) {
      // eslint-disable-next-line no-console
      console.error("[LP] Phase 1 start: basis=", basis, "tableau=", tableau.map((r) => r.slice()), "zRow=", zRow.slice());
    }

    const phase1Result = simplexIterate(tableau, zRow, basis, totalVars);
    if (typeof process !== "undefined" && process.env.LP_DEBUG) {
      // eslint-disable-next-line no-console
      console.error("[LP] Phase 1 end: status=", phase1Result.status, "basis=", basis, "tableau RHS=", tableau.map((r) => r[totalVars]));
    }
    if (phase1Result.status !== "optimal") {
      return { status: phase1Result.status, optimalValue: null, variables: new Array(numVars).fill(0), iterations: phase1Result.iterations };
    }
    // Check if phase 1 objective is 0 (no artificials in basis with positive value)
    let artificialInBasis = false;
    for (let r = 0; r < numConstraints; r++) {
      if (basis[r] >= numVars + slackCount && Math.abs(tableau[r][totalVars]) > EPS) {
        artificialInBasis = true;
        break;
      }
    }
    if (artificialInBasis) {
      return { status: "infeasible", optimalValue: null, variables: new Array(numVars).fill(0), iterations: phase1Result.iterations, message: "Problem infeasible: artificial variables remain in basis" };
    }
  }

  // ----- Phase 2: minimize original objective -----
  // Build objective row with original coefficients (zero for slack/artificial)
  const phase2Obj = new Array(totalVars).fill(0);
  for (let i = 0; i < numVars; i++) phase2Obj[i] = objective[i];
  // Reduce objective row
  const zRow2 = new Array(totalVars + 1).fill(0);
  for (let j = 0; j <= totalVars; j++) {
    let s = j < totalVars ? phase2Obj[j] : 0;
    for (let r = 0; r < numConstraints; r++) {
      const basisVar = basis[r];
      const objBasis = basisVar < totalVars ? phase2Obj[basisVar] : 0;
      s -= objBasis * tableau[r][j];
    }
    zRow2[j] = s;
  }

  const phase2Result = simplexIterate(tableau, zRow2, basis, totalVars);
  if (typeof process !== "undefined" && process.env.LP_DEBUG) {
    // eslint-disable-next-line no-console
    console.error("[LP] Phase 2 end: status=", phase2Result.status, "basis=", basis, "tableau RHS=", tableau.map((r) => r[totalVars]), "zRow2=", zRow2.slice());
  }
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
  // Add back shifts (for lower bounds)
  for (let i = 0; i < numVars; i++) x[i] += shifts[i];

  // Compute optimal value (with shifts accounted)
  let optimalValue = 0;
  for (let i = 0; i < numVars; i++) optimalValue += objective[i] * x[i];

  // Shadow prices: from basis row of slack variables
  const shadowPrices: number[] = [];
  for (let i = 0; i < numConstraints; i++) {
    shadowPrices.push(0); // Simplified — full dual extraction is complex
  }

  return {
    status: "optimal",
    optimalValue,
    variables: x,
    iterations: phase2Result.iterations,
    shadowPrices,
  };
}

function simplexIterate(
  tableau: number[][],
  zRow: number[],
  basis: number[],
  totalVars: number
): { status: "optimal" | "unbounded" | "iter_limit"; iterations: number } {
  const numConstraints = tableau.length;
  let iter = 0;
  while (iter < MAX_ITER) {
    // Find entering variable: most negative coefficient in z-row (Bland's rule for anti-cycling: choose smallest index with negative coef)
    let pivotCol = -1;
    for (let j = 0; j < totalVars; j++) {
      if (zRow[j] < -EPS) {
        pivotCol = j;
        break; // Bland's rule
      }
    }
    if (pivotCol === -1) {
      // Optimal
      return { status: "optimal", iterations: iter };
    }
    // Find leaving variable: minimum ratio test
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
