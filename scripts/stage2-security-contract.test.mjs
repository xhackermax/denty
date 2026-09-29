import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.resolve("supabase/migrations");
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const migrationSql = migrationFiles
  .map((name) => fs.readFileSync(path.join(migrationsDir, name), "utf8"))
  .join("\n");

const stage2Name = "20260928010000_stage2_rls_transactions_audit_constraints.sql";
const stage2Path = path.join(migrationsDir, stage2Name);
assert.ok(fs.existsSync(stage2Path), `Falta la migración ${stage2Name}`);
const stage2 = fs.readFileSync(stage2Path, "utf8");

const created = [
  ...migrationSql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi),
].map((m) => m[1]);
const dropped = new Set(
  [...migrationSql.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?public\.([a-z0-9_]+)/gi)].map(
    (m) => m[1],
  ),
);
const effectiveTables = [...new Set(created)].filter((name) => !dropped.has(name));
const rlsEnabled = new Set(
  [
    ...migrationSql.matchAll(
      /alter\s+table\s+public\.([a-z0-9_]+)\s+enable\s+row\s+level\s+security/gi,
    ),
  ].map((m) => m[1]),
);
const missingRls = effectiveTables.filter((name) => !rlsEnabled.has(name));
assert.deepEqual(missingRls, [], `Tablas public sin RLS: ${missingRls.join(", ")}`);

for (const required of [
  "clinics",
  "sites",
  "cabinets",
  "clinical_plan_dependencies",
  "document_templates",
]) {
  assert.match(
    stage2,
    new RegExp(`alter\\s+table\\s+public\\.${required}\\s+enable\\s+row\\s+level\\s+security`, "i"),
  );
}

assert.doesNotMatch(
  stage2,
  /security\s+definer[\s\S]{0,160}set\s+search_path\s*=\s*public/i,
  "SECURITY DEFINER no puede usar search_path=public",
);
assert.match(
  stage2,
  /create\s+schema\s+if\s+not\s+exists\s+private/i,
  "Los helpers RLS privilegiados deben vivir en schema no expuesto",
);
assert.match(stage2, /create\s+or\s+replace\s+function\s+private\.is_clinic_staff/i);
assert.match(stage2, /create\s+or\s+replace\s+function\s+private\.is_patient_owner/i);
assert.doesNotMatch(
  stage2,
  /public\.is_clinic_staff\s*\(/i,
  "Las políticas no deben depender del helper inexistente public.is_clinic_staff",
);
assert.doesNotMatch(
  stage2,
  /public\.is_patient_owner\s*\(/i,
  "Las políticas no deben depender del helper inexistente public.is_patient_owner",
);

assert.match(stage2, /create\s+or\s+replace\s+function\s+private\.set_updated_at/i);
for (const table of [
  "profiles",
  "clinic_members",
  "patients",
  "dental_entities",
  "clinical_plans",
  "clinical_plan_items",
  "budgets",
  "documents",
  "consent_requirements",
  "appointments",
  "clinic_payment_methods",
  "payment_terminals",
  "clinic_payment_settings",
  "payment_attempts",
]) {
  assert.match(
    stage2,
    new RegExp(`create\\s+trigger\\s+${table}_set_updated_at`, "i"),
    `Falta updated_at trigger para ${table}`,
  );
}

assert.match(stage2, /create\s+or\s+replace\s+function\s+private\.audit_sensitive_mutation/i);
for (const table of [
  "patients",
  "staff_members",
  "clinic_members",
  "user_permissions",
  "patient_accounts",
  "dental_entities",
  "clinical_history_events",
  "periodontal_measurements",
  "odontogram_snapshots",
  "clinical_plans",
  "clinical_plan_items",
  "clinical_plan_dependencies",
  "budgets",
  "budget_items",
  "budget_signed_snapshots",
  "documents",
  "consent_requirements",
  "appointments",
  "appointment_status_events",
  "payments",
  "payment_allocations",
  "payment_attempts",
]) {
  assert.match(
    stage2,
    new RegExp(`create\\s+trigger\\s+${table}_audit_mutation`, "i"),
    `Falta audit trigger para ${table}`,
  );
}
assert.match(
  stage2,
  /revoke\s+update\s*,\s*delete\s+on\s+table\s+public\.audit_log\s+from\s+authenticated/i,
);

for (const fn of [
  "save_odontogram_batch",
  "transition_appointment",
  "finalize_budget_signature",
  "record_payment",
]) {
  assert.match(
    stage2,
    new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${fn}`, "i"),
    `Falta RPC ${fn}`,
  );
  assert.match(
    stage2,
    new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${fn}`, "i"),
    `Falta GRANT explícito para ${fn}`,
  );
}

for (const unique of [
  /create\s+unique\s+index[^;]+patients[^;]+clinic_id[^;]+record_number/is,
  /create\s+unique\s+index[^;]+sites[^;]+clinic_id[^;]+lower\(name\)/is,
  /create\s+unique\s+index[^;]+cabinets[^;]+site_id[^;]+lower\(name\)/is,
  /create\s+unique\s+index[^;]+document_templates[^;]+clinic_id[^;]+code/is,
]) {
  assert.match(stage2, unique, "Falta una restricción/índice natural esperado");
}

for (const indexFragment of [
  "patients_clinic_idx",
  "appointments_clinic_start_idx",
  "documents_clinic_patient_idx",
  "payments_clinic_patient_idx",
  "clinical_plan_items_clinic_plan_idx",
]) {
  assert.match(
    stage2,
    new RegExp(`create\\s+index\\s+if\\s+not\\s+exists\\s+${indexFragment}`, "i"),
  );
}

console.log(
  `Stage 2 security contract OK: ${effectiveTables.length} tablas public cubiertas por RLS y contratos de seguridad presentes.`,
);
