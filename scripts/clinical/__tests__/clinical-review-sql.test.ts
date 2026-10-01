import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
const patient = "00000000-0000-4000-8000-000000000002",
  clinic = "00000000-0000-4000-8000-000000000001";
async function fixture() {
  const db = new PGlite();
  await db.exec(await readFile("scripts/clinical/fixtures/clinical-core.sql", "utf8"));
  await db.exec(`create table periodontal_exams(id uuid primary key default gen_random_uuid(),clinic_id uuid,patient_id uuid,version int,title text,summary_json jsonb,diagnosis text,stage text,grade text,extent text,notes text,metadata jsonb,measured_at timestamptz,created_by uuid);
 create table periodontal_measurements(id uuid default gen_random_uuid(),clinic_id uuid,patient_id uuid,exam_id uuid,exam_version int,tooth text,site text,probing_depth int,recession int,bleeding boolean,plaque boolean,suppuration boolean,mobility int,furcation int,measured_at timestamptz);
 grant select,insert,update,delete on periodontal_exams,periodontal_measurements to authenticated;grant update on patients to authenticated;
 alter table dental_entities add column clinic_id uuid;`);
  const stage = await readFile(
    "supabase/migrations/20260928060000_stage6_clinical_pipeline.sql",
    "utf8",
  );
  await db.exec(
    stage.slice(
      stage.indexOf("create or replace function public.save_periodontal_exam"),
      stage.indexOf("-- 7)"),
    ),
  );
  await db.exec(
    await readFile("supabase/migrations/20261001170000_shared_mouth_validation.sql", "utf8"),
  );
  await db.exec(
    await readFile("supabase/migrations/20261001180000_clinical_diagnoses.sql", "utf8"),
  );
  await db.exec(
    await readFile("supabase/migrations/20261001190000_periodontal_drafts.sql", "utf8"),
  );
  await db.exec(
    await readFile("supabase/migrations/20261001200000_clinical_review_fixes.sql", "utf8"),
  );
  const generation = (
    await db.query<{ exists: boolean }>(
      "select exists(select 1 from information_schema.columns where table_name='periodontal_drafts' and column_name='draft_id')",
    )
  ).rows[0]!.exists;
  await db.exec("set role authenticated");
  const save = async (version: number, id: string | null) => {
    const q = generation
      ? "select save_periodontal_draft($1,$2,$3::uuid,$4::jsonb) as value"
      : "select save_periodontal_draft($1,$2,$3::jsonb) as value";
    return (
      await db.query<{ value: { id?: string; version: number; data: unknown } }>(
        q,
        generation ? [patient, version, id, "{}"] : [patient, version, "{}"],
      )
    ).rows[0]!.value;
  };
  const finish = async (version: number, id: string | null) => {
    const exam = JSON.stringify({ sites: [{ tooth: "36", site: "MV", probingDepth: 4 }] });
    return (
      await db.query<{ value: { examId: string } }>(
        generation
          ? "select finish_periodontal_draft($1,$2,$3::uuid,$4::jsonb) as value"
          : "select finish_periodontal_draft($1,$2,$3::jsonb) as value",
        generation ? [patient, version, id, exam] : [patient, version, exam],
      )
    ).rows[0]!.value;
  };
  return { db, save, finish };
}
test("draft generation rejects a stale tab after another exam starts and finish retries are idempotent", async () => {
  const { db, save, finish } = await fixture();
  try {
    const a = await save(0, null),
      completed = await finish(a.version, a.id ?? null),
      b = await save(0, null);
    await expect(save(a.version, a.id ?? null)).rejects.toThrow("VERSION_CONFLICT");
    expect(await finish(a.version, a.id ?? null)).toEqual(completed);
    expect((await db.query("select * from periodontal_exams")).rows).toHaveLength(1);
    await db.exec(await readFile("supabase/tests/clinical-review-fixes.sql", "utf8"));
    expect(
      (await db.query<{ version: number }>("select version from periodontal_drafts")).rows[0]
        ?.version,
    ).toBe(b.version);
  } finally {
    await db.close();
  }
}, 15000);
test("reception cannot read, delete or mutate clinical drafts directly or through RPC", async () => {
  const { db, save } = await fixture();
  try {
    const draft = await save(0, null);
    await db.exec("reset role;update clinic_members set role='RECEPTION';set role authenticated");
    expect(
      (await db.query("delete from periodontal_drafts returning patient_id")).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from periodontal_drafts")).rows).toHaveLength(0);
    await expect(save(draft.version, draft.id ?? null)).rejects.toThrow("FORBIDDEN");
    await expect(
      db.query(
        "insert into periodontal_drafts(patient_id,clinic_id,version,data) values($1,$2,1,$3::jsonb)",
        [patient, clinic, "{}"],
      ),
    ).rejects.toThrow();
  } finally {
    await db.close();
  }
}, 15000);
test("SQL treats implant under review as an implant for probing and natural tooth exclusion", async () => {
  const { db } = await fixture();
  try {
    await db.query(
      "insert into dental_entities(patient_id,clinic_id,tooth,entity_type,status,active) values($1,$2,'36','IMPLANT','implant_review',true)",
      [patient, clinic],
    );
    const plan = (
      await db.query<{ id: string }>(
        "insert into clinical_plans(patient_id,clinic_id) values($1,$2) returning id",
        [patient, clinic],
      )
    ).rows[0]!.id;
    await expect(
      db.query(
        "insert into clinical_plan_items(plan_id,clinic_id,tooth,treatment_code,status) values($1,$2,'36','ENDODONTICS','PLANNED')",
        [plan, clinic],
      ),
    ).rejects.toThrow("TOOTH_UNAVAILABLE");
    await db.query(
      "insert into dental_entities(patient_id,clinic_id,tooth,entity_type,status,active) values($1,$2,'36','MISSING','missing',true)",
      [patient, clinic],
    );
    expect(
      (
        await db.query<{ ok: boolean }>("select private.tooth_is_probeable($1,$2) as ok", [
          patient,
          "36",
        ])
      ).rows[0]?.ok,
    ).toBe(true);
  } finally {
    await db.close();
  }
}, 15000);
