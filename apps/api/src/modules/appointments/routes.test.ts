import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

const appRoot = fileURLToPath(new URL("../../..", import.meta.url));
const databasePath = join(appRoot, "api-appointments-test.db");
process.env.DATABASE_URL = `file:${databasePath}`;

let api: typeof import("../../server");
let db: typeof import("@denty/db");

async function createSchema() {
  const migrations = [
    `CREATE TABLE IF NOT EXISTS Clinic (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, legalName TEXT, taxId TEXT, phone TEXT, email TEXT, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS Site (id TEXT PRIMARY KEY NOT NULL, clinicId TEXT NOT NULL, name TEXT NOT NULL, address TEXT, active BOOLEAN NOT NULL DEFAULT true, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS Cabinet (id TEXT PRIMARY KEY NOT NULL, clinicId TEXT NOT NULL, siteId TEXT NOT NULL, name TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT true, version INTEGER NOT NULL DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS Patient (id TEXT PRIMARY KEY NOT NULL, clinicId TEXT NOT NULL, legacyId INTEGER, recordNumber TEXT, firstName TEXT NOT NULL, lastName TEXT NOT NULL, dni TEXT, phone TEXT, email TEXT, birthDate DATETIME, archivedAt DATETIME, version INTEGER NOT NULL DEFAULT 1, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS StaffProfile (id TEXT PRIMARY KEY NOT NULL, clinicId TEXT NOT NULL, displayName TEXT NOT NULL, role TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT true, version INTEGER NOT NULL DEFAULT 1, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS Appointment (id TEXT PRIMARY KEY NOT NULL, clinicId TEXT NOT NULL, patientId TEXT NOT NULL, staffId TEXT NOT NULL, siteId TEXT NOT NULL, cabinetId TEXT, startsAt DATETIME NOT NULL, endsAt DATETIME NOT NULL, status TEXT NOT NULL DEFAULT 'PLANNED', title TEXT NOT NULL, reason TEXT, confirmedAt DATETIME, arrivedAt DATETIME, chairAt DATETIME, absentAt DATETIME, completedAt DATETIME, version INTEGER NOT NULL DEFAULT 1, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS AuditEvent (id TEXT PRIMARY KEY NOT NULL, clinicId TEXT NOT NULL, actorUserId TEXT, action TEXT NOT NULL, entityType TEXT NOT NULL, entityId TEXT NOT NULL, correlationId TEXT NOT NULL, beforeJson JSONB, afterJson JSONB, occurredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS DomainEventOutbox (id TEXT PRIMARY KEY NOT NULL, clinicId TEXT NOT NULL, type TEXT NOT NULL, entityType TEXT NOT NULL, entityId TEXT NOT NULL, payloadJson JSONB NOT NULL, correlationId TEXT NOT NULL, actorUserId TEXT, occurredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, publishedAt DATETIME)`,
  ];
  for (const migration of migrations) {
    await db.prisma.$executeRawUnsafe(migration);
  }
}

async function seedCore() {
  const clinic = await db.prisma.clinic.create({ data: { name: "Denty API" } });
  const site = await db.prisma.site.create({ data: { clinicId: clinic.id, name: "Centro" } });
  const staff = await db.prisma.staffProfile.create({ data: { clinicId: clinic.id, displayName: "Dra. Ruiz", role: "DOCTOR" } });
  const patient = await db.prisma.patient.create({ data: { clinicId: clinic.id, firstName: "Ana", lastName: "Mora" } });
  return { clinic, site, staff, patient };
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
  await db.prisma.appointment.deleteMany();
  await db.prisma.patient.deleteMany();
  await db.prisma.staffProfile.deleteMany();
  await db.prisma.site.deleteMany();
  await db.prisma.clinic.deleteMany();
});

afterAll(async () => {
  await db?.disconnectDatabase();
  rmSync(databasePath, { force: true });
});

describe("appointment API routes", () => {
  test("creates appointments, marks arrival and rejects stale versions", async () => {
    const { patient, staff, site } = await seedCore();
    const server = api.buildServer();

    const created = await server.inject({
      method: "POST",
      url: "/api/appointments",
      payload: {
        patientId: patient.id,
        staffId: staff.id,
        siteId: site.id,
        startsAt: "2026-09-16T09:00:00.000Z",
        endsAt: "2026-09-16T09:45:00.000Z",
        title: "Revisión",
      },
    });
    expect(created.statusCode).toBe(201);
    const appointment = created.json();

    const arrived = await server.inject({
      method: "POST",
      url: `/api/appointments/${appointment.id}/arrive`,
      payload: { expectedVersion: appointment.version },
    });
    expect(arrived.statusCode).toBe(200);
    expect(arrived.json()).toMatchObject({ status: "ARRIVED", version: 2 });
    expect(arrived.json().arrivedAt).toBeTruthy();

    const stale = await server.inject({
      method: "PATCH",
      url: `/api/appointments/${appointment.id}`,
      payload: { expectedVersion: appointment.version, title: "Viejo" },
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe("VERSION_CONFLICT");

    await server.close();
  });
});
