import pg from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL es obligatorio para verificar RLS.');
  process.exit(1);
}

const { Client } = pg;
const databaseUrl = new URL(process.env.DATABASE_URL);
const isSupabase = databaseUrl.hostname.includes('supabase.co');
if (isSupabase) databaseUrl.searchParams.delete('sslmode');

const client = new Client({
  connectionString: databaseUrl.toString(),
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  const totals = await client.query(`
    SELECT
      count(1)::int AS total,
      sum(CASE WHEN relrowsecurity THEN 1 ELSE 0 END)::int AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  `);
  const missing = await client.query(`
    SELECT relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT relrowsecurity
    ORDER BY relname
  `);

  const missingRls = missing.rows.map(row => row.relname);
  console.log(JSON.stringify({ tables: totals.rows[0], missingRls }, null, 2));

  if (missingRls.length > 0) process.exit(1);
} finally {
  await client.end().catch(() => {});
}
