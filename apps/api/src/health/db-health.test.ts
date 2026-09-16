import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, expect, test } from "vitest";

const appRoot = fileURLToPath(new URL("../..", import.meta.url));
const databasePath = join(appRoot, "api-health-test.db");
process.env.DATABASE_URL = `file:${databasePath}`;

let api: typeof import("../server");
let db: typeof import("@denty/db");

beforeAll(async () => {
  rmSync(databasePath, { force: true });
  db = await import("@denty/db");
  api = await import("../server");
});

afterAll(async () => {
  await db?.disconnectDatabase();
  rmSync(databasePath, { force: true });
});

test("GET /health/db returns operational database checks without secrets", async () => {
  const server = api.buildServer();
  const response = await server.inject({ method: "GET", url: "/health/db" });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({ ok: true, provider: "sqlite" });
  expect(response.json().databaseUrl).toBeUndefined();

  await server.close();
});
