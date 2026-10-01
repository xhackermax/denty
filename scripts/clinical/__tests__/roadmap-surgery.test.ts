import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs/promises";
import { test, expect } from "vitest";
test("preserves findings, procedure prices and completed arch identity across row replacement", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema private; create schema auth; create role authenticated; create role anon;
create function auth.uid() returns uuid language sql as 'select null::uuid';
create function private.is_clinic_staff(uuid) returns boolean language sql as 'select true';
create table clinics(id uuid primary key);
create table patients(id uuid primary key,clinic_id uuid);
create table clinical_plans(id uuid primary key default gen_random_uuid(),clinic_id uuid,patient_id uuid,status text,source_odontogram_version int,version int,created_at timestamptz default now(),updated_at timestamptz default now());
create table treatment_catalog(id uuid default gen_random_uuid(),clinic_id uuid,code text,name text,specialty text,category text,default_price_cents int,base_cost_cents int,active boolean,metadata jsonb default '{}',unique(clinic_id,code));
create table dental_entities(id uuid primary key default gen_random_uuid(),patient_id uuid,tooth text,arch text,entity_type text,status text,active boolean,attributes_json jsonb,surfaces_json jsonb,version int default 1,created_at timestamptz default now());
create table clinical_plan_items(id uuid primary key default gen_random_uuid(),clinic_id uuid,plan_id uuid,dental_entity_id uuid,tooth text,treatment_code text,label text,clinical_reason text,phase int,priority int,status text,price_cents int,attributes_json jsonb default '{}',treatment_catalog_id uuid,treatment_code_snapshot text,label_snapshot text,price_snapshot_cents int,cost_snapshot_cents int,treatment_metadata_snapshot jsonb,is_ad_hoc boolean,created_at timestamptz default now());
create table clinical_history_events(clinic_id uuid,patient_id uuid,actor_id uuid,event_type text,entity_id uuid,entity_type text,payload_json jsonb);
create function public.refresh_consent_requirements(uuid) returns void language sql as 'select';
insert into clinics values('00000000-0000-4000-8000-000000000001');
insert into patients values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');`);
    const root = process.cwd() + "/supabase/migrations/";
    const legacy = await fs.readFile(root + "20260929153119_odontogram_plan_sync.sql", "utf8");
    await db.exec(
      legacy.slice(
        legacy.indexOf("create or replace function private.odontogram_treatment_code"),
        legacy.indexOf("-- 3)"),
      ),
    );
    await db.exec(
      await fs.readFile(root + "20260929180318_odontogram_findings_to_plan.sql", "utf8"),
    );
    const patient = "00000000-0000-4000-8000-000000000002";
    await db.query(
      `insert into dental_entities(patient_id,tooth,entity_type,status,active,attributes_json,surfaces_json) values($1,'25','CARIES','caries',true,'{}','["O"]'),($1,'26','CROWN','crown_unsatisfactory',true,'{}','[]')`,
      [patient],
    );
    await db.query("select sync_clinical_plan($1)", [patient]);
    await db.exec(
      await fs.readFile(root + "20261001150000_roadmap_surgery_procedures.sql", "utf8"),
    );
    for (const [i, p] of [
      "gingivectomy",
      "bone_regularization",
      "guided_surgery_splint",
      "titanium_mesh",
    ].entries()) {
      await db.query(
        `insert into dental_entities(patient_id,tooth,arch,entity_type,status,active,attributes_json,surfaces_json) values($1,$2,$3,$4,$5,true,$6::jsonb,'[]')`,
        [
          patient,
          p === "guided_surgery_splint" ? null : String(11 + i),
          p === "guided_surgery_splint" ? "upper" : null,
          p === "titanium_mesh" ? "MEMBRANE" : "SURGERY",
          p,
          JSON.stringify({ procedure: p, lifecycle: "PLANIFICADO" }),
        ],
      );
    }
    await db.exec("update treatment_catalog set default_price_cents=12345");
    await db.query("select sync_clinical_plan($1)", [patient]);
    await db.query("select sync_clinical_plan($1)", [patient]);
    let result = await db.query(
      "select treatment_code,tooth,status,clinical_reason,price_snapshot_cents from clinical_plan_items order by treatment_code",
    );
    expect(result.rows).toHaveLength(6);
    expect(result.rows.find((r) => r.treatment_code === "FILLING")).toMatchObject({
      status: "PLANNED",
      clinical_reason: "Caries · caras O",
    });
    expect(result.rows.find((r) => r.treatment_code === "CROWN_ZIRCONIA")).toMatchObject({
      status: "PLANNED",
      clinical_reason: "Rehacer",
    });
    expect(result.rows.find((r) => r.treatment_code === "GUIDED_SURGERY_SPLINT")).toMatchObject({
      tooth: null,
      price_snapshot_cents: 12345,
    });
    await db.exec(
      `insert into dental_entities(patient_id,tooth,arch,entity_type,status,active,attributes_json,surfaces_json,version) select patient_id,tooth,arch,entity_type,status,true,jsonb_set(attributes_json,'{lifecycle}','"REALIZADO"'),'[]',2 from dental_entities where attributes_json->>'procedure'='guided_surgery_splint'; update dental_entities set active=false where attributes_json->>'procedure'='guided_surgery_splint' and version=1;`,
    );
    await db.query("select sync_clinical_plan($1)", [patient]);
    result = await db.query(
      "select status from clinical_plan_items where treatment_code='GUIDED_SURGERY_SPLINT'",
    );
    expect(result.rows).toEqual([{ status: "COMPLETED" }]);
  } finally {
    await db.close();
  }
}, 30000);
