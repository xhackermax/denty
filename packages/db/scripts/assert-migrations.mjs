import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, "../prisma/migrations");
const lockPath = resolve(migrationsDir, "migration_lock.toml");

if (!existsSync(migrationsDir)) throw new Error("No versioned Prisma migrations directory exists. Generate the baseline before production deployment.");
const dirs = readdirSync(migrationsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name).sort();
if (!dirs.length) throw new Error("No versioned Prisma migrations found. Generate the baseline before production deployment.");
for (const dir of dirs) {
  const migration = resolve(migrationsDir, dir, "migration.sql");
  if (!existsSync(migration)) throw new Error(`Missing migration.sql in Prisma migration ${dir}`);
  if (!readFileSync(migration, "utf8").trim()) throw new Error(`Empty migration.sql in Prisma migration ${dir}`);
}
if (!existsSync(lockPath)) throw new Error("Missing Prisma migration_lock.toml");
const lock = readFileSync(lockPath, "utf8");
if (!/provider\s*=\s*["']sqlite["']/.test(lock)) throw new Error("Prisma migration_lock.toml must declare sqlite as the provider");
console.log(`Prisma migrations OK: ${dirs.length} versioned migration(s).`);
