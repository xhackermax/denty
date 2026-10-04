import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(
  root,
  "supabase/migrations/20260928060000_stage6_clinical_pipeline.sql",
);
assert.ok(fs.existsSync(migrationPath), "Stage 6 migration must exist");
const migration = fs.readFileSync(migrationPath, "utf8");
const repo = fs.readFileSync(
  path.join(root, "src/server/denty-supabase/clinical-repository.ts"),
  "utf8",
);
const patientRepo = fs.readFileSync(
  path.join(root, "src/server/denty-supabase/patient-repository.ts"),
  "utf8",
);
const routes = fs.readFileSync(
  path.join(root, "src/server/denty-supabase/route-handler.ts"),
  "utf8",
);
const admin = fs.readFileSync(path.join(root, "src/features/parity/admin-page.tsx"), "utf8");
const schemas = fs.readFileSync(path.join(root, "src/shared/api/schemas/admin.ts"), "utf8");
const resources = fs.readFileSync(path.join(root, "src/shared/api/resources/admin.ts"), "utf8");
const workspace = fs.readFileSync(
  path.join(root, "src/features/odontogram/odontogram-workspace.tsx"),
  "utf8",
);
const clinicalWorkspace = fs.readFileSync(
  path.join(root, "src/shared/clinical/clinical-workspace.tsx"),
  "utf8",
);
const pipelineCard = fs.readFileSync(
  path.join(root, "src/shared/clinical/clinical-pipeline-card.tsx"),
  "utf8",
);

for (const pattern of [
  /create table if not exists public\.periodontal_exams/i,
  /exam_id\s+uuid\s+references\s+public\.periodontal_exams/i,
  /exam_version\s+integer/i,
  /suppuration\s+boolean/i,
  /summary_json\s+jsonb/i,
  /create table if not exists public\.treatment_catalog/i,
  /unique\s*\(clinic_id,\s*code\)/i,
  /treatment_catalog_id\s+uuid\s+references\s+public\.treatment_catalog/i,
  /treatment_code_snapshot\s+text/i,
  /label_snapshot\s+text/i,
  /price_snapshot_cents\s+integer/i,
  /cost_snapshot_cents\s+integer/i,
  /treatment_metadata_snapshot\s+jsonb/i,
  /template_id\s+uuid\s+references\s+public\.document_templates/i,
  /satisfied_by_document_id\s+uuid\s+references\s+public\.documents/i,
  /rule_version\s+integer/i,
  /create or replace function public\.save_periodontal_exam/i,
  /create or replace function public\.sync_clinical_plan/i,
  /create or replace function public\.sync_budget_from_plan/i,
  /create or replace function public\.refresh_consent_requirements/i,
  /create or replace function public\.finalize_budget_signature/i,
  /BUDGET_OUTDATED/i,
  /CONSENTS_INCOMPLETE/i,
  /clinical_history_events/i,
]) {
  assert.match(migration, pattern, `Missing Stage 6 DB contract: ${pattern}`);
}

assert.match(
  migration,
  /if\s+v_budget\.id\s+is\s+null\s+or\s+v_budget\.status\s+<>\s+'DRAFT'\s+then/i,
  "Signed/non-draft budgets must never be rewritten during plan sync",
);
assert.match(
  patientRepo,
  /parseOdontogramSnapshotPayload/,
  "Snapshots must parse persisted payloads",
);
assert.doesNotMatch(
  patientRepo,
  /function rowToSnapshot[\s\S]*?entities:\s*\[\][\s\S]*?periodontal:\s*\[\]/,
  "Snapshots cannot hydrate empty clinical state",
);

