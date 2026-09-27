import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const finance = readFileSync("src/features/parity/modules/finance-module.tsx", "utf8");
const motionNumberUses = finance.match(/<MotionNumber\b/g) ?? [];
assert.equal(motionNumberUses.length, 5, "Finance must animate all five headline KPIs");
for (const label of ["Producido", "Facturado", "Cobrado", "Pendiente", "Margen"]) {
  assert.match(finance, new RegExp(`ariaLabel="${label}"`));
}
const charts = readFileSync("src/features/parity/modules/finance-charts.tsx", "utf8");
assert.match(charts, /data-motion="doctor-bar"/);
assert.match(charts, /data-motion="treatment-donut"/);
assert.match(charts, /data-motion="monthly-line"/);
assert.doesNotMatch(charts, /blur\(/, "Finance chart reveals must stay crisp");
assert.doesNotMatch(charts, /repeat\s*:\s*Infinity/, "Finance charts must not loop continuously");

const analysis = readFileSync("src/features/parity/modules/analysis-module.tsx", "utf8");
assert.doesNotMatch(analysis, /<Progress\b/, "Analysis must not keep static progress bars");
assert.ok(
  (analysis.match(/<AnimatedProgress\b/g) ?? []).length >= 4,
  "Analysis must animate treatment and loss progress",
);
assert.match(analysis, /key=\{`\$\{period\}-/, "Period changes must replay progress motion");

console.log("finance motion regression: OK");
