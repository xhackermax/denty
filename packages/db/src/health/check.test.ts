import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, expect, test } from "vitest";

import { checkDatabaseHealth } from "./check";

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));
const databasePath = join(packageRoot, "health-test.db");
process.env.DATABASE_URL = `file:${databasePath}`;

let db: typeof import("../index");

beforeAll(async () => {
  rmSync(databasePath, { force: true });
  db = await import("../index");
});

afterAll(async () => {
  await db?.disconnectDatabase();
  rmSync(databasePath, { force: true });
});

test("checks sqlite connectivity, foreign keys, WAL and rollback writes", async () => {
  const result = await checkDatabaseHealth(db.prisma);

  expect(result.ok).toBe(true);
  expect(result.provider).toBe("sqlite");
  expect(result.checks.opens).toBe(true);
  expect(result.checks.foreignKeys).toBe(true);
  expect(result.checks.wal).toBe(true);
  expect(result.checks.writeRollback).toBe(true);
  expect("databaseUrl" in result).toBe(false);
});
