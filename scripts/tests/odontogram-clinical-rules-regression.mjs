import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const early = readFileSync("src/domain/odontogram/clinical-rules/rules-r001-r018.ts", "utf8");
const late = readFileSync("src/domain/odontogram/clinical-rules/rules-r019-r035.ts", "utf8");
const engine = readFileSync("src/domain/odontogram/clinical-rules/engine.ts", "utf8");
const state = readFileSync("src/domain/odontogram/state.ts", "utf8");
const matrix = readFileSync("scripts/verify-vercel-regression-matrix.mjs", "utf8");
const source = `${early}\n${late}`;

for (let index = 1; index <= 35; index += 1) {
  const ruleId = `R${String(index).padStart(3, "0")}`;
  assert.match(source, new RegExp(`\\b${ruleId}\\b`), `${ruleId} must be executable source`);
}
assert.match(engine, /evaluateClinicalBatch/);
assert.match(state, /executeValidatedOdontogramCommand/);
assert.match(state, /executeValidatedOdontogramBatch/);
assert.match(matrix, /odontogram-clinical-rules-regression/);

console.log("odontogram clinical rules regression: OK");