for (const pattern of [
  /async getClinicalSync\(/,
  /async syncPlanFromOdontogram\(/,
  /async syncBudgetFromPlan\(/,
  /async savePeriodontalMeasurement\(/,
  /async createPeriodontalExam\(/,
  /async getClinicalWorkflow\(/,
  /async listConsentRequirements\(/,
  /async finalizeBudgetSignature\(/,
  /async listSnapshots\(/,
  /async createSnapshot\(/,
  /async listTreatmentCatalog\(/,
  /async createTreatmentCatalogItem\(/,
  /async updateTreatmentCatalogItem\(/,
]) {
  assert.match(repo, pattern, `ClinicalRepository missing ${pattern}`);
}

for (const pattern of [
  /parts\[3\] === ["']odontogram["'][\s\S]*?parts\[4\] === ["']periodontal["']/,
  /parts\[3\] === ["']odontogram["'][\s\S]*?parts\[4\] === ["']snapshots["']/,
  /parts\[3\] === ["']clinical-sync["'][\s\S]*?method === ["']GET["']/,
  /parts\[3\] === ["']clinical-sync["'][\s\S]*?parts\[4\] === ["']plan["']/,
  /parts\[3\] === ["']clinical-sync["'][\s\S]*?parts\[4\] === ["']budget["']/,
  /parts\[1\] === ["']admin["'][\s\S]*?parts\[2\] === ["']treatment-catalog["']/,
  /parts\[3\] === ["']clinical-workflow["'][\s\S]*?parts\[4\] === ["']periodontal-exams["']/,
  /parts\[3\] === ["']consent-requirements["']/,
  /parts\[1\] === ["']budgets["'][\s\S]*?parts\[3\] === ["']sign["']/,
]) {
  assert.match(routes, pattern, `Supabase route missing ${pattern}`);
}

assert.match(
  migration,
  /grant execute on function public\.finalize_budget_signature\(uuid, integer, text, text, jsonb\) to authenticated/i,
);
assert.match(
  migration,
  /create trigger periodontal_exams_audit_mutation[\s\S]*?private\.audit_sensitive_mutation\(\)/i,
  "Versioned periodontal exams must participate in the Stage 2 audit ledger",
);
assert.match(
  migration,
  /patient_id\s+uuid\s+not null references public\.patients\(id\) on delete restrict/i,
  "Stage 6 must preserve the Stage 4 no-hard-delete patient retention boundary",
);
assert.match(
  migration,
  /jsonb_build_object\(\s*'budget'\s*,\s*to_jsonb\(v_budget\)[\s\S]*?'items'[\s\S]*?'plan'[\s\S]*?'consentRequirements'/i,
  "Signed budget snapshots must be built from authoritative DB state",
);
assert.match(
  migration,
  /select\s+i\.id,\s*i\.clinic_id,\s*i\.plan_id,\s*coalesce\(i\.treatment_metadata_snapshot/i,
  "Consent rules for an existing plan item must come from its immutable treatment snapshot",
);
assert.match(schemas, /treatmentCatalogItemSchema/);
assert.match(resources, /treatmentCatalog/);
assert.doesNotMatch(
  admin,
  /\["Implante",\s*"Corona zirconio",\s*"Endodoncia",\s*"Férula",\s*"Higiene"\]/,
  "Admin catalog must not be hardcoded",
);
assert.match(
  workspace,
  /<PerioChart[\s\S]*?readings=\{initialPeriodontal\}/,
  "Periodontogram must rehydrate persisted readings",
);
assert.match(
  clinicalWorkspace,
  /treatmentCatalog[\s\S]*?addItem/,
  "Plan selector must consume the persisted treatment catalog",
);
assert.doesNotMatch(
  pipelineCard,
  /requiredConsentTemplates|signedConsentTemplateCodes/,
  "Pipeline must not derive consent requirements in the browser",
);
assert.match(
  pipelineCard,
  /useConsentRequirementsQuery/,
  "Pipeline must read persisted consent requirements",
);
assert.doesNotMatch(
  pipelineCard,
  /documentsQuery|getBrowserApi|dentyQueryKeys/,
  "Budget signature state must come from the canonical budget state, not browser document heuristics",
);
assert.match(
  pipelineCard,
  /sync\.budget\?\.status\s*===\s*["']SIGNED["']/,
  "Pipeline must read signed budget state from the persisted budget",
);

console.log("Stage 6 clinical pipeline contract OK");
