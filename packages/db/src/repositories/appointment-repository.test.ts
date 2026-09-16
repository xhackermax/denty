import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { AppointmentRepository, VersionConflictError } from "./appointment-repository";

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));
const databasePath = join(packageRoot, "appointment-test.db");
process.env.DATABASE_URL = `file:${databasePath}`;

let db: typeof import("../index");
let repository: AppointmentRepository;

async function createTestSchema() {
  await db.prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON");
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
    CREATE TABLE IF NOT EXISTS Site (
      id TEXT PRIMARY KEY NOT NULL,
      clinicId TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT Site_clinicId_fkey FOREIGN KEY (clinicId) REFERENCES Clinic (id) ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  await db.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Cabinet (
      id TEXT PRIMARY KEY NOT NULL,
      clinicId TEXT NOT NULL,
      siteId TEXT NOT NULL,
      name TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      version INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT Cabinet_siteId_fkey FOREIGN KEY (siteId) REFERENCES Site (id) ON DELETE RESTRICT ON UPDATE CASCADE
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
    CREATE TABLE IF NOT EXISTS StaffProfile (
      id TEXT PRIMARY KEY NOT NULL,
      clinicId TEXT NOT NULL,
      userId TEXT UNIQUE,
      displayName TEXT NOT NULL,
      role TEXT NOT NULL,
      licenseNumber TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      version INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT StaffProfile_clinicId_fkey FOREIGN KEY (clinicId) REFERENCES Clinic (id) ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  await db.prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Appointment (
      id TEXT PRIMARY KEY NOT NULL,
      clinicId TEXT NOT NULL,
      patientId TEXT NOT NULL,
      staffId TEXT NOT NULL,
      siteId TEXT NOT NULL,
      cabinetId TEXT,
      clinicalPlanItemId TEXT,
      startsAt DATETIME NOT NULL,
      endsAt DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'PLANNED',
      title TEXT NOT NULL,
      reason TEXT,
      confirmedAt DATETIME,
      arrivedAt DATETIME,
      chairAt DATETIME,
      absentAt DATETIME,
      completedAt DATETIME,
      cancelledAt DATETIME,
      cancellationReason TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT Appointment_clinicId_fkey FOREIGN KEY (clinicId) REFERENCES Clinic (id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT Appointment_patientId_fkey FOREIGN KEY (patientId) REFERENCES Patient (id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT Appointment_staffId_fkey FOREIGN KEY (staffId) REFERENCES StaffProfile (id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT Appointment_siteId_fkey FOREIGN KEY (siteId) REFERENCES Site (id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT Appointment_cabinetId_fkey FOREIGN KEY (cabinetId) REFERENCES Cabinet (id) ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
}

async function seedCore() {
  const clinic = await db.prisma.clinic.create({ data: { name: "Denty" } });
  const site = await db.prisma.site.create({ data: { clinicId: clinic.id, name: "Centro" } });
  const cabinet = await db.prisma.cabinet.create({ data: { clinicId: clinic.id, siteId: site.id, name: "Gabinete 1" } });
  const staff = await db.prisma.staffProfile.create({
    data: { clinicId: clinic.id, displayName: "Dra. Ruiz", role: "DENTIST" },
  });
  const patient = await db.prisma.patient.create({
    data: { clinicId: clinic.id, firstName: "Ana", lastName: "Mora" },
  });
  return { clinic, site, cabinet, staff, patient };
}

beforeAll(async () => {
  rmSync(databasePath, { force: true });
  db = await import("../index");
  repository = new AppointmentRepository(db.prisma);
  await createTestSchema();
});

beforeEach(async () => {
  await db.prisma.appointment.deleteMany();
  await db.prisma.patient.deleteMany();
  await db.prisma.staffProfile.deleteMany();
  await db.prisma.cabinet.deleteMany();
  await db.prisma.site.deleteMany();
  await db.prisma.clinic.deleteMany();
});

afterAll(async () => {
  await db?.disconnectDatabase();
  rmSync(databasePath, { force: true });
});

describe("AppointmentRepository", () => {
  test("creates appointments and lists them for the clinic day", async () => {
    const { clinic, site, cabinet, staff, patient } = await seedCore();

    const appointment = await repository.create({
      clinicId: clinic.id,
      patientId: patient.id,
      staffId: staff.id,
      siteId: site.id,
      cabinetId: cabinet.id,
      startsAt: new Date("2026-09-16T09:00:00.000Z"),
      endsAt: new Date("2026-09-16T09:45:00.000Z"),
      title: "Revisión",
      reason: "Control",
    });

    const appointments = await repository.listForDay(clinic.id, "2026-09-16");

    expect(appointment.status).toBe("PLANNED");
    expect(appointments).toHaveLength(1);
    expect(appointments[0]?.id).toBe(appointment.id);
  });

  test("updates status timestamps and rejects stale versions", async () => {
    const { clinic, site, staff, patient } = await seedCore();
    const appointment = await repository.create({
      clinicId: clinic.id,
      patientId: patient.id,
      staffId: staff.id,
      siteId: site.id,
      startsAt: new Date("2026-09-16T10:00:00.000Z"),
      endsAt: new Date("2026-09-16T10:30:00.000Z"),
      title: "Urgencia",
    });

    const arrived = await repository.update(appointment.id, appointment.version, { status: "ARRIVED" });

    expect(arrived.version).toBe(2);
    expect(arrived.arrivedAt).toBeInstanceOf(Date);
    await expect(repository.update(appointment.id, appointment.version, { title: "Cambio tardío" })).rejects.toBeInstanceOf(
      VersionConflictError,
    );
  });
});
