import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { runBusinessTransaction } from "./run-business-transaction";
import { writeAudit } from "./write-audit";
import { writeDomainEvent } from "../outbox/write-domain-event";

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));
const databasePath = join(packageRoot, "audit-test.db");
process.env.DATABASE_URL = `file:${databasePath}`;

let db: typeof import("../index");

async function createTestSchema() {
  await db.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Clinic (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      legalName TEXT,
      taxId TEXT,
      phone TEXT,
      email TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS AuditEvent (
      id TEXT PRIMARY KEY NOT NULL,
      clinicId TEXT NOT NULL,
      actorUserId TEXT,
      action TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      correlationId TEXT NOT NULL,
      beforeJson JSONB,
      afterJson JSONB,
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
  db = await import("../index");
  await createTestSchema();
});

beforeEach(async () => {
  await db.prisma.domainEventOutbox.deleteMany();
  await db.prisma.auditEvent.deleteMany();
  await db.prisma.clinic.deleteMany();
});

afterAll(async () => {
  await db?.disconnectDatabase();
  rmSync(databasePath, { force: true });
});

describe("audit and outbox transaction helpers", () => {
  test("commits business change audit and domain event together", async () => {
    const result = await runBusinessTransaction(db.prisma, async (tx) => {
      const clinic = await tx.clinic.create({ data: { name: "Denty audit" } });
      await writeAudit(tx, {
        clinicId: clinic.id,
        actorUserId: "user-1",
        action: "clinic.created",
        entityType: "clinic",
        entityId: clinic.id,
        correlationId: "corr-1",
        after: { id: clinic.id, version: 1 },
      });
      await writeDomainEvent(tx, {
        clinicId: clinic.id,
        actorUserId: "user-1",
        type: "clinic.created",
        entityType: "clinic",
        entityId: clinic.id,
        correlationId: "corr-1",
        payload: { version: 1 },
      });
      return clinic;
    });

    await expect(db.prisma.clinic.findUniqueOrThrow({ where: { id: result.id } })).resolves.toMatchObject({
      name: "Denty audit",
    });
    await expect(db.prisma.auditEvent.count()).resolves.toBe(1);
    const event = await db.prisma.domainEventOutbox.findFirstOrThrow();
    expect(event.payloadJson).toEqual({ version: 1 });
  });

  test("rolls back the business change when audit insert fails", async () => {
    await expect(
      runBusinessTransaction(db.prisma, async (tx) => {
        const clinic = await tx.clinic.create({ data: { name: "Rollback clinic" } });
        await writeAudit(tx, {
          clinicId: clinic.id,
          action: "",
          entityType: "clinic",
          entityId: clinic.id,
          correlationId: "corr-rollback",
        });
      }),
    ).rejects.toThrow("Audit action is required");

    await expect(db.prisma.clinic.count()).resolves.toBe(0);
    await expect(db.prisma.auditEvent.count()).resolves.toBe(0);
  });
});
