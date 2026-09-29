import fs from "node:fs";
import assert from "node:assert/strict";

const migration = "supabase/migrations/20260928111000_stage11_engagement_outbox.sql";
assert.ok(fs.existsSync(migration), "Stage 11 engagement migration missing");
const sql = fs.readFileSync(migration, "utf8").toLowerCase();
for (const token of [
  "create table if not exists public.marketing_campaigns",
  "create table if not exists public.patient_attribution_touchpoints",
  "create table if not exists public.patient_attribution",
  "create table if not exists public.communication_consents",
  "create table if not exists public.communication_messages",
  "create table if not exists public.communication_outbox",
  "create or replace function public.create_marketing_campaign",
  "create or replace function public.record_patient_attribution_touchpoint",
  "create or replace function public.set_communication_consent",
  "create or replace function public.queue_communication",
  "create or replace function public.record_communication_delivery",
  "create or replace function public.stage11_campaign_roi",
  "declared_source",
  "utm_source",
  "idempotency_key",
  "attempt_count",
  "next_attempt_at",
  "private.audit_sensitive_mutation()",
  "private.broadcast_denty_change()",
])
  assert.ok(sql.includes(token), `Missing engagement SQL contract: ${token}`);
assert.match(
  sql,
  /marketing[\s\S]{0,8000}granted/i,
  "marketing send must consult persistent consent",
);

const repo = fs.readFileSync("src/server/denty-supabase/engagement-repository.ts", "utf8");
for (const token of [
  "create_marketing_campaign",
  "stage11_campaign_roi",
  "queue_communication",
  "set_communication_consent",
])
  assert.ok(repo.includes(token), `Engagement repository missing ${token}`);
const route = fs.readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");
for (const token of [
  'parts[2] === \"communications\"',
  "communication-consents",
  'parts[2] === \"marketing\"',
  'parts[3] === \"campaigns\"',
])
  assert.ok(route.includes(token), `Route handler missing segmented route contract ${token}`);
console.log("Stage 11 engagement/outbox contract PASS");
