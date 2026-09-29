import fs from "node:fs";
import assert from "node:assert/strict";

const sql = fs.readFileSync(
  "supabase/migrations/20260928101000_stage10_alerts_connected.sql",
  "utf8",
);

assert.doesNotMatch(
  sql,
  /category='LAB_APPOINTMENT_RISK'[\s\S]{0,220}status<>'RESOLVED'\s*;/i,
  "appointment-risk alerts must not be blanket-resolved on every refresh",
);
assert.match(
  sql,
  /on conflict\(clinic_id,dedupe_key\) do update[\s\S]*?\bwhere\b/i,
  "derived alert UPSERTs must be guarded so unchanged rows do not churn version/audit/realtime",
);
assert.match(
  sql,
  /LAB_APPOINTMENT_RISK[\s\S]*?not exists/i,
  "appointment-risk auto-clear must prove that the risk no longer exists",
);

console.log("stage10 alerts idempotency contract: PASS");
