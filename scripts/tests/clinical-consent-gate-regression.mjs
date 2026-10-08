import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const outDir = mkdtempSync(join(tmpdir(), "denty-consent-gate-"));
try {
  execFileSync(
    process.execPath,
    [
      createRequire(import.meta.url).resolve("typescript/bin/tsc"),
      "src/domain/consent-requirements.ts",
      "src/domain/clinical-pipeline.ts",
      "src/domain/clinical-pipeline-progress.ts",
      "--target",
      "ES2022",
      "--module",
      "CommonJS",
      "--moduleResolution",
      "node",
      "--outDir",
      outDir,
      "--skipLibCheck",
    ],
    { stdio: "pipe" },
  );

  const require = createRequire(import.meta.url);
  const consent = require(join(outDir, "consent-requirements.js"));
  const pipeline = require(join(outDir, "clinical-pipeline-progress.js"));

  const requirements = consent.requiredConsentTemplates([
    { treatmentCode: "PERIO-HYGIENE", label: "Higiene periodontal" },
    { treatmentCode: "ENDO", label: "Endodoncia 46" },
    { treatmentCode: "IMPLANT", label: "Implante 46" },
    { treatmentCode: "CROWN-ZR", label: "Corona zirconio 46" },
    { treatmentCode: "IMPLANT", label: "Otro implante" },
  ]);
  assert.deepEqual(
    requirements.map((item) => item.code),
    ["CONSENT_CLEANING", "CONSENT_ENDO", "CONSENT_IMPLANT", "CONSENT_PROSTHESIS"],
  );

  const signedCodes = consent.signedConsentTemplateCodes([
    { type: "CONSENT", title: "CI Endodoncia", status: "SIGNED" },
    { type: "CONSENT", title: "CI Implantes", status: "DELIVERED" },
    { type: "CONSENT", title: "CI Prótesis", status: "FINALIZED" },
  ]);
  assert.deepEqual([...signedCodes].sort(), ["CONSENT_ENDO", "CONSENT_IMPLANT"]);
  assert.equal(consent.hasAllRequiredConsents(requirements, signedCodes), false);

  const base = {
    patientId: "juan-perez",
    odontogramVersion: 2,
    diagnosisCount: 1,
    activePlanItemCount: 4,
    plan: { version: 3, sourceOdontogramVersion: 2 },
    budget: { id: "B1", status: "PRESENTED", sourcePlanVersion: 3 },
    budgetSigned: true,
    futureAppointmentCount: 1,
  };

  const blocked = pipeline.clinicalPipelineProgress({
    ...base,
    requiredConsentCount: 4,
    signedRequiredConsentCount: 2,
  });
  assert.equal(blocked.current, "consents");
  assert.equal(blocked.completed.has("budget"), false);
  assert.equal(blocked.completed.has("signature"), false);
  assert.equal(blocked.completed.has("appointments"), false);

  const consented = pipeline.clinicalPipelineProgress({
    ...base,
    budgetSigned: false,
    requiredConsentCount: 4,
    signedRequiredConsentCount: 4,
  });
  assert.equal(consented.completed.has("consents"), true);
  assert.equal(consented.completed.has("budget"), true);
  assert.equal(consented.current, "signature");

  assert.equal(
    pipeline.clinicalPipelineHref("consents", "juan-perez"),
    "/app/documents?patientId=juan-perez&workflow=consents",
  );

  // Stage 13: the consent gate lives in the canonical sync card (patient profile and
  // Finanzas ?patientId=…), next to the budget signature it blocks.
  const syncCard = readFileSync("src/shared/clinical/clinical-sync-card.tsx", "utf8");
  const finance = readFileSync("src/features/parity/modules/finance-module.tsx", "utf8");
  const pipelineCard = readFileSync("src/shared/clinical/clinical-pipeline-card.tsx", "utf8");
  assert.match(syncCard, /Continuar a consentimientos/);
  assert.match(syncCard, /workflow=consents/);
  assert.match(syncCard, /pendingConsentCount > 0/);
  assert.match(syncCard, /useSignBudgetMutation/);
  assert.match(finance, /<ClinicalSyncCard patientId=\{budgetPatientId\} \/>/);
  assert.match(pipelineCard, /key: "consents"/);
  assert.match(pipelineCard, /Plan → consentimientos → presupuesto → firma → citas/);

  // Restored chairside pipeline: odontogram → Plan A/B/C → consents → budget signature → visits.
  const odontogram = readFileSync("src/features/odontogram/odontogram-workspace.tsx", "utf8");
  const workspace = readFileSync("src/shared/clinical/clinical-workspace.tsx", "utf8");
  const treatmentFlow = readFileSync("src/shared/clinical/treatment-flow.tsx", "utf8");
  const clinicalData = readFileSync("src/shared/clinical/clinical-data.ts", "utf8");
  const documents = readFileSync("src/features/parity/modules/documents-module.tsx", "utf8");
  assert.match(odontogram, /Seguir a plan de tratamiento/);
  for (const token of ["Plan A · Plan completo", '"Plan B"', "Continuar con Plan"]) {
    assert.ok(workspace.includes(token), `treatment plan pipeline missing ${token}`);
  }
  assert.match(treatmentFlow, /Continuar a presupuesto/);
  assert.match(treatmentFlow, /Ahora no · dejar pendiente/);
  assert.match(treatmentFlow, /selectedPlanItemIds/);
  assert.match(treatmentFlow, /relevantConsentRequirements/);
  assert.match(clinicalData, /budget_pending_signature/);
  assert.match(clinicalData, /budget_follow_up/);
  assert.match(documents, /Pendiente de firma/);
  assert.match(documents, /Continuar firma/);
  const optionSignatureSql = readFileSync(
    "supabase/migrations/20261008092000_budget_option_consent_signature_gate.sql",
    "utf8",
  );
  assert.match(optionSignatureSql, /join public\.budget_items bi/);
  assert.match(optionSignatureSql, /bi\.budget_id = v_budget\.id/);
  assert.match(optionSignatureSql, /cr\.status <> 'SATISFIED'/);
  assert.match(optionSignatureSql, /security invoker/);
  assert.match(treatmentFlow, /startAt === "signature"/);

  console.log("clinical consent gate regression: OK");
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
