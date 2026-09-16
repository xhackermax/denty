import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dbRoot = resolve(here, "..");
const prismaDir = resolve(dbRoot, "prisma");
const schemaPath = resolve(prismaDir, "schema.prisma");
const migrationsDir = resolve(prismaDir, "migrations");
const baselineDir = resolve(migrationsDir, "0001_baseline");
const migrationPath = resolve(baselineDir, "migration.sql");
const lockPath = resolve(migrationsDir, "migration_lock.toml");
const force = process.argv.includes("--force");

if (!existsSync(schemaPath)) throw new Error(`Prisma schema not found: ${schemaPath}`);
mkdirSync(migrationsDir, { recursive: true });
const existingMigrationDirs = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
  .map((entry) => entry.name)
  .sort();
if (existingMigrationDirs.length && !force) {
  throw new Error(`Prisma migration history already exists (${existingMigrationDirs.join(", ")}). Refusing to overwrite it; re-run with --force only when intentionally rebuilding an unpublished baseline.`);
}
if (existsSync(migrationPath) && !force) {
  throw new Error(`Baseline migration already exists at ${migrationPath}. Refusing to overwrite it; re-run with --force only when intentionally rebuilding an unpublished baseline.`);
}

// Equivalent to: prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
const prismaArgs = ["migrate", "diff", "--from-empty", "--to-schema", schemaPath, "--script"];
const result = spawnSync("prisma", prismaArgs, {
  cwd: dbRoot,
  encoding: "utf8",
  env: process.env,
});
if (result.error) throw new Error(`Unable to execute Prisma CLI: ${result.error.message}`);
if (result.status !== 0) throw new Error(`Prisma migrate diff failed:\n${result.stderr || result.stdout}`);
const sql = String(result.stdout || "").trim();
if (!sql || !/CREATE\s+TABLE/i.test(sql)) throw new Error("Prisma produced an empty or unexpected baseline migration; nothing was written.");

if (force) {
  for (const dir of existingMigrationDirs) rmSync(resolve(migrationsDir, dir), { recursive: true, force: true });
}
mkdirSync(baselineDir, { recursive: true });
writeFileSync(migrationPath, `${sql}\n`, "utf8");
if (!existsSync(lockPath)) writeFileSync(lockPath, 'provider = "sqlite"\n', "utf8");

const saved = readFileSync(migrationPath, "utf8");
if (!/CREATE\s+TABLE/i.test(saved)) throw new Error("Baseline verification failed after write.");
console.log(`Created Prisma baseline: ${migrationPath}`);
