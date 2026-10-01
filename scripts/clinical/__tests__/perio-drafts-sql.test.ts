import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
test("draft SQL serializes versions, finalizes once, preserves drafts on failure and isolates clinics", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile("scripts/clinical/fixtures/clinical-core.sql", "utf8"));
    await db.exec(`create function private.is_clinical_diagnostician(uuid) returns boolean language sql security definer as $$ select exists(select 1 from public.clinic_members where clinic_id=$1 and profile_id=auth.uid() and active and role in ('ADMIN','DENTIST')) $$;
 create table periodontal_exams(id uuid primary key default gen_random_uuid(),clinic_id uuid,patient_id uuid,version int,title text,summary_json jsonb,diagnosis text,stage text,grade text,extent text,notes text,metadata jsonb,measured_at timestamptz,created_by uuid);
 create table periodontal_measurements(id uuid default gen_random_uuid(),clinic_id uuid,patient_id uuid,exam_id uuid,exam_version int,tooth text,site text,probing_depth int,recession int,bleeding boolean,plaque boolean,suppuration boolean,mobility int,furcation int,measured_at timestamptz);
 grant select,insert,update,delete on periodontal_exams,periodontal_measurements to authenticated;grant update on patients to authenticated;
 alter table dental_entities add column clinic_id uuid;
 insert into clinics values('00000000-0000-4000-8000-000000000011');insert into patients(id,clinic_id) values('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000011');`);
    const stage6 = await readFile(
      "supabase/migrations/20260928060000_stage6_clinical_pipeline.sql",
      "utf8",
    );
    await db.exec(
      stage6.slice(
        stage6.indexOf("create or replace function public.save_periodontal_exam"),
        stage6.indexOf("-- 7)"),
      ),
    );
    await db.exec(
      await readFile("supabase/migrations/20261001170000_shared_mouth_validation.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/20261001190000_periodontal_drafts.sql", "utf8"),
    );
    await db.exec("set role authenticated");
    const p = "00000000-0000-4000-8000-000000000002";
    const save = (v: number) =>
      db.query("select save_periodontal_draft($1,$2,$3::jsonb)", [
        p,
        v,
        JSON.stringify({ exam: { teeth: {} } }),
      ]);
    await save(0);
    await expect(save(0)).rejects.toThrow("VERSION_CONFLICT");
    await save(1);
    await expect(
      db.query("select finish_periodontal_draft($1,2,$2::jsonb)", [
        p,
        JSON.stringify({ sites: [] }),
      ]),
    ).rejects.toThrow("EMPTY_EXAM");
    expect((await db.query("select * from periodontal_drafts")).rows).toHaveLength(1);
    await expect(
      db.query("select save_periodontal_draft($1,0,$2::jsonb)", [
        "00000000-0000-4000-8000-000000000012",
        "{}",
      ]),
    ).rejects.toThrow("FORBIDDEN");
    await db.query("select finish_periodontal_draft($1,2,$2::jsonb)", [
      p,
      JSON.stringify({
        sites: [{ tooth: "36", site: "MV", probingDepth: 4, recession: 2 }],
        metadata: { perioExam: { preserved: true } },
      }),
    ]);
    expect((await db.query("select * from periodontal_exams")).rows).toHaveLength(1);
    expect((await db.query("select * from periodontal_drafts")).rows).toHaveLength(0);
    await expect(
      db.query("select finish_periodontal_draft($1,2,$2::jsonb)", [
        p,
        '{"sites":[{"tooth":"36","site":"MV"}]}',
      ]),
    ).rejects.toThrow("VERSION_CONFLICT");
    await save(0);
    await db.exec(
      `reset role; insert into dental_entities(patient_id,clinic_id,tooth,entity_type,status,active) values('${p}','00000000-0000-4000-8000-000000000001','36','MISSING','missing',true);set role authenticated;`,
    );
    await expect(
      db.query("select finish_periodontal_draft($1,1,$2::jsonb)", [
        p,
        '{"sites":[{"tooth":"36","site":"MV","probingDepth":3}]}',
      ]),
    ).rejects.toThrow("TOOTH_UNAVAILABLE");
    expect((await db.query("select * from periodontal_drafts")).rows).toHaveLength(1);
    expect((await db.query("select recession from periodontal_measurements")).rows).toEqual([
      { recession: 2 },
    ]);
  } finally {
    await db.close();
  }
}, 15000);
