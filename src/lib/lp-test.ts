// Quick test of LP solver
import { solveLP } from "./lp-solver";

// Classic test: minimize 2x + 3y subject to x + y >= 4, x + 3y >= 6, x,y >= 0
// Expected: x=4, y=0, value=8 (or x=3, y=1, value=9... let's see)
// Actually: x+y>=4, x+3y>=6
//   at x=4, y=0: x+y=4 ✓, x+3y=4 ✗ (need 6)
//   at x=3, y=1: x+y=4 ✓, x+3y=6 ✓, value=2*3+3*1=9
//   at x=0, y=4: x+y=4 ✓, x+3y=12 ✓, value=12
// So optimal is x=3, y=1 with value 9.
const result = solveLP({
  objective: [2, 3],
  constraints: [
    { coeffs: [1, 1], op: ">=", rhs: 4 },
    { coeffs: [1, 3], op: ">=", rhs: 6 },
  ],
});
console.log("Test 1 (basic):", result);
console.log("Expected: x=3, y=1, value=9");

// Test with upper bounds
const result2 = solveLP({
  objective: [1, 1],
  constraints: [{ coeffs: [1, 1], op: "<=", rhs: 10 }],
  varUpperBounds: [4, 4],
});
console.log("\nTest 2 (upper bounds):", result2);
console.log("Expected: x=4, y=4, value=8 (both at upper bound)");

// Test infeasible
const result3 = solveLP({
  objective: [1],
  constraints: [
    { coeffs: [1], op: ">=", rhs: 5 },
    { coeffs: [1], op: "<=", rhs: 2 },
  ],
});
console.log("\nTest 3 (infeasible):", result3);
console.log("Expected: status=infeasible");
