import fs from "node:fs";
import assert from "node:assert/strict";
const sql = fs
  .readFileSync("supabase/migrations/20260928111000_stage11_engagement_outbox.sql", "utf8")
  .toLowerCase();
const start = sql.indexOf("create or replace function public.claim_communication_outbox");
const end = sql.indexOf("create or replace function public.finish_communication_outbox");
assert.ok(start >= 0 && end > start, "claim_communication_outbox missing");
const claim = sql.slice(start, end);
assert.ok(
  claim.includes("communication_consents"),
  "dispatcher must re-check persisted consent at claim time",
);
assert.match(
  claim,
  /category\s*=\s*'marketing'/i,
  "dispatcher must distinguish marketing messages",
);
assert.match(claim, /cancelled/i, "queued marketing must be cancellable after opt-out");
assert.match(claim, /for update skip locked/i, "outbox claim must be concurrency-safe");
const worker = fs.readFileSync("supabase/functions/communication-outbox/index.ts", "utf8");
assert.ok(
  worker.includes("claim_communication_outbox") && worker.includes("finish_communication_outbox"),
  "worker must use atomic outbox claim/finish RPCs",
);
assert.ok(
  worker.toLowerCase().includes("idempotency-key"),
  "provider send must carry idempotency key",
);
console.log("Stage 11 consent-at-dispatch contract PASS");
