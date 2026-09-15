import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '..');
const legacyRoot = join(webRoot, '..', 'legacy-preview');
const publicRoot = join(webRoot, 'public');

for (const entry of ['assets', 'scripts', 'styles', 'denty-app.bundle.js', 'manifest.webmanifest', 'sw.js']) {
  await mkdir(publicRoot, { recursive: true });
  await rm(join(publicRoot, entry), { recursive: true, force: true });
  await cp(join(legacyRoot, entry), join(publicRoot, entry), { recursive: true });
}

console.log('Denty legacy assets synced to apps/web/public');
