#!/usr/bin/env node
// Replays every supabase/migrations file on an empty PostgreSQL database, the way a
// Supabase Preview branch does. psql sends each statement on its own (autocommit), so
// a migration that needs a transaction, a missing semicolon or a table that only exists
// in production fails here before it reaches the preview.
//
// Usage: DATABASE_URL=postgres://postgres@localhost:5432/postgres node scripts/supabase/replay-migrations.mjs
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const serverUrl = process.env.DATABASE_URL;
if (!serverUrl) {
  console.error(
    "DATABASE_URL is required (a PostgreSQL server the script may create databases on).",
  );
  process.exit(2);
}

const root = resolve(import.meta.dirname, "../..");
const migrationsDir = join(root, "supabase/migrations");
const stub = join(root, "scripts/supabase/preview-stub.sql");
const database = `denty_replay_${process.pid}`;
const databaseUrl = new URL(serverUrl);
databaseUrl.pathname = `/${database}`;

function psql(url, args) {
  return spawnSync("psql", [url.toString(), "-X", "-q", "-v", "ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    // Supabase puts extensions on the default search_path.
    env: { ...process.env, PGOPTIONS: "--search_path=public,extensions" },
  });
}

function run(url, args, label) {
  const result = psql(url, args);
  if (result.status !== 0) {
    console.error(`FAIL ${label}\n${result.stderr.trim()}`);
    return false;
  }
  return true;
}

if (!run(serverUrl, ["-c", `create database ${database}`], "create database")) process.exit(1);

let ok = run(databaseUrl, ["-f", stub], "preview-stub.sql");
const files = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();
for (const file of files) {
  if (!ok) break;
  ok = run(databaseUrl, ["-f", join(migrationsDir, file)], file);
}

run(serverUrl, ["-c", `drop database if exists ${database}`], "drop database");
if (!ok) process.exit(1);
console.log(`Replayed ${files.length} migrations on an empty database.`);
