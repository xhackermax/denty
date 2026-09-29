import fs from "node:fs";
import assert from "node:assert/strict";

const route = fs.readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");
const alertsModule = fs.readFileSync("src/features/parity/modules/alerts-module.tsx", "utf8");
const dashboard = fs.readFileSync("src/features/dashboard/dashboard.tsx", "utf8");
const migrationPath = "supabase/migrations/20260928101000_stage10_alerts_connected.sql";

assert.ok(
  fs.existsSync(migrationPath),
  "Stage 10 must create the canonical alerts ledger in Supabase",
);
const sql = fs.readFileSync(migrationPath, "utf8");
assert.match(sql, /create table if not exists public\.alerts/i, "alerts table is required");
assert.match(
  sql,
  /create or replace function public\.list_open_alerts/i,
  "open alerts must come from a canonical RPC",
);
assert.match(sql, /private\.refresh_lab_alerts/i, "lab state must feed the alert ledger");
assert.match(sql, /dedupe_key/i, "derived lab alerts must be idempotent/deduplicated");
assert.match(
  sql,
  /assigneeUserId/,
  "alert list must expose the assignee profile id used by the assignment API",
);
assert.match(
  route,
  /new AlertsRepository|alertsRepository\(/,
  "Supabase handler must instantiate alerts repository",
);
assert.match(route, /parts\[2\] === "alerts"/, "admin alerts routes must be implemented locally");
assert.match(
  route,
  /resolveAlert|reviewAlert|snoozeAlert|assignAlert/,
  "alert lifecycle actions must reach Supabase",
);
assert.match(
  alertsModule,
  /engagement\.alerts\.list\(\)/,
  "alerts screen must use the same canonical API",
);
assert.match(
  dashboard,
  /engagement\.alerts\.list\(\)/,
  "dashboard count must use the same canonical API",
);

console.log("stage10 alerts persistence contract: PASS");
