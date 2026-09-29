import fs from "node:fs";
import assert from "node:assert/strict";
const sql = fs
  .readFileSync("supabase/migrations/20260928111000_stage11_engagement_outbox.sql", "utf8")
  .toLowerCase();
const start = sql.indexOf(
  "create or replace function public.record_patient_attribution_touchpoint",
);
const end = sql.indexOf("create or replace function public.set_communication_consent", start);
const fn = sql.slice(start, end);
assert.ok(fn.includes("marketing_campaigns"), "attribution RPC must consult campaign defaults");
assert.match(
  fn,
  /utm_source[\s\S]{0,1200}coalesce/i,
  "attribution must inherit campaign UTM values when request omits them",
);
assert.ok(fn.includes("v_campaign"), "attribution RPC must resolve the selected campaign once");
console.log("Stage 11 attribution UTM inheritance contract PASS");
