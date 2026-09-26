import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const outDir = mkdtempSync(join(tmpdir(), 'denty-route-transition-'));
try {
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc',
    'src/shared/motion/route-transition.ts',
    '--target', 'ES2022',
    '--module', 'ES2022',
    '--moduleResolution', 'bundler',
    '--outDir', outDir,
    '--skipLibCheck',
  ], { stdio: 'pipe' });
  const mod = await import(pathToFileURL(join(outDir, 'route-transition.js')).href);

  assert.deepEqual(mod.resolveRouteTransition('/app', '/app/patients'), {
    kind: 'glide',
    direction: 1,
  });
  assert.deepEqual(mod.resolveRouteTransition('/app/agenda', '/app/patients'), {
    kind: 'glide',
    direction: -1,
  });
  assert.deepEqual(mod.resolveRouteTransition('/app/patients', '/app/patients/p-42/odontogram'), {
    kind: 'lift',
    direction: 1,
  });
  assert.deepEqual(mod.resolveRouteTransition('/app/patients/p-42/odontogram', '/app/patients'), {
    kind: 'settle',
    direction: -1,
  });
  assert.deepEqual(mod.resolveRouteTransition('/app/analysis', '/app/analysis?period=year'), {
    kind: 'settle',
    direction: 1,
  });
  console.log('route transition behavior: OK');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
