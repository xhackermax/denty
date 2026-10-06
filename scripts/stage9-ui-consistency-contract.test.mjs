import fs from "node:fs";
import assert from "node:assert/strict";
const dashboard = fs.readFileSync("src/features/dashboard/dashboard.tsx", "utf8");
assert.match(dashboard, /analytics\.summary\(/, "dashboard must consume canonical summary");

assert.match(
  dashboard,
  /enabled: canReadFinance/,
  "dashboard must not query finance analytics without finance.read",
);
assert.match(
  dashboard,
  /const financeQuery = activeSiteId \? \{ siteId: activeSiteId \} : \{\};/,
  "dashboard must derive KPI scope from active site",
);
assert.match(
  dashboard,
  /analytics\.summary\(financeQuery\)/,
  "dashboard financial KPIs must follow active site",
);
const bridge = fs.readFileSync("src/shared/query/realtime-bridge.tsx", "utf8");
assert.match(
  bridge,
  /clinical_plan_items:[^\n]*analytics\.root[^\n]*dashboard\.root/,
  "clinical plan mutations must invalidate analytics and dashboard",
);
const analysis = fs.readFileSync("src/features/parity/modules/analysis-module.tsx", "utf8");
assert.ok(
  analysis.includes("startOfReportingPeriodMadrid"),
  "analysis periods must use Madrid business timezone",
);
assert.match(analysis, /analytics\.summary\(query\)/, "analysis must consume canonical summary");
assert.match(
  analysis,
  /analytics\.periods\(historyScope\)/,
  "analysis must consume canonical period history",
);
for (const token of ["Personalizado", "Desde / hasta", "Histórico", "Trimestres", "Años"]) {
  assert.ok(analysis.includes(token), `analysis temporal UI missing ${token}`);
}
for (const label of ["Producción", "Cobrado", "Margen", "Conversión"])
  assert.ok(analysis.includes(label));
const financeData = fs.readFileSync("src/features/parity/modules/finance-data.ts", "utf8");
assert.match(financeData, /analytics\.summary\(/, "finance must consume canonical summary");
const finance = fs.readFileSync("src/features/parity/modules/finance-module.tsx", "utf8");
assert.ok(
  !/invoiceTotal\s*=\s*issued\.reduce/.test(finance),
  "finance must not recompute invoiced KPI locally",
);
assert.ok(
  !/collected\s*=\s*\(finance\.payments/.test(finance),
  "finance must not recompute collected KPI locally",
);
assert.match(
  finance,
  /finance\.summary\.data\?\.invoicedCents/,
  "finance invoiced KPI must come from summary",
);
assert.match(
  finance,
  /finance\.summary\.data\?\.collectedCents/,
  "finance collected KPI must come from summary",
);
console.log("stage9-ui-consistency-contract: PASS");
