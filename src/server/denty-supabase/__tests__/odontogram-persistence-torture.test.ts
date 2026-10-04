import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { validatePeriodontalReading } from "@/domain/periodontal";
import { periodontalExamInputSchema } from "@/shared/api/schemas/clinical";

// Isolated SQL behavior fixture: real checked-in function bodies and pertinent original
// dental/perio constraints. Auth and unrelated helper functions are explicit stubs.
// This is not a deployed Supabase, RLS, trigger, or concurrent transaction test.
const patient = "00000000-0000-0000-0000-000000000002";
const clinic = "00000000-0000-0000-0000-000000000003";
const implantId = "00000000-0000-0000-0000-000000000004";
const componentId = "00000000-0000-0000-0000-000000000005";
const planId = "00000000-0000-0000-0000-000000000006";
const migration = (name: string) => readFileSync(resolve("supabase/migrations", name), "utf8");
const core = migration("20260926200500_initial_clinical_core.sql");
const stage6 = migration("20260928060000_stage6_clinical_pipeline.sql");
function originalTable(source: string, name: string): string {
  const start = source.indexOf(`create table if not exists public.${name} (`);
  if (start < 0) throw new Error(`Missing original table ${name}`);
  return source.slice(start, source.indexOf("\n);", start) + 3);
}
// Later migrations redefine functions; the database runs whichever definition came last.
function latestFunction(name: string): string {
  const files = readdirSync(resolve("supabase/migrations")).sort().reverse();
  for (const file of files) {
    const source = migration(file);
    if (source.includes(`create or replace function public.${name}(`)) {
      return originalFunction(source, name);
    }
  }
  throw new Error(`Missing function ${name}`);
}
function originalFunction(source: string, name: string): string {
  const start = source.indexOf(`create or replace function public.${name}(`);
  if (start < 0) throw new Error(`Missing original function ${name}`);
  const bodyStart = source.indexOf("$$", start);
  const end = source.indexOf("$$;", bodyStart + 2);
  if (end < 0) throw new Error(`Unterminated function ${name}`);
  return source.slice(start, end + 3);
}
const implant = {
  id: implantId,
  tooth: "11",
  entityType: "IMPLANT",
  status: "implant_planned",
  active: true,
};
const site = {
  tooth: "16",
  site: "MV" as const,
  probingDepth: 3,
  recession: 0,
  bleeding: false,
  plaque: false,
  mobility: 0,
  furcation: 0,
};
type BatchResult = {
  version: number;
  conflict?: boolean;
  currentVersion?: number;
  entities: { id: string; parent_id: string | null; entity_type: string; active: boolean }[];
};
let db: PGlite;
async function save(version: number, entities: unknown[]): Promise<BatchResult> {
  const result = await db.query<{ result: BatchResult }>(
    "select public.save_odontogram_batch($1,$2,$3::jsonb) result",
    [patient, version, JSON.stringify(entities)],
  );
  return result.rows[0]!.result;
}
const saveExam = (reading: typeof site) =>
  db.query("select public.save_periodontal_exam($1,$2::jsonb) result", [
    patient,
    JSON.stringify({ title: "Range proof", sites: [reading] }),
  ]);

