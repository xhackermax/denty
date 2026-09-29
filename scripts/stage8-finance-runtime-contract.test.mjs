import fs from "node:fs";
import assert from "node:assert/strict";
const repo = "src/server/denty-supabase/finance-repository.ts";
assert.ok(fs.existsSync(repo));
const r = fs.readFileSync(repo, "utf8");
for (const t of [
  "export class FinanceRepository",
  "create_invoice_draft",
  "issue_invoice",
  "rectify_invoice",
  "record_invoice_payment",
  "post_succeeded_payment_attempt",
  "update_billing_settings",
])
  assert.ok(r.includes(t), `repo missing ${t}`);
const h = fs.readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");
for (const t of [
  '"invoices"',
  '"invoice-series"',
  '"payments"',
  '"billing-settings"',
  '"verifactu"',
  '"accounting"',
])
  assert.ok(h.includes(t), `handler missing ${t}`);
for (const p of ["finance.read", "finance.write", "billing.issue", "billing.settings.manage"])
  assert.ok(h.includes(p));
const b = fs.readFileSync("src/shared/query/realtime-bridge.tsx", "utf8");
for (const t of [
  "invoices:",
  "invoice_lines:",
  "payments:",
  "payment_allocations:",
  "fiscal_records:",
])
  assert.ok(b.includes(t), `bridge missing ${t}`);
assert.match(b, /payments:[^\n]*patients\.root/s);
assert.match(b, /invoices:[^\n]*patients\.root/s);
console.log("stage8-finance-runtime-contract: PASS");
