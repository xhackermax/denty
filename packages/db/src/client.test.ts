import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const databasePath = join(packageRoot, "test.db");
process.env.DATABASE_URL = `file:${databasePath}`;

let db: typeof import("./index");

beforeAll(async () => {
  rmSync(databasePath, { force: true });
  db = await import("./index");
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
  await db.prisma.$executeRawUnsafe("CREATE UNIQUE INDEX IF NOT EXISTS Patient_clinicId_legacyId_key ON Patient(clinicId, legacyId)");
  await db.prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS Patient_clinicId_lastName_firstName_idx ON Patient(clinicId, lastName, firstName)");
});

beforeEach(async () => {
  await db.prisma.patient.deleteMany();
  await db.prisma.clinic.deleteMany();
});

afterAll(async () => {
  await db?.disconnectDatabase();
  rmSync(databasePath, { force: true });
});

test("exports a prisma client that can create and read a clinic", async () => {
  const clinic = await db.prisma.clinic.create({
    data: {
      name: "Clínica Denty",
      legalName: "Denty SL",
      email: "hola@denty.test",
    },
  });

  const saved = await db.prisma.clinic.findUniqueOrThrow({
    where: { id: clinic.id },
  });

  expect(saved.name).toBe("Clínica Denty");
  expect(saved.legalName).toBe("Denty SL");
  expect(saved.email).toBe("hola@denty.test");
});
