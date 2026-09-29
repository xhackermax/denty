import fs from "node:fs";
import assert from "node:assert/strict";

const repoPath = "src/server/denty-supabase/laboratory-repository.ts";
assert.ok(fs.existsSync(repoPath), "LaboratoryRepository is missing");
const repo = fs.readFileSync(repoPath, "utf8");
for (const token of [
  "class LaboratoryRepository",
  "listLaboratories",
  "createLaboratory",
  "updateLaboratory",
  "listWorks",
  "createWork",
  "transitionWork",
  "createRework",
  "listBalances",
  "recordSupplierInvoice",
  "recordSupplierPayment",
]) {
  assert.ok(repo.includes(token), `Missing repository behavior: ${token}`);
}
const handler = fs.readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");
for (const token of [
  '"lab-works"',
  '"laboratories"',
  '"suppliers"',
  '"supplier-invoices"',
  '"supplier-payments"',
]) {
  assert.ok(handler.includes(token), `Route handler does not own ${token}`);
}
const resource = fs.readFileSync("src/shared/api/resources/core.ts", "utf8");
assert.ok(resource.includes("client.upload("), "Lab attachment must use multipart upload");
assert.ok(
  !resource.includes("labAttachmentInputSchema.parse(payload)"),
  "Lab attachment must not use JSON/base64 payload",
);
const data = fs.readFileSync("src/features/parity/modules/laboratory-data.ts", "utf8");
assert.ok(
  !data.includes("analytics.suppliers()"),
  "Laboratory master must not be inferred from analytics suppliers",
);
assert.ok(
  data.includes("laboratory.listLaboratories()"),
  "Laboratory UI must query canonical laboratory master",
);
const realtime = fs.readFileSync("src/shared/query/realtime-bridge.tsx", "utf8");
for (const table of [
  "laboratories",
  "lab_works",
  "lab_attachments",
  "supplier_invoices",
  "supplier_payments",
  "supplier_payment_allocations",
]) {
  assert.ok(realtime.includes(`${table}:`), `Realtime invalidation missing for ${table}`);
}
console.log("Stage 10 laboratory runtime contract PASS");
