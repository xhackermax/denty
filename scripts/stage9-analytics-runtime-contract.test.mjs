import fs from "node:fs";
import assert from "node:assert/strict";
const repo = "src/server/denty-supabase/analytics-repository.ts";
assert.ok(fs.existsSync(repo), "analytics repository missing");
const r = fs.readFileSync(repo, "utf8");
for (const token of [
  "export class AnalyticsRepository",
  "analytics_summary",
  "analytics_treatments",
  "analytics_doctors",
  "analytics_monthly",
  "analytics_profitability",
  "analytics_kpi_definitions",
])
  assert.ok(r.includes(token), `repo missing ${token}`);
const h = fs.readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");
for (const route of [
  '"summary"',
  '"treatments"',
  '"doctors"',
  '"monthly"',
  '"profitability"',
  '"kpi-definitions"',
])
  assert.ok(h.includes(route), `handler missing analytics route ${route}`);
assert.match(
  h,
  /requireActorPermission\(identity, "finance\.read"\)/,
  "analytics routes must require finance.read",
);
const schema = fs.readFileSync("src/shared/api/schemas/analytics.ts", "utf8");
for (const token of ["kpiVersion", "averageTicketCents", "analyticsKpiDefinitionsSchema"])
  assert.ok(schema.includes(token), `analytics schema missing ${token}`);
const resource = fs.readFileSync("src/shared/api/resources/analytics.ts", "utf8");
assert.ok(resource.includes("kpiDefinitions"), "API resource must expose KPI dictionary");
console.log("stage9-analytics-runtime-contract: PASS");
