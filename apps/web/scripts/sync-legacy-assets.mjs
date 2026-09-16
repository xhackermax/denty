import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '..');
const legacyRoot = join(webRoot, '..', 'legacy-preview');
const publicRoot = join(webRoot, 'public');

for (const entry of ['assets', 'scripts', 'styles', 'games', 'denty-app.bundle.js', 'manifest.webmanifest', 'sw.js']) {
  await mkdir(publicRoot, { recursive: true });
  await rm(join(publicRoot, entry), { recursive: true, force: true });
  await cp(join(legacyRoot, entry), join(publicRoot, entry), { recursive: true });
}

console.log('Denty legacy assets synced to apps/web/public');

const legacyHtml = await readFile(join(legacyRoot, 'index.html'), 'utf8');
const bodyMatch = legacyHtml.match(/<body>([\s\S]*?)<script src=\"\.\/denty-app\.bundle\.js\"/);
if (!bodyMatch) throw new Error('No se pudo extraer el shell de apps/legacy-preview/index.html');
const shellHtml = bodyMatch[1].trim().replaceAll('./assets/', '/assets/');
const shellFile = join(webRoot, 'src', 'lib', 'legacy-shell.ts');
await mkdir(dirname(shellFile), { recursive: true });
await writeFile(shellFile, `export const legacyShellHtml = ${JSON.stringify(shellHtml)};\n`, 'utf8');

console.log('Denty legacy shell synced to apps/web/src/lib/legacy-shell.ts');
