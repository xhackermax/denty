import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

import {
  buildTreatmentReviewSchedule,
  FIRST_YEAR_REVIEW_MONTHS,
  PERIO_CODES_WITHOUT_NEW_SERIES,
  reviewSpecialtyForExecution,
} from "@/domain/treatment-reviews";

const MIGRATION = "supabase/migrations/20261013150000_treatment_review_schedule.sql";
const clinic = "00000000-0000-4000-8000-000000000001";
const patient = "00000000-0000-4000-8000-000000000002";

// Only the columns the migration touches; the real tables have more.
const SCHEMA = `
create schema private;
create table public.clinics(id uuid primary key);
create table public.patients(id uuid primary key, clinic_id uuid not null references public.clinics(id));
create table public.appointments(
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null, patient_id uuid not null,
  starts_at timestamptz not null, status text not null default 'PLANNED');
create table public.patient_recalls(
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id),
  patient_id uuid not null references public.patients(id), due_at timestamptz not null, kind text not null,
  status text not null default 'pending' constraint patient_recalls_status_check
    check (status in ('pending','contacted','booked','dismissed')),
  source_appointment_id uuid references public.appointments(id), created_at timestamptz not null default now());
create table public.clinical_treatment_executions(
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null, patient_id uuid not null,
  treatment_code text, treatment_category text, executed_at timestamptz not null);
create table public.implant_placement_outcomes(
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null, patient_id uuid not null,
  outcome text not null, placed_at timestamptz);
insert into public.clinics values ('${clinic}');
insert into public.patients values ('${patient}', '${clinic}');
`;

async function database() {
  const db = new PGlite();
  await db.exec(SCHEMA);
  await db.exec(await readFile(MIGRATION, "utf8"));
  return db;
}

type Recall = { kind: string; status: string; due: string; anchor: string | null };

async function recalls(db: PGlite): Promise<Recall[]> {
  const result = await db.query<Recall>(
    `select kind, status, review_due_date::text as due, review_anchor_date::text as anchor
       from public.patient_recalls order by review_due_date, kind, status`,
  );
  return result.rows;
}

async function execute(db: PGlite, code: string, category: string, at: string) {
  await db.query(
    `insert into public.clinical_treatment_executions(clinic_id, patient_id, treatment_code, treatment_category, executed_at)
     values ($1, $2, $3, $4, $5)`,
    [clinic, patient, code, category, at],
  );
}

test("una endodoncia programa revisiones a 3, 6 y 12 meses a las 09:00 de la clínica", async () => {
  const db = await database();
  await execute(db, "ENDODONCIA_UNIRRADICULAR", "ENDODONTICS", "2026-10-13T16:00:00+02:00");
  expect(await recalls(db)).toEqual([
    { kind: "REVIEW_ENDO_3M", status: "pending", due: "2027-01-13", anchor: "2026-10-13" },
    { kind: "REVIEW_ENDO_6M", status: "pending", due: "2027-04-13", anchor: "2026-10-13" },
    { kind: "REVIEW_ENDO_12M", status: "pending", due: "2027-10-13", anchor: "2026-10-13" },
  ]);
  const due = await db.query<{ local: string }>(
    `select to_char(due_at at time zone 'Europe/Madrid', 'YYYY-MM-DD HH24:MI') as local
       from public.patient_recalls where kind = 'REVIEW_ENDO_3M'`,
  );
  expect(due.rows[0]?.local).toBe("2027-01-13 09:00");
});

test("la fecha del tratamiento es el día en Madrid, no en UTC", async () => {
  const db = await database();
  await execute(db, "ROOT_PLANING", "PERIODONTICS", "2026-10-13T23:30:00Z");
  expect((await recalls(db))[0]).toMatchObject({ kind: "REVIEW_PERIO_3M", anchor: "2026-10-14" });
});

test("las fechas de la base coinciden con las reglas del dominio, incluido fin de mes", async () => {
  const db = await database();
  await execute(db, "PULPOTOMIA", "ENDODONTICS", "2026-11-30T10:00:00+01:00");
  const fromDomain = buildTreatmentReviewSchedule("ENDO", "2026-11-30").map((review) => ({
    kind: review.kind,
    due: review.dueDate,
  }));
  expect((await recalls(db)).map(({ kind, due }) => ({ kind, due }))).toEqual(fromDomain);
});

