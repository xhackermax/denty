import fs from "node:fs";
import assert from "node:assert/strict";
const sql = fs.readFileSync(
  "supabase/migrations/20260928100000_stage10_laboratories_supplier_ledger.sql",
  "utf8",
);
const start = sql.indexOf("create or replace function public.create_lab_rework");
const end = sql.indexOf("create or replace function public.register_lab_attachment", start);
const fragment = sql.slice(start, end);
assert.ok(fragment.includes("w.status='CANCELLED'"), "rework must not revive a cancelled lab work");
assert.ok(fragment.includes("LAB_WORK_CANCELLED"), "cancelled rework must fail explicitly");
console.log("stage10 laboratory terminal state contract: PASS");
