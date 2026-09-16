import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

const appRoot = fileURLToPath(new URL("../../..", import.meta.url));
const databasePath = join(appRoot, "api-events-test.db");
process.env.DATABASE_URL = `file:${databasePath}`;

let db: typeof import("@denty/db");
let events: typeof import("./routes");

async function createSchema() {
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
  events = await import("./routes");
  await createSchema();
});

beforeEach(async () => {
  await db.prisma.domainEventOutbox.deleteMany();
});

afterAll(async () => {
  await db?.disconnectDatabase();
  rmSync(databasePath, { force: true });
});

describe("realtime event stream helpers", () => {
  test("serializes outbox rows with the public SSE event contract", async () => {
    const row = await db.prisma.domainEventOutbox.create({
      data: {
        id: "evt-1",
        clinicId: "clinic-a",
        type: "appointment.arrived",
        entityType: "appointment",
        entityId: "appt-1",
        correlationId: "corr-1",
        payloadJson: { version: 4, scheduledDurationMinutes: 45 },
      },
    });

    const message = events.formatOutboxSseMessage(row);

    expect(message).toContain("id: evt-1\n");
    expect(message).toContain("event: appointment.arrived\n");
    const data = JSON.parse(message.match(/^data: (.+)$/m)?.[1] ?? "{}");
    expect(data).toMatchObject({
      eventId: "evt-1",
      operation: "appointment.arrived",
      entityType: "appointment",
      entityId: "appt-1",
      version: 4,
    });
    expect(data).not.toHaveProperty("id");
  });

  test("marks streamed outbox rows as published without crossing clinic scope", async () => {
    await db.prisma.domainEventOutbox.createMany({
      data: [
        {
          id: "evt-a",
          clinicId: "clinic-a",
          type: "patient.created",
          entityType: "patient",
          entityId: "pat-a",
          correlationId: "corr-a",
          payloadJson: { version: 1 },
        },
        {
          id: "evt-b",
          clinicId: "clinic-b",
          type: "patient.created",
          entityType: "patient",
          entityId: "pat-b",
          correlationId: "corr-b",
          payloadJson: { version: 1 },
        },
      ],
    });

    await events.markOutboxRowsPublished(db.prisma, "clinic-a", ["evt-a", "evt-b"]);

    await expect(db.prisma.domainEventOutbox.findUniqueOrThrow({ where: { id: "evt-a" } })).resolves.toMatchObject({
      publishedAt: expect.any(Date),
    });
    await expect(db.prisma.domainEventOutbox.findUniqueOrThrow({ where: { id: "evt-b" } })).resolves.toMatchObject({
      publishedAt: null,
    });
  });
});
