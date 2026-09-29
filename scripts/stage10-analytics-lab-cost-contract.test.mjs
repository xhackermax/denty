import fs from "node:fs";
import assert from "node:assert/strict";
const path = "supabase/migrations/20260928102000_stage10_analytics_lab_costs.sql";
assert.ok(
  fs.existsSync(path),
  "Stage 10 must add attributable external lab costs to canonical analytics",
);
const sql = fs.readFileSync(path, "utf8");
assert.match(
  sql,
  /create or replace view public\.analytics_lab_costs_by_plan_item/i,
  "lab costs need a canonical attribution view",
);
assert.match(sql, /supplier_invoice_items/i, "actual supplier invoice lines must feed lab costs");
assert.match(sql, /status<>'VOID'/i, "void supplier invoices must not contribute costs");
assert.match(
  sql,
  /when actual\.lab_work_id is not null then actual\.actual_cost_cents/i,
  "actual invoiced cost must replace provisional work cost",
);
assert.match(
  sql,
  /create or replace view public\.analytics_production_events/i,
  "production view must incorporate external lab cost without duplicating KPI functions",
);
assert.match(
  sql,
  /coalesce\(lab\.lab_cost_cents,0\)/i,
  "external lab cost must be included in production cost",
);
assert.match(
  sql,
  /source_tables=.*supplier_invoice_items/i,
  "KPI dictionary must document the new source",
);
console.log("stage10 analytics lab cost contract: PASS");
