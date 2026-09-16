import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

const appRoot = fileURLToPath(new URL("../../..", import.meta.url));
const databasePath = join(appRoot, "api-patients-test.db");
process.env.DATABASE_URL = `file:${databasePath}`;

let api: typeof import("../../server");
let db: typeof import("@denty/db");

async function createSchema() {
  await db.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Clinic (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      legalName TEXT,
      taxId TEXT,
      phone TEXT,
      email TEXT,
      fiscalAddress TEXT,
      currency TEXT NOT NULL DEFAULT 'EUR',
      timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Patient (
      id TEXT PRIMARY KEY NOT NULL,
      clinicId TEXT NOT NULL,
      legacyId INTEGER,
      recordNumber TEXT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      dni TEXT,
      phone TEXT,
      email TEXT,
      birthDate DATETIME,
      notes TEXT,
      archivedAt DATETIME,
      version INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT Patient_clinicId_fkey FOREIGN KEY (clinicId) REFERENCES Clinic (id) ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  await db.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS AuditEvent (
      id TEXT PRIMARY KEY NOT NULL,
      clinicId TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      actorUserId TEXT,
      action TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      correlationId TEXT NOT NULL,
      beforeJson JSONB,
      afterJson JSONB,
      previousHash TEXT,
      eventHash TEXT,
      occurredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS DomainEventOutbox (
      id TEXT PRIMARY KEY NOT NULL,
      clinicId TEXT NOT NULL,
      type TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      payloadJson JSONB NOT NULL,
      correlationId TEXT NOT NULL,
      actorUserId TEXT,
      occurredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      publishedAt DATETIME
    )
  `);
}

beforeAll(async () => {
  rmSync(databasePath, { force: true });
  db = await import("@denty/db");
  api = await import("../../server");
  await createSchema();
});

beforeEach(async () => {
  await db.prisma.domainEventOutbox.deleteMany();
  await db.prisma.auditEvent.deleteMany();
  await db.prisma.patient.deleteMany();
  await db.prisma.clinic.deleteMany();
});

afterAll(async () => {
  await db?.disconnectDatabase();
  rmSync(databasePath, { force: true });
});

describe("patient API routes", () => {
  test("creates and lists server-backed patients", async () => {
    const server = api.buildServer();

    const created = await server.inject({
      method: "POST",
      url: "/api/patients",
      payload: { firstName: "Ana", lastName: "Mora", phone: "+34 600 000 000" },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ firstName: "Ana", lastName: "Mora", version: 1 });

    const listed = await server.inject({ method: "GET", url: "/api/patients" });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().items).toHaveLength(1);
    expect(await db.prisma.auditEvent.count()).toBe(1);
    expect(await db.prisma.domainEventOutbox.count()).toBe(1);

    await server.close();
  });
});
