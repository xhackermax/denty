import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const clinic = "00000000-0000-0000-0000-0000000000c1";
const otherClinic = "00000000-0000-0000-0000-0000000000c2";
const migration = readFileSync(
  resolve("supabase/migrations/20261021190000_analytics_new_patients.sql"),
  "utf8",
);
let db: PGlite;

type NewPatients = {
  kpiVersion: string;
  count: number;
  items: { periodStart: string; count: number }[];
};

async function newPatients(params: unknown[]): Promise<NewPatients> {
  const result = await db.query<{ result: NewPatients }>(
    "select public.analytics_new_patients($1, $2, $3, $4, $5) as result",
    params,
  );
  return result.rows[0]!.result;
}

describe("analytics_new_patients SQL migration", () => {
  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      create role authenticated;
      create role anon;
      create schema private;
      create table private.finance_readers (clinic_id uuid primary key);
      create function private.has_finance_permission(uuid, text) returns boolean
        language sql as $$ select exists (select 1 from private.finance_readers where clinic_id = $1) $$;
      create table public.patients (
        id uuid primary key default gen_random_uuid(),
        clinic_id uuid not null,
        archived_at timestamptz,
        created_at timestamptz not null default now()
      );
      insert into private.finance_readers values ('${clinic}');
      insert into public.patients (clinic_id, created_at, archived_at) values
        ('${clinic}', '2026-01-10T10:00:00Z', null),
        ('${clinic}', '2026-01-31T23:30:00Z', null), -- 1 Feb 00:30 in Madrid
        ('${clinic}', '2026-02-15T10:00:00Z', '2026-03-01T00:00:00Z'),
        ('${clinic}', '2025-12-31T22:30:00Z', null), -- 31 Dec 23:30 in Madrid
        ('${otherClinic}', '2026-01-12T10:00:00Z', null);
    `);
    await db.exec(migration);
  });

  afterEach(async () => {
    await db.close();
  });

  it("buckets patients by Madrid month and counts archived ones", async () => {
    const result = await newPatients([clinic, null, null, "month", 120]);
    expect(result).toEqual({
      kpiVersion: "DENTY-KPI-1",
      count: 4,
      items: [
        { periodStart: "2026-02-01", count: 2 },
        { periodStart: "2026-01-01", count: 1 },
        { periodStart: "2025-12-01", count: 1 },
      ],
    });
  });

  it("buckets by year", async () => {
    const result = await newPatients([clinic, null, null, "year", 120]);
    expect(result.items).toEqual([
      { periodStart: "2026-01-01", count: 3 },
      { periodStart: "2025-01-01", count: 1 },
    ]);
  });

  it("counts only patients registered inside the range", async () => {
    const result = await newPatients([
      clinic,
      "2026-01-01T00:00:00+01:00",
      "2026-02-01T00:00:00+01:00",
      "month",
      120,
    ]);
    expect(result.count).toBe(1);
    expect(result.items).toEqual([{ periodStart: "2026-01-01", count: 1 }]);
  });

  it("limits history to the most recent buckets without shrinking the total", async () => {
    const result = await newPatients([clinic, null, null, "month", 1]);
    expect(result.count).toBe(4);
    expect(result.items).toEqual([{ periodStart: "2026-02-01", count: 2 }]);
  });

  it("returns zero and an empty history when there are no patients", async () => {
    await db.exec(`insert into private.finance_readers values ('${otherClinic}')`);
    const result = await newPatients([otherClinic, "2027-01-01T00:00:00Z", null, "month", 120]);
    expect(result).toEqual({ kpiVersion: "DENTY-KPI-1", count: 0, items: [] });
  });

  it("rejects callers without finance permission", async () => {
    await expect(newPatients([otherClinic, null, null, "month", 120])).rejects.toThrow("FORBIDDEN");
  });

  it("rejects invalid granularity and ranges", async () => {
    await expect(newPatients([clinic, null, null, "week", 120])).rejects.toThrow(
      "INVALID_ANALYTICS_GRANULARITY",
    );
    await expect(
      newPatients([clinic, "2026-02-01T00:00:00Z", "2026-01-01T00:00:00Z", "month", 120]),
    ).rejects.toThrow("INVALID_ANALYTICS_RANGE");
  });
});
