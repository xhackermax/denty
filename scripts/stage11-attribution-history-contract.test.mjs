import fs from "node:fs";
import assert from "node:assert/strict";
const sql = fs
  .readFileSync("supabase/migrations/20260928111000_stage11_engagement_outbox.sql", "utf8")
  .toLowerCase();
const start = sql.indexOf("create or replace function public.stage11_campaign_roi");
const end = sql.indexOf("revoke all on function public.create_marketing_campaign", start);
assert.ok(start >= 0 && end > start, "stage11_campaign_roi missing");
const roi = sql.slice(start, end);
assert.ok(
  roi.includes("patient_attribution_touchpoints"),
  "conversion attribution must use historical touchpoints",
);
assert.ok(
  roi.includes("issued_at") || roi.includes("created_at"),
  "invoice attribution must be evaluated at conversion time",
);
assert.ok(roi.includes("paid_at"), "payment attribution must be evaluated at payment time");
assert.ok(
  !roi.includes("join public.patient_attribution pa"),
  "historical revenue must not drift with the current last-touch summary",
);
console.log("Stage 11 historical attribution contract PASS");