test("la base clasifica cada tratamiento igual que el dominio", async () => {
  const db = await database();
  const cases = [
    ["ENDODONCIA_MULTIRADICULAR", "ENDODONTICS"],
    ["POST", "RESTORATION"],
    ["RETENEDOR_ESSIX", "ORTHODONTICS"],
    ["ALINEADOR_ORTODONCIA_INVISIBLE", "ORTHODONTICS"],
    ["PERIO_SURGERY", "PERIODONTICS"],
    ...PERIO_CODES_WITHOUT_NEW_SERIES.map((code) => [code, "PERIODONTICS"]),
    ["IMPLANT", "IMPLANTOLOGY"],
    ["FILLING", "RESTORATION"],
  ] as const;
  for (const [code, category] of cases) {
    const result = await db.query<{ specialty: string | null }>(
      "select private.review_specialty_for_execution($1, $2) as specialty",
      [code, category],
    );
    expect(result.rows[0]?.specialty ?? null, `${code}/${category}`).toBe(
      reviewSpecialtyForExecution({ treatmentCode: code, treatmentCategory: category }),
    );
  }
  const sql = await readFile(MIGRATION, "utf8");
  for (const [step, months] of Object.entries(FIRST_YEAR_REVIEW_MONTHS)) {
    expect(sql).toContain(`('${step}', ${months})`);
  }
});

test("los implantes solo cuentan desde una colocación registrada", async () => {
  const db = await database();
  await db.query(
    `insert into public.implant_placement_outcomes(clinic_id, patient_id, outcome, placed_at) values
       ($1, $2, 'FAILED', null), ($1, $2, 'DEFERRED', null)`,
    [clinic, patient],
  );
  expect(await recalls(db)).toEqual([]);
  await db.query(
    `insert into public.implant_placement_outcomes(clinic_id, patient_id, outcome, placed_at)
     values ($1, $2, 'PLACED', '2026-10-13T10:00:00+02:00')`,
    [clinic, patient],
  );
  expect((await recalls(db)).map((recall) => recall.kind)).toEqual([
    "REVIEW_IMPLANT_3M",
    "REVIEW_IMPLANT_6M",
    "REVIEW_IMPLANT_12M",
  ]);
});

test("un tratamiento nuevo de la misma especialidad reinicia la serie sin duplicar llamadas", async () => {
  const db = await database();
  await execute(db, "ENDODONCIA_UNIRRADICULAR", "ENDODONTICS", "2026-01-10T10:00:00+01:00");
  await execute(db, "ENDODONCIA_BIRRADICULAR", "ENDODONTICS", "2026-02-01T10:00:00+01:00");
  await execute(db, "ENDODONCIA_BIRRADICULAR", "ENDODONTICS", "2026-02-01T12:00:00+01:00");
  const rows = await recalls(db);
  expect(rows.filter((row) => row.status === "pending")).toEqual([
    { kind: "REVIEW_ENDO_3M", status: "pending", due: "2026-05-01", anchor: "2026-02-01" },
    { kind: "REVIEW_ENDO_6M", status: "pending", due: "2026-08-01", anchor: "2026-02-01" },
    { kind: "REVIEW_ENDO_12M", status: "pending", due: "2027-02-01", anchor: "2026-02-01" },
  ]);
  expect(rows.filter((row) => row.status === "superseded")).toHaveLength(3);
});

test("un tratamiento registrado tarde no retrasa la serie actual; otras especialidades conviven", async () => {
  const db = await database();
  await execute(db, "ENDODONCIA_UNIRRADICULAR", "ENDODONTICS", "2026-03-01T10:00:00+01:00");
  await execute(db, "PULPOTOMIA", "ENDODONTICS", "2026-02-01T10:00:00+01:00");
  await execute(db, "RETENEDOR_LINGUAL", "ORTHODONTICS", "2026-02-01T10:00:00+01:00");
  const rows = await recalls(db);
  expect(rows.filter((row) => row.kind.startsWith("REVIEW_ENDO")).map((row) => row.anchor)).toEqual(
    ["2026-03-01", "2026-03-01", "2026-03-01"],
  );
  expect(rows.filter((row) => row.kind.startsWith("REVIEW_ORTHO"))).toHaveLength(3);
});

