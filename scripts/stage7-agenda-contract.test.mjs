import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(
  root,
  "supabase/migrations/20260928070000_stage7_agenda_reception.sql",
);
assert.ok(fs.existsSync(migrationPath), "Stage 7 migration must exist");
const sql = fs.readFileSync(migrationPath, "utf8");

for (const pattern of [
  /create extension if not exists btree_gist/i,
  /exclude using gist[\s\S]*staff_id[\s\S]*tstzrange/i,
  /exclude using gist[\s\S]*cabinet_id[\s\S]*tstzrange/i,
  /create table if not exists public\.staff_absences/i,
  /create table if not exists public\.staff_schedules/i,
  /create table if not exists public\.clinic_settings/i,
  /create table if not exists public\.staff_settings/i,
  /create table if not exists public\.patient_waitlist_requests/i,
  /create table if not exists public\.appointment_requests/i,
  /create or replace function public\.book_appointment/i,
  /create or replace function public\.update_appointment/i,
  /create or replace function public\.agenda_availability/i,
  /create or replace function public\.transition_appointment/i,
  /create or replace function public\.mark_no_show/i,
  /create or replace function public\.analytics_wait_times/i,
  /realtime\.send\(/i,
  /NO_SHOW[\s\S]*patient_recalls/i,
])
  assert.match(sql, pattern, `Missing Stage 7 DB contract: ${pattern}`);

assert.match(
  sql,
  /unique[\s\S]*source_appointment_id[\s\S]*kind/i,
  "No-show recall must be idempotent",
);
assert.match(
  sql,
  /staff_absences[\s\S]*tstzrange/i,
  "Availability must account for staff absences",
);
assert.doesNotMatch(
  sql,
  /coalesce\(new\s*,\s*old\)/i,
  "Trigger records must branch explicitly on TG_OP",
);

assert.match(sql, /p_rescheduled_from_id\s+uuid/i, "Booking RPC must accept a reschedule source");
assert.match(
  sql,
  /appointment_relationships[\s\S]*NO_SHOW/i,
  "Rebooking must link replacement appointment to the no-show source",
);
assert.match(
  sql,
  /patient_recalls[\s\S]*status\s*=\s*'booked'/i,
  "Rebooking must close the no-show recall",
);
assert.match(
  sql,
  /if p_new_status='NO_SHOW' then[\s\S]{0,2200}'NO_SHOW_RECALL'/i,
  "No-show must create an internal recall notification",
);
assert.match(
  sql,
  /if p_new_status='NO_SHOW' then[\s\S]{0,2600}integration_events/i,
  "No-show must enqueue an idempotent outbox event",
);
assert.match(
  sql,
  /staff_settings_stage7_broadcast/i,
  "Staff scheduling preference changes must broadcast",
);
assert.match(
  sql,
  /appointment_status_events_stage7_broadcast/i,
  "Lifecycle events must broadcast to reception",
);

assert.match(
  sql,
  /create or replace function private\.assert_not_blocked/i,
  "Booking must check cross-table agenda blocks",
);
assert.match(
  sql,
  /create or replace function public\.create_agenda_block/i,
  "Agenda blocks need a transactional RPC",
);
assert.match(
  sql,
  /revoke insert,update,delete on table public\.appointment_blocks from authenticated/i,
  "Blocks must not bypass transactional RPC",
);
assert.match(
  sql,
  /create or replace function public\.withdraw_waitlist_request/i,
  "Waitlist withdrawal must use a controlled RPC",
);
assert.match(
  sql,
  /create or replace function public\.fulfill_waitlist_request/i,
  "Waitlist fulfillment must use a controlled RPC",
);
assert.match(
  sql,
  /create or replace function public\.create_appointment_request/i,
  "Appointment requests need a controlled create RPC",
);
assert.match(
  sql,
  /create or replace function public\.cancel_appointment_request/i,
  "Appointment requests need a controlled cancel RPC",
);
assert.match(
  sql,
  /create or replace function public\.schedule_appointment_request/i,
  "Appointment requests need a controlled schedule RPC",
);
assert.match(
  sql,
  /revoke insert,update,delete on table public\.appointment_requests from authenticated/i,
  "Appointment request lifecycle must not be directly writable",
);
assert.match(
  sql,
  /appointment_requests_stage7_broadcast/i,
  "Appointment request changes must broadcast to reception",
);
assert.match(
  sql,
  /revoke update,delete on table public\.patient_waitlist_requests from authenticated/i,
  "Waitlist state transitions must not be directly writable",
);
assert.match(
  sql,
  /patient_waitlist_patient_insert[\s\S]{0,500}priority\s*=\s*0[\s\S]{0,300}status\s*=\s*'ACTIVE'/i,
  "Patient-created waitlist rows must start active at neutral priority",
);

assert.match(
  sql,
  /book_appointment[\s\S]{0,2600}CLINICAL_PLAN_ITEM_NOT_FOUND/i,
  "Booking must reject a clinical plan item outside the same clinic/patient",
);
assert.match(
  sql,
  /update_appointment[\s\S]{0,3600}PATIENT_NOT_FOUND/i,
  "Appointment updates must revalidate a changed patient against the owning clinic",
);
assert.match(
  sql,
  /update_appointment[\s\S]{0,4200}STAFF_NOT_FOUND/i,
  "Appointment updates must revalidate a changed professional against the owning clinic",
);
assert.match(
  sql,
  /update_appointment[\s\S]{0,4600}SITE_NOT_FOUND/i,
  "Appointment updates must revalidate a changed site against the owning clinic",
);
assert.match(
  sql,
  /update_appointment[\s\S]{0,5000}CABINET_NOT_FOUND/i,
  "Appointment updates must revalidate a changed cabinet against the owning clinic/site",
);
assert.match(
  sql,
  /update_appointment[\s\S]{0,5600}CLINICAL_PLAN_ITEM_NOT_FOUND/i,
  "Appointment updates must reject a plan item outside the same clinic/patient",
);
assert.match(
  sql,
  /create_staff_absence[\s\S]{0,2200}STAFF_NOT_FOUND/i,
  "Absence creation must validate the professional belongs to the clinic",
);
assert.match(
  sql,
  /create_staff_absence[\s\S]{0,2600}SITE_NOT_FOUND/i,
  "Absence creation must validate the site belongs to the clinic",
);

assert.match(
  sql,
  /create or replace function private\.enforce_stage7_tenant_refs/i,
  "Stage 7 multi-FK tables need a database tenant-integrity guard",
);
for (const table of [
  "staff_settings",
  "staff_schedules",
  "patient_waitlist_requests",
  "appointment_requests",
]) {
  assert.match(
    sql,
    new RegExp(
      `${table}_tenant_refs[\\s\\S]{0,180}execute function private\\.enforce_stage7_tenant_refs`,
      "i",
    ),
    `${table} must enforce same-clinic foreign references`,
  );
}

for (const fn of [
  "book_appointment",
  "update_appointment",
  "transition_appointment",
  "mark_no_show",
  "create_staff_absence",
  "cancel_staff_absence",
  "set_agenda_settings",
  "create_agenda_block",
  "withdraw_waitlist_request",
  "fulfill_waitlist_request",
]) {
  const marker = `create or replace function public.${fn}(`;
  const functionStart = sql.toLowerCase().indexOf(marker.toLowerCase());
  assert.ok(functionStart >= 0, `${fn} must exist`);
  const nextFunction = sql
    .toLowerCase()
    .indexOf("create or replace function ", functionStart + marker.length);
  const body = sql.slice(functionStart, nextFunction >= 0 ? nextFunction : sql.length);
  assert.match(
    body,
    /security\s+definer/i,
    `${fn} must remain callable after direct table mutation grants are revoked`,
  );
}
console.log("Stage 7 agenda DB contract: OK");
