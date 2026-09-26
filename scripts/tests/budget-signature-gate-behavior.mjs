import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const outDir = mkdtempSync(join(tmpdir(), 'denty-budget-gate-'));
try {
  execFileSync('tsc', [
    'src/domain/clinical-pipeline.ts',
    'src/domain/clinical-pipeline-progress.ts',
    '--target', 'ES2022',
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--outDir', outDir,
    '--skipLibCheck',
  ], { stdio: 'pipe' });
  const require = createRequire(import.meta.url);
  const mod = require(join(outDir, 'clinical-pipeline-progress.js'));

  const unsigned = mod.clinicalPipelineProgress({
    patientId: 'p-42',
    odontogramVersion: 1,
    diagnosisCount: 1,
    activePlanItemCount: 1,
    plan: { version: 1, sourceOdontogramVersion: 1 },
    budget: { id: 'b-1', status: 'PRESENTED', sourcePlanVersion: 1 },
    budgetSigned: false,
    futureAppointmentCount: 0,
  });
  assert.equal(unsigned.current, 'signature');
  assert.equal(mod.canNavigateToClinicalPipelineStep(unsigned, 'appointments'), false);
  assert.equal(mod.canNavigateToClinicalPipelineStep(unsigned, 'signature'), true);

  const signed = mod.clinicalPipelineProgress({
    patientId: 'p-42',
    odontogramVersion: 1,
    diagnosisCount: 1,
    activePlanItemCount: 1,
    plan: { version: 1, sourceOdontogramVersion: 1 },
    budget: { id: 'b-1', status: 'ACCEPTED', sourcePlanVersion: 1 },
    budgetSigned: true,
    futureAppointmentCount: 0,
  });
  assert.equal(signed.current, 'appointments');
  assert.equal(mod.canNavigateToClinicalPipelineStep(signed, 'appointments'), true);
  console.log('budget signature appointment gate: OK');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
