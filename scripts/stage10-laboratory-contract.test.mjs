import fs from "node:fs";
import assert from "node:assert/strict";

const path = "supabase/migrations/20260928100000_stage10_laboratories_supplier_ledger.sql";
assert.ok(fs.existsSync(path), "Stage 10 migration is missing");
const sql = fs.readFileSync(path, "utf8");
for (const token of [
  "create table if not exists public.laboratories",
  "create table if not exists public.lab_works",
  "create table if not exists public.lab_work_status_events",
  "create table if not exists public.lab_reworks",
  "create table if not exists public.lab_attachments",
  "create table if not exists public.supplier_invoices",
  "create table if not exists public.supplier_invoice_items",
  "create table if not exists public.supplier_payments",
  "create table if not exists public.supplier_payment_allocations",
  "'lab-attachments'",
  "create or replace function private.has_lab_permission",
  "create or replace function public.create_lab_work",
  "create or replace function public.transition_lab_work",
  "create or replace function public.create_lab_rework",
  "create or replace function public.record_supplier_payment",
  "create or replace function public.allocate_supplier_payment",
  "private.broadcast_denty_change()",
  "private.audit_sensitive_mutation()",
])
  assert.ok(
    sql.toLowerCase().includes(token.toLowerCase()),
    `Missing Stage 10 SQL contract: ${token}`,
  );

assert.match(
  sql,
  /lab_works[\s\S]*clinical_plan_item_id uuid/i,
  "lab work must link to clinical plan item",
);
assert.match(sql, /lab_works[\s\S]*appointment_id uuid/i, "lab work must link to appointment");
assert.match(
  sql,
  /lab_works[\s\S]*dental_entity_id uuid/i,
  "lab work must link to dental/prosthetic entity",
);
assert.match(
  sql,
  /lab_attachments[\s\S]*storage_path text not null/i,
  "attachments must store private object references",
);
assert.ok(!/base64/i.test(sql), "Stage 10 SQL must never store base64 attachment bytes");
console.log("Stage 10 laboratory SQL contract PASS");
