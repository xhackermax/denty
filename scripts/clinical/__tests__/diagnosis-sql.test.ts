import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { test, expect } from "vitest";
test("diagnosis SQL preserves history, tenant isolation, catalog prices, quadrant trace and consent", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile("scripts/clinical/fixtures/clinical-core.sql", "utf8"));
    const legacy = await readFile(
      "supabase/migrations/20260929153119_odontogram_plan_sync.sql",
      "utf8",
    );
    await db.exec(
      legacy.slice(
        legacy.indexOf("create or replace function private.odontogram_treatment_code"),
        legacy.indexOf("-- 3)"),
      ),
    );
    const stage6 = await readFile(
      "supabase/migrations/20260928060000_stage6_clinical_pipeline.sql",
      "utf8",
    );
    await db.exec(
      stage6.slice(
        stage6.indexOf("create or replace function public.refresh_consent_requirements"),
        stage6.indexOf("-- Keep requirement"),
      ),
    );
    await db.exec(
      stage6.slice(
        stage6.indexOf("create or replace function public.add_clinical_plan_item"),
        stage6.indexOf("-- Stage 2 could"),
      ),
    );
    await db.exec(
      await readFile("supabase/migrations/20260929180318_odontogram_findings_to_plan.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/20261001180000_clinical_diagnoses.sql", "utf8"),
    );
    await db.exec(`update treatment_catalog set default_price_cents=12500 where code='ROOT_PLANING';
 insert into clinics values('00000000-0000-4000-8000-000000000011');insert into patients(id,clinic_id) values('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000011');
 set role authenticated;`);
    const patient = "00000000-0000-4000-8000-000000000002";
    const create = async (input: unknown) =>
      db.query<{ value: { id: string } }>(
        "select create_clinical_diagnosis($1,$2::jsonb) as value",
        [patient, JSON.stringify(input)],
      );
    await expect(
      create({ category: "periodontal", value: "gingivitis", detail: {} }),
    ).rejects.toThrow();
    await create({
      category: "periodontal",
      value: "gingivitis",
      detail: {},
      justification: "Sangrado",
    });
    const result = await create({
      category: "periodontal",
      value: "periodontitis",
      detail: { stage: "III" },
      justification: "Pérdida de inserción interproximal",
    });
    const id = result.rows[0]!.value.id;
    await db.query("select add_diagnosis_plan_items($1,$2,$3::jsonb)", [
      patient,
      id,
      JSON.stringify([
        { code: "ROOT_PLANING", quadrant: 1 },
        { code: "ROOT_PLANING", quadrant: 4 },
      ]),
    ]);
    await db.query("select add_diagnosis_plan_items($1,$2,$3::jsonb)", [
      patient,
      id,
      JSON.stringify([{ code: "ROOT_PLANING", quadrant: 1 }]),
    ]);
    const items = await db.query(
      "select diagnosis_id,price_snapshot_cents,attributes_json from clinical_plan_items",
    );
    expect(items.rows).toHaveLength(2);
    expect(items.rows.every((r) => r.diagnosis_id === id && r.price_snapshot_cents === 12500)).toBe(
      true,
    );
    expect((await db.query("select consent_code,status from consent_requirements")).rows).toEqual([
      { consent_code: "CONSENT_PERIO", status: "REQUIRED" },
      { consent_code: "CONSENT_PERIO", status: "REQUIRED" },
    ]);
    expect((await db.query("select id from clinical_diagnoses")).rows).toHaveLength(2);
    await expect(
      db.query("select create_clinical_diagnosis($1,$2::jsonb)", [
        "00000000-0000-4000-8000-000000000012",
        JSON.stringify({ category: "periodontal", value: "healthy", detail: {} }),
      ]),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(
      db.query("select resolve_clinical_diagnosis($1,$2,2)", [patient, id]),
    ).rejects.toThrow(/CONFLICT/);
    await db.query("select resolve_clinical_diagnosis($1,$2,1)", [patient, id]);
    expect(
      (await db.query("select status from clinical_diagnoses where id=$1", [id])).rows,
    ).toEqual([{ status: "resolved" }]);
    await db.exec(await readFile("supabase/tests/clinical-diagnoses.sql", "utf8"));
  } finally {
    await db.close();
  }
}, 30000);
