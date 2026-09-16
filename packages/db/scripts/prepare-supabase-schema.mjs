import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const sourcePath = resolve(packageRoot, 'prisma/schema.prisma');
const targetPath = resolve(packageRoot, 'generated/supabase/schema.prisma');

const source = await readFile(sourcePath, 'utf8');
const schema = source
  .replace('provider = "sqlite"', 'provider = "postgresql"')
  .replace('output   = "../generated/client"', 'output   = "../client"');

if (!schema.includes('provider = "postgresql"')) {
  throw new Error('No se pudo preparar el schema Supabase: falta provider = "postgresql".');
}

await mkdir(dirname(targetPath), { recursive: true });
await writeFile(targetPath, schema);

console.log(`Supabase Prisma schema generated at ${targetPath}`);
