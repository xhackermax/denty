import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL es obligatorio. Usa una variable local o un gestor de secretos; no lo guardes en Git.');
  process.exit(1);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const schemaPath = resolve(packageRoot, 'generated/supabase/schema.prisma');
const prismaBin = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';

execFileSync(process.execPath, [resolve(scriptDir, 'prepare-supabase-schema.mjs')], { stdio: 'inherit' });
execFileSync(prismaBin, ['validate', '--schema', schemaPath], { stdio: 'inherit' });
execFileSync(prismaBin, ['db', 'push', '--schema', schemaPath, '--skip-generate'], { stdio: 'inherit' });

const enableRlsSql = `
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
  END LOOP;
END $$;
`;

const rlsResult = spawnSync(prismaBin, ['db', 'execute', '--schema', schemaPath, '--stdin'], {
  input: enableRlsSql,
  stdio: ['pipe', 'inherit', 'inherit'],
});

if (rlsResult.status !== 0) process.exit(rlsResult.status ?? 1);

console.log('Supabase schema deployed and Row Level Security enabled.');
