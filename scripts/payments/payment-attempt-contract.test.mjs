import assert from "node:assert/strict";
import fs from "node:fs";
const sql = fs.readFileSync("supabase/migrations/20260927210000_payment_providers.sql", "utf8");
for (const x of [
  "create table if not exists public.payment_attempts",
  "idempotency_key text not null",
  "provider_status text not null",
  "enable row level security",
  "payment_attempts_clinic_provider_idempotency_idx",
])
  assert.ok(sql.toLowerCase().includes(x), x);
assert.match(
  sql,
  /check \(provider_status in \('created','processing','requires_action','succeeded','failed','cancelled','expired'\)\)/i,
);
console.log("payment attempt schema contract: OK");
