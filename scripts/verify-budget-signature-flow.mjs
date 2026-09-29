import fs from "node:fs";
import assert from "node:assert/strict";

// Stage 13: the legacy budget-signature-flow.tsx screen was removed during the
// stage refactors. The canonical flow is now: consents (Documentos, workflow=consents)
// → budget signature from the clinical sync card (patient profile / Finanzas).
const syncCard = fs.readFileSync("src/shared/clinical/clinical-sync-card.tsx", "utf8");
const clinicalData = fs.readFileSync("src/shared/clinical/clinical-data.ts", "utf8");
const pipeline = fs.readFileSync("src/shared/clinical/clinical-pipeline-card.tsx", "utf8");
const progress = fs.readFileSync("src/domain/clinical-pipeline-progress.ts", "utf8");
const financeModule = fs.readFileSync("src/features/parity/modules/finance-module.tsx", "utf8");
const documentsModule = fs.readFileSync("src/features/parity/modules/documents-module.tsx", "utf8");

assert.match(syncCard, /Firmar presupuesto/);
assert.match(syncCard, /<SignaturePad/);
assert.match(syncCard, /expectedVersion: sync\.budget\.version/);
assert.match(clinicalData, /billing\.budgets\.sign\(/);
assert.match(financeModule, /<ClinicalSyncCard patientId=\{budgetPatientId\} \/>/);
assert.match(documentsModule, /documents\.sign\(/);
assert.match(pipeline, /key: "signature", label: "Firma"/);
assert.match(progress, /completed\.add\("signature"\)/);
assert.match(progress, /completed\.has\("signature"\)/);
assert.match(progress, /action=sign/);
console.log("Budget signature flow regression OK");
