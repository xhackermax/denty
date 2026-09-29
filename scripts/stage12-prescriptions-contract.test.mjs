import fs from "node:fs";
import assert from "node:assert/strict";

const migration = "supabase/migrations/20260928120000_stage12_prescriptions_voice.sql";
assert.ok(fs.existsSync(migration), "Stage 12 migration missing");
const sql = fs.readFileSync(migration, "utf8").toLowerCase();
for (const token of [
  "create table if not exists public.prescription_clinic_settings",
  "create table if not exists public.prescription_prescribers",
  "create table if not exists public.prescriptions",
  "create table if not exists public.prescription_items",
  "create table if not exists public.prescription_versions",
  "create table if not exists public.prescription_signatures",
  "'prescription-evidence'",
  "create or replace function public.create_prescription_draft",
  "create or replace function public.update_prescription_draft",
  "create or replace function public.validate_prescription",
  "create or replace function public.record_prescription_signature",
  "create or replace function public.issue_prescription",
  "create or replace function public.cancel_prescription",
  "snapshot_json",
  "content_hash",
  "storage_path",
  "checksum_sha256",
  "private.audit_sensitive_mutation()",
  "private.broadcast_denty_change()",
])
  assert.ok(sql.includes(token), `Missing Stage 12 prescription SQL contract: ${token}`);
assert.match(
  sql,
  /prescription_signatures[\s\S]*storage_path text not null/i,
  "Signature evidence must use immutable storage reference",
);
assert.doesNotMatch(
  sql,
  /prescription_signatures[\s\S]{0,1400}data_url/i,
  "Signature table must not persist data URLs",
);
assert.match(
  sql,
  /prescriptions_read[\s\S]*is_patient_owner\(patient_id\)/i,
  "Patients must be able to read only their own prescriptions via RLS",
);

const repoPath = "src/server/denty-supabase/prescription-repository.ts";
assert.ok(fs.existsSync(repoPath), "Prescription repository missing");
const repo = fs.readFileSync(repoPath, "utf8");
for (const token of [
  "create_prescription_draft",
  "update_prescription_draft",
  "validate_prescription",
  "record_prescription_signature",
  "issue_prescription",
  "cancel_prescription",
]) {
  assert.ok(repo.includes(token), `Prescription repository missing ${token}`);
}

const route = fs.readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");
for (const token of [
  '"prescriptions"',
  '"prescription-settings"',
  'parts[1] === "prescriptions"',
  'parts[1] === "prescription-settings"',
  'parts[3] === "sign"',
]) {
  assert.ok(
    route.includes(token),
    `Supabase route handler missing Stage 12 route contract ${token}`,
  );
}

const schemas = fs.readFileSync("src/shared/api/schemas/prescriptions.ts", "utf8");
assert.ok(schemas.includes("signPrescriptionSchema"), "Prescription sign schema missing");
const resources = fs.readFileSync("src/shared/api/resources/prescriptions.ts", "utf8");
assert.ok(resources.includes("sign:"), "Prescription API resource missing sign action");

const storage = fs.readFileSync("src/server/storage/storage-repository.ts", "utf8");
assert.ok(
  storage.includes("PRESCRIPTION_EVIDENCE_BUCKET"),
  "Prescription evidence storage bucket constant missing",
);
assert.ok(
  storage.includes("uploadPrescriptionSignature"),
  "Prescription signature upload helper missing",
);

const patientRepo = fs.readFileSync("src/server/denty-supabase/patient-repository.ts", "utf8");
assert.ok(
  patientRepo.includes('"prescriptions"'),
  "Patient portal projection must query prescriptions",
);
assert.ok(
  !patientRepo.includes("Prescriptions become persistent in Stage 12"),
  "Portal still contains Stage 12 prescription placeholder",
);

console.log("Stage 12 prescriptions contract PASS");
