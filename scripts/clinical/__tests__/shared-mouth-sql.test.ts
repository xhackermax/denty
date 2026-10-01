import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { test, expect } from "vitest";
test("SQL protects periodontal writes and preserves valid sites", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema private;create role authenticated;create role anon;
 create table patients(id uuid,birth_date date);create table dental_entities(patient_id uuid,tooth text,entity_type text,status text,active boolean,attributes_json jsonb);
 create table periodontal_measurements(patient_id uuid,tooth text);create table clinical_plans(id uuid,patient_id uuid);
 create table clinical_plan_items(tooth text,status text,treatment_code_snapshot text,treatment_code text,plan_id uuid);
 insert into patients values('00000000-0000-4000-8000-000000000002',null);
 insert into dental_entities values('00000000-0000-4000-8000-000000000002','36','MISSING','missing',true,'{}');`);
    await db.exec(
      await readFile("supabase/migrations/20261001170000_shared_mouth_validation.sql", "utf8"),
    );
    await db.exec(await readFile("supabase/tests/shared-mouth.sql", "utf8"));
    expect((await db.query("select tooth from periodontal_measurements")).rows).toEqual([
      { tooth: "36" },
    ]);
  } finally {
    await db.close();
  }
}, 30000);
