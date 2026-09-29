import fs from "node:fs";
import assert from "node:assert/strict";
const src = fs.readFileSync("src/features/dashboard/dashboard.tsx", "utf8");
assert.match(
  src,
  /const canReadAlerts = permissions\.includes\("alerts\.read"\)/,
  "dashboard must derive alert permission",
);
assert.match(
  src,
  /queryFn: \(\) => getBrowserApi\(\)\.engagement\.alerts\.list\(\),\s*enabled: canReadAlerts/s,
  "dashboard must not request alerts when permission is absent",
);
assert.match(
  src,
  /canReadAlerts && alerts\.isError/,
  "alert query errors must only affect dashboard when alerts are allowed",
);
assert.match(src, /canReadAlerts \? \(/, "alert card must only be actionable for permitted actors");
console.log("stage10 dashboard alert permission contract: PASS");
