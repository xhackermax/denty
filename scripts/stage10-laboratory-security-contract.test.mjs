import fs from "node:fs";
import assert from "node:assert/strict";

const sql = fs.readFileSync(
  "supabase/migrations/20260928100000_stage10_laboratories_supplier_ledger.sql",
  "utf8",
);
const route = fs.readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");

for (const marker of [
  "private.has_finance_permission(p_clinic_id,'finance.read')",
  "private.has_finance_permission(p_clinic_id,'finance.write')",
  "private.has_finance_permission(p.clinic_id,'finance.write')",
]) {
  assert.ok(sql.includes(marker), `missing finance permission guard: ${marker}`);
}

for (const policy of [
  "supplier_invoices_read",
  "supplier_invoice_items_read",
  "supplier_payments_read",
  "supplier_payment_allocations_read",
]) {
  const start = sql.indexOf(`create policy ${policy}`);
  assert.ok(start >= 0, `missing ${policy}`);
  const fragment = sql.slice(start, start + 360);
  assert.ok(fragment.includes("private.has_finance_permission"), `${policy} must be finance-gated`);
}

for (const routeMarker of [
  'requireActorPermission(identity, "finance.read")',
  'requireActorPermission(identity, "finance.write")',
]) {
  assert.ok(route.includes(routeMarker), `route handler missing ${routeMarker}`);
}

console.log("stage10 laboratory security contract: PASS");
