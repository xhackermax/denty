import fs from "node:fs";
import assert from "node:assert/strict";
const p = "supabase/migrations/20260928080000_stage8_finance_billing_fiscal.sql";
assert.ok(fs.existsSync(p));
const sql = fs.readFileSync(p, "utf8");
for (const t of [
  "create table if not exists public.invoice_series",
  "create table if not exists public.billing_settings",
  "create table if not exists public.invoices",
  "create table if not exists public.invoice_lines",
  "alter table public.payment_allocations add column if not exists invoice_id",
  "create or replace function public.create_invoice_draft",
  "create or replace function public.issue_invoice",
  "create or replace function public.rectify_invoice",
  "create or replace function public.record_invoice_payment",
  "create or replace function public.post_succeeded_payment_attempt",
  "create or replace function public.update_billing_settings",
  "create or replace function private.has_finance_permission",
  "record_hash",
  "fiscal_mode text not null default 'NO_VERIFACTU'",
  "raise exception 'FISCAL_IDENTITY_REQUIRED'",
])
  assert.ok(sql.toLowerCase().includes(t.toLowerCase()), `missing ${t}`);
assert.match(sql, /unique \(clinic_id, full_number\)/i);
assert.match(sql, /before update or delete on public\.fiscal_records/i);
assert.match(sql, /revoke insert,update,delete on public\.invoice_series[\s\S]*public\.payments/i);
assert.match(sql, /provider_status<>'succeeded'[\s\S]*PAYMENT_ATTEMPT_NOT_SUCCEEDED/i);
assert.match(sql, /ledger_payment_id/i);
assert.match(sql, /create_invoice_series\(p_clinic_id uuid/i);
assert.match(sql, /update_billing_settings\(p_clinic_id uuid/i);
assert.match(sql, /drop policy if exists payment_attempts_clinic/i);
assert.match(sql, /drop policy if exists fiscal_records_clinic/i);
assert.match(
  sql,
  /revoke execute on function public\.record_payment\(uuid,uuid,integer,text,text,text,text\)/i,
);
assert.match(sql, /payment_method text check/i);
for (const f of ["issuer_tax_id", "issuer_legal_name", "issuer_address"])
  assert.ok(sql.includes(f));
assert.match(
  sql,
  /update public\.invoices set status='ISSUED'[\s\S]*issuer_tax_id[\s\S]*issuer_legal_name/i,
);
assert.match(
  sql,
  /sum\(pa\.amount_cents\)[\s\S]*pa\.payment_id[\s\S]*PAYMENT_ALLOCATION_EXCEEDS_PAYMENT/i,
);
assert.match(
  sql,
  /pg_advisory_xact_lock\(hashtextextended\(i\.clinic_id::text,0\)\)/i,
  "fiscal chain must serialize per clinic",
);
console.log("stage8-finance-contract: PASS");
