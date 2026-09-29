import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), "utf8");
const migrationName = "20260928040000_stage4_patient_lifecycle.sql";
assert.ok(
  existsSync(resolve(root, "supabase/migrations", migrationName)),
  `Missing ${migrationName}`,
);
const migration = read(`supabase/migrations/${migrationName}`);
const allMigrations = readdirSync(resolve(root, "supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => read(`supabase/migrations/${name}`))
  .join("\n");

assert.match(
  migration,
  /alter\s+table\s+public\.patients[\s\S]*birth_date[\s\S]*type\s+date/i,
  "birth_date must become DATE",
);
assert.match(
  migration,
  /Europe\/Madrid/i,
  "birth date conversion must preserve Madrid local calendar date",
);
assert.match(
  allMigrations,
  /patients_clinic_record_number_uq/i,
  "record number must be unique per clinic",
);
assert.match(
  migration,
  /create\s+table\s+if\s+not\s+exists\s+public\.patient_medical_profile_versions/i,
);
assert.match(migration, /create\s+trigger\s+patients_version_medical_profile/i);
assert.match(migration, /create\s+or\s+replace\s+function\s+public\.archive_patient/i);
assert.match(migration, /create\s+or\s+replace\s+function\s+public\.restore_patient/i);
assert.match(migration, /prevent_patient_hard_delete/i);
assert.match(migration, /revoke\s+delete\s+on\s+table\s+public\.patients\s+from\s+authenticated/i);
assert.match(migration, /confdeltype\s*=\s*'c'/i, "cascade patient FKs must be rewritten");
assert.match(
  migration,
  /ON DELETE RESTRICT/i,
  "patient children must use restrictive delete semantics",
);
assert.match(
  migration,
  /conrelid\s*=\s*'public\.patients'::regclass[\s\S]*confrelid\s*=\s*'public\.clinics'::regclass[\s\S]*confdeltype\s*=\s*'c'/i,
  "patients -> clinics cascade must also be rewritten to RESTRICT",
);

const contracts = read("src/shared/api/contracts.ts");
assert.match(contracts, /isoDateSchema\s*=\s*z\.string\(\)\.date\(\)/);
assert.match(contracts, /birthDate:\s*isoDateSchema\.nullable\(\)\.optional\(\)/);
assert.match(contracts, /recordNumber:\s*z\.string\(\)\.trim\(\)\.min\(1\)\.optional\(\)/);
assert.match(contracts, /dni:\s*z\.string\(\)\.trim\(\)\.min\(1\)\.nullable\(\)\.optional\(\)/);
assert.match(contracts, /archivePatientSchema/);

const admission = read("src/features/patients/patient-admission.ts");
assert.doesNotMatch(admission, /T00:00:00/, "birthDate must remain a date-only value");
assert.doesNotMatch(
  admission,
  /dni:\s*[^,\n]*\?\?\s*""/,
  "blank DNI must not be synthesized into payload",
);

const patientImport = read("src/features/patients/patient-import.ts");
for (const symbol of [
  "parsePatientCsv",
  "parsePatientJson",
  "parsePatientXlsx",
  "parsePatientImportFile",
  "validatePatientImportRows",
]) {
  assert.match(
    patientImport,
    new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${symbol}\\b`),
    `patient import missing ${symbol}`,
  );
}
assert.match(patientImport, /recordNumber:\s*row\.legacyRecordNumber/);

const repo = read("src/server/denty-supabase/patient-repository.ts");
assert.match(repo, /record_number:\s*payload\.recordNumber\s*\?\?\s*createRecordNumber\(\)/);
assert.match(
  repo,
  /archived_at:\s*"is\.null"/,
  "active patient list must exclude archived rows by default",
);
assert.match(repo, /async\s+archivePatient\(/);
assert.match(repo, /async\s+restorePatient\(/);
for (const table of ["appointments", "clinical_plans", "budgets", "documents"]) {
  assert.match(
    repo,
    new RegExp(`select<[^>]*>\\(\"${table}\"|select\\(\"${table}\"`),
    `projection must read ${table}`,
  );
}
assert.doesNotMatch(
  repo,
  /appointments:\s*\[\][\s\S]{0,180}plan:\s*null[\s\S]{0,180}budgets:\s*\[\][\s\S]{0,180}documents:\s*\[\]/,
  "projection cannot be a fabricated empty shell",
);

const routes = read("src/server/denty-supabase/route-handler.ts");
assert.match(routes, /parts\[3\]\s*===\s*"archive"/);
assert.match(routes, /parts\[3\]\s*===\s*"restore"/);

console.log("stage4-patient-lifecycle-contract: ok");
