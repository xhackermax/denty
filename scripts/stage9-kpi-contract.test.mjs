import fs from "node:fs";
import assert from "node:assert/strict";
const migration = "supabase/migrations/20260928090000_stage9_canonical_analytics.sql";
assert.ok(fs.existsSync(migration), "Stage 9 migration missing");
const sql = fs.readFileSync(migration, "utf8");
for (const token of [
  "create table if not exists public.analytics_kpi_definitions",
  "'DENTY-KPI-1'",
  "create or replace view public.analytics_production_events",
  "create or replace function public.analytics_summary",
  "create or replace function public.analytics_treatments",
  "create or replace function public.analytics_doctors",
  "create or replace function public.analytics_monthly",
  "create or replace function public.analytics_profitability",
  "completed_at",
  "issued_at",
  "paid_at",
  "cost_snapshot_cents",
  "payment_allocations",
  "NO_SHOW",
  "budget_signed_snapshots",
  "specialty_snapshot",
  "category_snapshot",
  "freeze_plan_item_analytics_dimensions",
  "timezone text not null default 'Europe/Madrid'",
  "'timezone',d.timezone",
])
  assert.ok(sql.toLowerCase().includes(token.toLowerCase()), `missing ${token}`);
assert.match(
  sql,
  /row_number\(\)[\s\S]*partition by a\.clinical_plan_item_id[\s\S]*order by a\.completed_at/i,
  "production must recognize each plan item once",
);
assert.match(sql, /p\.status='COMPLETED'/i, "collected KPI must use completed ledger payments");
assert.match(
  sql,
  /greatest\(0,coalesce\(sum\(scoped\.invoiced_cents\)/i,
  "pending must net rectifying invoices before flooring at zero",
);
const dictionary = "docs/analytics/KPI-DICTIONARY-v1.md";
assert.ok(fs.existsSync(dictionary), "versioned KPI dictionary missing");
const md = fs.readFileSync(dictionary, "utf8");
for (const name of [
  "Producción",
  "Facturado",
  "Cobrado",
  "Pendiente",
  "Margen",
  "Ticket medio",
  "Conversión",
  "No-show",
  "Europe/Madrid",
])
  assert.ok(md.includes(name), `dictionary missing ${name}`);
console.log("stage9-kpi-contract: PASS");
