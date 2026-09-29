import fs from "node:fs";
import assert from "node:assert/strict";

const migration = "supabase/migrations/20260928110000_stage11_staff_privacy.sql";
assert.ok(fs.existsSync(migration), "Stage 11 staff/privacy migration missing");
const sql = fs.readFileSync(migration, "utf8").toLowerCase();
for (const token of [
  "create table if not exists public.attendance_punches",
  "create table if not exists public.privacy_requests",
  "create or replace function public.clock_attendance",
  "create or replace function public.correct_attendance_punch",
  "create or replace function public.create_privacy_request",
  "create or replace function public.transition_privacy_request",
  "corrects_punch_id",
  "interval '1 month'",
  "private.audit_sensitive_mutation()",
  "private.broadcast_denty_change()",
])
  assert.ok(sql.includes(token), `Missing staff/privacy SQL contract: ${token}`);
assert.match(
  sql,
  /revoke\s+insert,update,delete\s+on[\s\S]{0,160}public\.attendance_punches[\s\S]{0,160}public\.privacy_requests/i,
  "attendance/privacy must be RPC-only writes",
);

const route = fs.readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");
for (const token of [
  'parts[1] === \"attendance\"',
  'parts[2] === \"me\"',
  'parts[2] === \"punch\"',
  "privacy-requests",
])
  assert.ok(route.includes(token), `Route handler missing segmented route contract ${token}`);
const repo = fs.readFileSync("src/server/denty-supabase/staff-privacy-repository.ts", "utf8");
for (const token of [
  "clock_attendance",
  "correct_attendance_punch",
  "create_privacy_request",
  "transition_privacy_request",
])
  assert.ok(repo.includes(token), `Repository missing ${token}`);
console.log("Stage 11 staff/privacy contract PASS");
