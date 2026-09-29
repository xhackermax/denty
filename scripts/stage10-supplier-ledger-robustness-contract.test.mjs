import fs from "node:fs";
import assert from "node:assert/strict";
const sql = fs.readFileSync(
  "supabase/migrations/20260928100000_stage10_laboratories_supplier_ledger.sql",
  "utf8",
);
const invoice = sql.slice(
  sql.indexOf("create or replace function public.record_supplier_invoice"),
  sql.indexOf("create or replace function public.record_supplier_payment"),
);
const payment = sql.slice(
  sql.indexOf("create or replace function public.record_supplier_payment"),
  sql.indexOf("create or replace function public.allocate_supplier_payment"),
);
assert.match(
  invoice,
  /nullif\(btrim\(p_invoice_number\),'?'\)?/i,
  "supplier invoice RPC must validate a non-empty invoice number",
);
assert.match(
  invoice,
  /SUPPLIER_INVOICE_NUMBER_REQUIRED/,
  "empty supplier invoice number must fail explicitly",
);
assert.match(
  payment,
  /pg_advisory_xact_lock/,
  "supplier payment idempotency must serialize concurrent retries",
);
assert.match(
  payment,
  /hashtextextended/,
  "supplier payment lock must derive from the clinic/idempotency identity",
);
assert.match(
  payment,
  /SUPPLIER_PAYMENT_IDEMPOTENCY_CONFLICT/,
  "same key with different payment semantics must fail",
);
console.log("stage10 supplier ledger robustness contract: PASS");