test("una cita cerca de la fecha cubre la revisión y su cancelación la reabre", async () => {
  const db = await database();
  await execute(db, "ROOT_PLANING", "PERIODONTICS", "2026-01-15T10:00:00+01:00");
  const appointment = (
    await db.query<{ id: string }>(
      `insert into public.appointments(clinic_id, patient_id, starts_at)
       values ($1, $2, '2026-04-20T10:00:00+02:00') returning id`,
      [clinic, patient],
    )
  ).rows[0]!.id;
  const statusOf = async (kind: string) =>
    (
      await db.query<{ status: string }>(
        "select status from public.patient_recalls where kind = $1 and status <> 'superseded'",
        [kind],
      )
    ).rows[0]?.status;
  expect(await statusOf("REVIEW_PERIO_3M")).toBe("booked");
  expect(await statusOf("REVIEW_PERIO_6M")).toBe("pending");

  await db.query("update public.appointments set status = 'CANCELLED' where id = $1", [
    appointment,
  ]);
  expect(await statusOf("REVIEW_PERIO_3M")).toBe("pending");

  await db.query(
    "update public.appointments set status = 'PLANNED', starts_at = '2026-04-10T10:00:00+02:00' where id = $1",
    [appointment],
  );
  expect(await statusOf("REVIEW_PERIO_3M")).toBe("booked");
  await db.query(
    "update public.appointments set starts_at = '2026-09-01T10:00:00+02:00' where id = $1",
    [appointment],
  );
  expect(await statusOf("REVIEW_PERIO_3M")).toBe("pending");
});

test("una cita lejana no cubre revisiones y las no presentadas tampoco", async () => {
  const db = await database();
  await execute(db, "ROOT_PLANING", "PERIODONTICS", "2026-01-15T10:00:00+01:00");
  await db.query(
    `insert into public.appointments(clinic_id, patient_id, starts_at, status) values
       ($1, $2, '2026-03-01T10:00:00+01:00', 'PLANNED'),
       ($1, $2, '2026-04-15T10:00:00+02:00', 'NO_SHOW')`,
    [clinic, patient],
  );
  expect((await recalls(db)).every((row) => row.status === "pending")).toBe(true);
});

test("tras el primer año, cada revisión anual citada programa la siguiente", async () => {
  const db = await database();
  await db.query(
    `insert into public.implant_placement_outcomes(clinic_id, patient_id, outcome, placed_at)
     values ($1, $2, 'PLACED', '2026-01-10T10:00:00+01:00')`,
    [clinic, patient],
  );
  await db.query(
    `insert into public.appointments(clinic_id, patient_id, starts_at) values ($1, $2, '2027-01-12T10:00:00+01:00')`,
    [clinic, patient],
  );
  let rows = await recalls(db);
  expect(rows.find((row) => row.kind === "REVIEW_IMPLANT_12M")?.status).toBe("booked");
  expect(rows.find((row) => row.kind === "REVIEW_IMPLANT_ANNUAL")).toEqual({
    kind: "REVIEW_IMPLANT_ANNUAL",
    status: "pending",
    due: "2028-01-10",
    anchor: "2026-01-10",
  });

  await db.query(
    "update public.patient_recalls set status = 'booked' where kind = 'REVIEW_IMPLANT_ANNUAL'",
  );
  rows = await recalls(db);
  expect(rows.filter((row) => row.kind === "REVIEW_IMPLANT_ANNUAL").map((row) => row.due)).toEqual([
    "2028-01-10",
    "2029-01-10",
  ]);

  // Re-booking the same review never creates a second copy of the next one.
  await db.query(
    "update public.patient_recalls set status = 'pending' where review_due_date = '2028-01-10'",
  );
  await db.query(
    "update public.patient_recalls set status = 'booked' where review_due_date = '2028-01-10'",
  );
  expect((await recalls(db)).filter((row) => row.due === "2029-01-10")).toHaveLength(1);
});

test("una revisión descartada no programa la siguiente", async () => {
  const db = await database();
  await execute(db, "RETENEDOR_ESSIX", "ORTHODONTICS", "2026-01-10T10:00:00+01:00");
  await db.query(
    "update public.patient_recalls set status = 'dismissed' where kind = 'REVIEW_ORTHO_12M'",
  );
  expect((await recalls(db)).some((row) => row.kind === "REVIEW_ORTHO_ANNUAL")).toBe(false);
});

test("rechaza especialidades desconocidas", async () => {
  const db = await database();
  await expect(
    db.query("select private.schedule_treatment_reviews($1, $2, 'SURGERY', now())", [
      clinic,
      patient,
    ]),
  ).rejects.toThrow("INVALID_REVIEW_SPECIALTY");
});