describe("SQL persistence torture: isolated original migration functions", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create schema private; create schema auth;
      create function auth.uid() returns uuid language sql as $$ select '00000000-0000-0000-0000-000000000001'::uuid $$;
      create function private.is_clinic_staff(uuid) returns boolean language sql as $$ select true $$;
      create table clinics(id uuid primary key);
      create table patients(id uuid primary key, clinic_id uuid references clinics(id));
      insert into clinics values ('${clinic}');
      insert into patients values ('${patient}','${clinic}');
    `);
    await db.exec(originalTable(core, "dental_entities"));
    await db.exec(originalTable(core, "clinical_history_events"));
    await db.exec(originalTable(core, "periodontal_measurements"));
    await db.exec(originalTable(stage6, "periodontal_exams"));
    const alterStart = stage6.indexOf("alter table public.periodontal_measurements");
    const alterEnd = stage6.indexOf("\n-- 2)", alterStart);
    await db.exec(stage6.slice(alterStart, alterEnd));
    // Budget tables include all fields used by the original function. They model
    // version coupling, not unrelated commercial constraints or consent workflows.
    await db.exec(`
      create table clinical_plans(id uuid primary key,clinic_id uuid,patient_id uuid,version int,source_odontogram_version int,updated_at timestamptz default now());
      create table budgets(id uuid primary key default gen_random_uuid(),clinic_id uuid,patient_id uuid,clinical_plan_id uuid,code text,status text,total_cents int,source_plan_version int,revision int,version int);
      create table clinical_plan_items(id uuid,clinic_id uuid,plan_id uuid,billing_mode text,status text,price_snapshot_cents int,price_cents int,component_type text,label_snapshot text,label text,tooth text);
      create table budget_items(clinic_id uuid,budget_id uuid,clinical_plan_item_id uuid,component_type text,description text,tooth text,billing_mode text,quantity int,unit_price_cents int,total_cents int);
      create function public.refresh_consent_requirements(uuid) returns void language sql as $$ select $$;
    `);
    await db.exec(latestFunction("save_odontogram_batch"));
    await db.exec(latestFunction("save_periodontal_exam"));
    await db.exec(latestFunction("sync_budget_from_plan"));
  }, 30_000);
  beforeEach(async () => {
    await db.exec(
      "truncate dental_entities,clinical_history_events,periodontal_exams,periodontal_measurements,clinical_plans,budgets,clinical_plan_items,budget_items cascade",
    );
  });
  afterAll(async () => {
    await db?.close();
  });

  it("CTRL004 SQL generates a fresh UUID as documented snapshot identity", async () => {
    const saved = await save(1, [implant]);
    expect(saved.entities[0]?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(saved.entities[0]?.id).not.toBe(implantId);
  });
  it("RG014 SQL preserves implant-component parent relationship", async () => {
    const saved = await save(1, [
      implant,
      {
        ...implant,
        id: componentId,
        entityType: "IMPLANT_COMPONENT",
        status: "planned",
        parentId: implantId,
      },
    ]);
    const component = saved.entities.find((value) => value.entity_type === "IMPLANT_COMPONENT");
    const persistedImplant = saved.entities.find((value) => value.entity_type === "IMPLANT");
    expect(persistedImplant).toBeDefined();
    expect(component?.parent_id).toBe(persistedImplant!.id);
  });
  it("SQ007 all-inactive save stores its returned optimistic version durably", async () => {
    const first = await save(1, [implant]);
    const inactive = await save(first.version, [{ ...implant, active: false }]);
    expect(inactive.entities).toEqual([]);
    const persisted = await db.query<{ version: number }>(
      "select coalesce(max(version),1) version from dental_entities where patient_id=$1",
      [patient],
    );
    expect(persisted.rows[0]?.version).toBe(inactive.version);
  });
  it("SQ008 next save accepts version returned by all-inactive save", async () => {
    const first = await save(1, [implant]);
    const inactive = await save(first.version, [{ ...implant, active: false }]);
    const next = await save(inactive.version, [implant]);
    expect(next.conflict).not.toBe(true);
    expect(next.version).toBe(inactive.version + 1);
  });
  it.each([
    ["anatomy", { tooth: "99" }],
    ["entity type", { entityType: "ARBITRARY_TYPE" }],
    ["status", { status: "arbitrary_invalid" }],
  ])("BD011 SQL rejects invalid %s", async (_kind, override) => {
    await expect(save(1, [{ ...implant, ...override }])).rejects.toThrow();
    expect((await db.query("select id from dental_entities")).rows).toHaveLength(0);
  });
  it("RG015 stale odontogram source prevents budget sync", async () => {
    await save(1, [implant]);
    await save(2, [implant]); // latest odontogram version is 3
    await db.query(
      "insert into clinical_plans(id,clinic_id,patient_id,version,source_odontogram_version) values($1,$2,$3,7,2)",
      [planId, clinic, patient],
    );
    await expect(db.query("select public.sync_budget_from_plan($1)", [patient])).rejects.toThrow();
    expect((await db.query("select id from budgets")).rows).toHaveLength(0);
  });
  it.each([
    ["probingDepth", 16],
    ["recession", -6],
    ["mobility", 4],
    ["furcation", 4],
  ] as const)("BD012 SQL rejects domain-invalid periodontal %s=%i", async (field, value) => {
    const reading = { ...site, [field]: value };
    expect(() => validatePeriodontalReading(reading)).toThrow(RangeError);
    // Current API schema accepts these cases. Assert SQL rejection directly, so
    // an API acceptance failure cannot hide whether persistence also accepts it.
    const apiInput = periodontalExamInputSchema.safeParse({ sites: [reading] });
    if (!apiInput.success)
      throw new Error(`Fixture API contract changed: ${apiInput.error.message}`);
    await expect(saveExam(reading)).rejects.toThrow();
    expect((await db.query("select id from periodontal_exams")).rows).toHaveLength(0);
  });
  it("CTRL001 valid periodontal limits persist using original checks", async () => {
    const reading = { ...site, probingDepth: 15, recession: -5, mobility: 3, furcation: 3 };
    expect(() => validatePeriodontalReading(reading)).not.toThrow();
    await expect(saveExam(reading)).resolves.toBeDefined();
    expect(
      (
        await db.query(
          "select probing_depth,recession,mobility,furcation from periodontal_measurements",
        )
      ).rows[0],
    ).toEqual({ probing_depth: 15, recession: -5, mobility: 3, furcation: 3 });
  });
  it("CTRL002 existing lower-bound database constraint rejects negative probing", async () => {
    await expect(saveExam({ ...site, probingDepth: -1 })).rejects.toThrow();
    expect((await db.query("select id from periodontal_exams")).rows).toHaveLength(0);
  });
  it("CTRL003 normal save advances version and stale write remains atomic", async () => {
    const first = await save(1, [implant]);
    expect(first.version).toBe(2);
    const conflict = await save(1, [implant]);
    expect(conflict).toMatchObject({ conflict: true, currentVersion: 2 });
    expect((await db.query("select id from dental_entities where active")).rows).toHaveLength(1);
  });
});
