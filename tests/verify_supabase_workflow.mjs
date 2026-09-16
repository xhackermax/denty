import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
const dbPackage = JSON.parse(readFileSync('packages/db/package.json', 'utf8'));
const docs = readFileSync('docs/SUPABASE.md', 'utf8');

for (const file of [
  'packages/db/scripts/prepare-supabase-schema.mjs',
  'packages/db/scripts/deploy-supabase.mjs',
  'packages/db/scripts/verify-supabase-rls.mjs',
]) {
  assert.equal(existsSync(file), true, `falta script Supabase: ${file}`);
}

assert.equal(rootPackage.scripts['supabase:schema'], 'pnpm --filter @denty/db supabase:schema');
assert.equal(rootPackage.scripts['supabase:deploy'], 'pnpm --filter @denty/db supabase:deploy');
assert.equal(rootPackage.scripts['supabase:rls:verify'], 'pnpm --filter @denty/db supabase:rls:verify');

assert.equal(dbPackage.scripts['supabase:schema'], 'node scripts/prepare-supabase-schema.mjs');
assert.equal(dbPackage.scripts['supabase:deploy'], 'node scripts/deploy-supabase.mjs');
assert.equal(dbPackage.scripts['supabase:rls:verify'], 'node scripts/verify-supabase-rls.mjs');
assert.ok(dbPackage.dependencies.pg, 'la verificacion RLS debe usar un cliente Postgres explicito');

const prepare = readFileSync('packages/db/scripts/prepare-supabase-schema.mjs', 'utf8');
assert.match(prepare, /provider = "postgresql"/, 'el esquema Supabase debe convertir Prisma a Postgres');
assert.match(prepare, /generated\/supabase\/schema\.prisma/, 'el esquema Supabase debe generarse fuera del schema SQLite local');

const deploy = readFileSync('packages/db/scripts/deploy-supabase.mjs', 'utf8');
assert.match(deploy, /DATABASE_URL/, 'el despliegue debe exigir DATABASE_URL desde secretos locales');
assert.match(deploy, /\['db', 'push'/, 'el despliegue debe sincronizar Prisma con Supabase');
assert.match(deploy, /ENABLE ROW LEVEL SECURITY/, 'el despliegue debe activar RLS');
assert.doesNotMatch(deploy, /postgresql:\/\/postgres:[^<\s]+@/, 'los scripts no deben contener credenciales hardcodeadas');

const verify = readFileSync('packages/db/scripts/verify-supabase-rls.mjs', 'utf8');
assert.match(verify, /missingRls/, 'la verificacion debe reportar tablas sin RLS');
assert.match(verify, /process\.exit\(1\)/, 'la verificacion debe fallar si falta RLS');

assert.match(docs, /supabase:deploy/, 'la documentacion debe explicar el despliegue repetible');
assert.match(docs, /supabase:rls:verify/, 'la documentacion debe explicar la verificacion RLS');

console.log('verify_supabase_workflow: OK');
