import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const clinic = "00000000-0000-0000-0000-0000000000c1";
const migration = readFileSync(
  resolve("supabase/migrations/20261009020000_numeric_patient_record_numbers.sql"),
  "utf8",
);
let db: PGlite;

// Supabase branch previews send each migration statement on its own, outside an
// implicit transaction, so the migration has to open its own.
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inDollar = false;
  for (const line of sql.split("\n")) {
    if (!inDollar && line.trim().startsWith("--")) continue;
    current += `${line}\n`;
    if ((line.match(/\$\$/g) ?? []).length % 2 === 1) inDollar = !inDollar;
    if (!inDollar && line.trimEnd().endsWith(";")) {
      statements.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

describe("numeric_patient_record_numbers SQL migration", () => {
  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      create role authenticated;
      create role anon;
      create schema private;
      create table public.clinics (id uuid primary key);
      create table public.patients (
        id uuid primary key default gen_random_uuid(),
        clinic_id uuid not null references public.clinics(id),
        record_number text not null,
        created_at timestamptz not null default now()
      );
      insert into public.clinics values ('${clinic}');
      insert into public.patients (clinic_id, record_number, created_at) values
        ('${clinic}', '00042', '2026-01-01T10:00:00Z'),
        ('${clinic}', 'DNT-AAA', '2026-01-02T10:00:00Z'),
        ('${clinic}', 'DNT-BBB', '2026-01-03T10:00:00Z');
    `);
  });

  afterEach(async () => {
    await db.close();
  });

  it("runs statement by statement, as Supabase previews apply it", async () => {
    for (const statement of splitStatements(migration)) {
      await db.exec(statement);
    }

    const patients = await db.query<{ record_number: string }>(
      "select record_number from public.patients order by created_at",
    );
    expect(patients.rows.map((row) => row.record_number)).toEqual(["00042", "00043", "00044"]);
    const audit = await db.query<{ old_record_number: string }>(
      "select old_record_number from private.patient_record_number_renumber_audit order by 1",
    );
    expect(audit.rows.map((row) => row.old_record_number)).toEqual(["DNT-AAA", "DNT-BBB"]);
  });
});
