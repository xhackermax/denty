import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const outDir = mkdtempSync(join(tmpdir(), 'denty-consent-gate-'));
try {
  execFileSync('tsc', [
    'src/domain/consent-requirements.ts',
    'src/domain/clinical-pipeline.ts',
    'src/domain/clinical-pipeline-progress.ts',
    '--target', 'ES2022',
    '--module', 'CommonJS',
    '--moduleResolution', 'node',
    '--outDir', outDir,
    '--skipLibCheck',
  ], { stdio: 'pipe' });

  const require = createRequire(import.meta.url);
  const consent = require(join(outDir, 'consent-requirements.js'));
  const pipeline = require(join(outDir, 'clinical-pipeline-progress.js'));

  const requirements = consent.requiredConsentTemplates([
    { treatmentCode: 'PERIO-HYGIENE', label: 'Higiene periodontal' },
    { treatmentCode: 'ENDO', label: 'Endodoncia 46' },
    { treatmentCode: 'IMPLANT', label: 'Implante 46' },
    { treatmentCode: 'CROWN-ZR', label: 'Corona zirconio 46' },
    { treatmentCode: 'IMPLANT', label: 'Otro implante' },
  ]);
  assert.deepEqual(requirements.map((item) => item.code), [
    'CONSENT_CLEANING',
    'CONSENT_ENDO',
    'CONSENT_IMPLANT',
    'CONSENT_PROSTHESIS',
  ]);

  const signedCodes = consent.signedConsentTemplateCodes([
    { type: 'CONSENT', title: 'CI Endodoncia', status: 'SIGNED' },
    { type: 'CONSENT', title: 'CI Implantes', status: 'DELIVERED' },
    { type: 'CONSENT', title: 'CI Prótesis', status: 'FINALIZED' },
  ]);
  assert.deepEqual([...signedCodes].sort(), ['CONSENT_ENDO', 'CONSENT_IMPLANT']);
  assert.equal(consent.hasAllRequiredConsents(requirements, signedCodes), false);

  const base = {
    patientId: 'juan-perez',
    odontogramVersion: 2,
    diagnosisCount: 1,
    activePlanItemCount: 4,
    plan: { version: 3, sourceOdontogramVersion: 2 },
    budget: { id: 'B1', status: 'PRESENTED', sourcePlanVersion: 3 },
    budgetSigned: true,
    futureAppointmentCount: 1,
  };

  const blocked = pipeline.clinicalPipelineProgress({
    ...base,
    requiredConsentCount: 4,
    signedRequiredConsentCount: 2,
  });
  assert.equal(blocked.current, 'consents');
  assert.equal(blocked.completed.has('budget'), false);
  assert.equal(blocked.completed.has('signature'), false);
  assert.equal(blocked.completed.has('appointments'), false);

  const consented = pipeline.clinicalPipelineProgress({
    ...base,
    budgetSigned: false,
    requiredConsentCount: 4,
    signedRequiredConsentCount: 4,
  });
  assert.equal(consented.completed.has('consents'), true);
  assert.equal(consented.completed.has('budget'), true);
  assert.equal(consented.current, 'signature');

  assert.equal(
    pipeline.clinicalPipelineHref('consents', 'juan-perez'),
    '/app/documents?patientId=juan-perez&workflow=consents',
  );

  const workspace = readFileSync('src/shared/clinical/clinical-workspace.tsx', 'utf8');
  const finance = readFileSync('src/features/parity/modules/finance-module.tsx', 'utf8');
  const pipelineCard = readFileSync('src/shared/clinical/clinical-pipeline-card.tsx', 'utf8');
  assert.match(workspace, /Continuar a consentimientos/);
  assert.match(workspace, /workflow=consents/);
  assert.match(finance, /if \(!consentsComplete\)/);
  assert.match(finance, /Firma del presupuesto bloqueada/);
  assert.match(finance, /!first \|\| !consentsComplete/);
  assert.match(pipelineCard, /key: "consents"/);
  assert.match(pipelineCard, /Plan → consentimientos → presupuesto → firma → citas/);

  console.log('clinical consent gate regression: OK');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
