import fs from "node:fs";
import assert from "node:assert/strict";

const migration = fs.readFileSync(
  "supabase/migrations/20260928090000_stage9_canonical_analytics.sql",
  "utf8",
);
const schema = fs.readFileSync("src/shared/api/schemas/analytics.ts", "utf8");

// Invoice fallback attribution must use a recognized production event, not any appointment.
assert.match(
  migration,
  /left join lateral \([\s\S]*from public\.invoice_lines il[\s\S]*join public\.analytics_production_events pe[\s\S]*pe\.clinical_plan_item_id=il\.clinical_plan_item_id/i,
  "invoice fallback attribution must derive site/staff from recognized production events",
);

// Month buckets are business-calendar buckets, not session/server timezone buckets.
assert.match(
  migration,
  /date_trunc\('month',[^\n]*recognized_at\s+at time zone\s+'Europe\/Madrid'\)/i,
  "monthly analytics must bucket events in Europe/Madrid",
);

// All analytics endpoints share one range contract before reaching individual RPCs.
assert.match(
  schema,
  /superRefine|refine/,
  "analytics query schema must validate cross-field date range",
);
assert.match(
  schema,
  /start[\s\S]*end[\s\S]*(INVALID_ANALYTICS_RANGE|El final|posterior)/i,
  "analytics range validation must reject end <= start",
);

console.log("stage9-analytics-regressions: PASS");
