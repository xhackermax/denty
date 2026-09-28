import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tabs = readFileSync("src/features/odontogram/clinical-tabs.tsx", "utf8");
const panel = readFileSync("src/features/odontogram/surgery-panel.tsx", "utf8");
const visuals = readFileSync("src/features/odontogram/surgery-visuals.tsx", "utf8");
const legend = readFileSync("src/features/odontogram/surgery-legend.tsx", "utf8");
const planning = readFileSync("src/domain/odontogram/implant-planning.ts", "utf8");
const completion = readFileSync("src/features/odontogram/implant-surgery-panel.tsx", "utf8");
const matrix = readFileSync("scripts/verify-vercel-regression-matrix.mjs", "utf8");

assert.match(tabs, /value: "surgery", label: "Cirugía"/);
assert.match(panel, /onCommitBatch/);
assert.match(panel, /implantPlanEntities/);
assert.match(visuals, /surgicalVisualsForTooth/);
assert.match(legend, /requiredFields/);
assert.match(planning, /deriveImplantBudgetBom/);
assert.match(completion, /lifecycle: "REALIZADO"/);
assert.match(matrix, /surgery-odontogram-regression/);

console.log("surgery odontogram regression: OK");
