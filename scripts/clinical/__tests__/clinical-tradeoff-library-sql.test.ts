import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeEach, expect, test } from "vitest";

const MIGRATION = "supabase/migrations/20261021120000_clinical_tradeoff_library.sql";
const clinic = "00000000-0000-4000-8000-000000000001";
const patient = "00000000-0000-4000-8000-000000000002";
const dentist = "00000000-0000-4000-8000-000000000003";
const otherClinic = "00000000-0000-4000-8000-000000000011";
const otherPatient = "00000000-0000-4000-8000-000000000012";
const assistant = "00000000-0000-4000-8000-000000000013";

let db: PGlite;

// The fixture's dentist is a catalog manager here; the assistant only reads.
beforeEach(async () => {
  db = new PGlite();
  await db.exec(await readFile("scripts/clinical/fixtures/clinical-core.sql", "utf8"));
  await db.exec(`
    create function private.is_clinical_diagnostician(uuid) returns boolean language sql security definer as
      $$ select exists(select 1 from public.clinic_members where clinic_id=$1 and profile_id=auth.uid() and active and role in ('ADMIN','DENTIST')) $$;
    create function private.can_manage_catalog(uuid) returns boolean language sql security definer as
      $$ select exists(select 1 from public.clinic_members where clinic_id=$1 and profile_id=auth.uid() and active and role in ('ADMIN','DENTIST')) $$;
    insert into clinics values ('${otherClinic}');
    insert into patients(id, clinic_id) values ('${otherPatient}', '${otherClinic}');
    insert into clinic_members values ('${clinic}', '${assistant}', true, 'ASSISTANT');
  `);
  await db.exec(await readFile(MIGRATION, "utf8"));
  await db.exec("set role authenticated");
});

const as = (profile: string) =>
  db.query("select set_config('request.jwt.claim.sub', $1, false)", [profile]);

const saveOverride = (phraseId: string, entryId: string, text: string | null, hidden = false) =>
  db.query(
    `insert into clinical_argument_overrides(clinic_id, phrase_id, entry_id, kind, text, hidden)
     values ($1, $2, $3, 'advantage', $4, $5)
     on conflict (clinic_id, phrase_id) do update set text = excluded.text, hidden = excluded.hidden`,
    [clinic, phraseId, entryId, text, hidden],
  );

const comparison = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    decision: "POSTPONED",
    decisionNote: "Lo pensará con su familia",
    catalogVersion: "1.0",
    professionalName: "Dra. Ruiz",
    content: { options: [] },
    ...overrides,
  });

test("una clínica edita, oculta y restaura frases y queda un historial de cada cambio", async () => {
  await saveOverride("b.implante-unitario.A1", "b.implante-unitario", "Diente fijo.");
  await saveOverride("b.implante-unitario.A1", "b.implante-unitario", null, true);
  await db.query("delete from clinical_argument_overrides where phrase_id = $1", [
    "b.implante-unitario.A1",
  ]);
  expect((await db.query("select * from clinical_argument_overrides")).rows).toHaveLength(0);
  const history = await db.query<{ action: string; before: unknown; after: unknown }>(
    "select action, before, after, changed_by from clinical_argument_override_history order by changed_at, action",
  );
  expect(history.rows.map((row) => row.action)).toEqual(["SAVE", "SAVE", "RESTORE"]);
  expect(history.rows[0]).toMatchObject({ before: null, changed_by: dentist });
  expect(history.rows[2]).toMatchObject({ after: null });
});

test("guarda un orden completo en una sola llamada y restaura frases sueltas", async () => {
  const order = (ids: string[]) =>
    JSON.stringify(
      ids.map((id, position) => ({
        phraseId: `b.corona-completa.${id}`,
        entryId: "b.corona-completa",
        kind: "advantage",
        position,
      })),
    );
  const saved = await db.query<{ count: number }>(
    "select save_argument_overrides($1, $2::jsonb) as count",
    [clinic, order(["A2", "A1"])],
  );
  expect(saved.rows[0]?.count).toBe(2);
  // Same values again: no new history rows.
  await db.query("select save_argument_overrides($1, $2::jsonb)", [clinic, order(["A2", "A1"])]);
  expect((await db.query("select * from clinical_argument_override_history")).rows).toHaveLength(2);
  await expect(
    db.query("select save_argument_overrides($1, $2::jsonb)", [clinic, order(["A1", "bad id"])]),
  ).rejects.toThrow(/check/);
  expect(
    (await db.query("select phrase_id from clinical_argument_overrides order by position")).rows,
  ).toEqual([{ phrase_id: "b.corona-completa.A2" }, { phrase_id: "b.corona-completa.A1" }]);
  await expect(
    db.query("select save_argument_overrides($1, '[]'::jsonb)", [clinic]),
  ).rejects.toThrow("INVALID_OVERRIDES");
  const restored = await db.query<{ count: number }>(
    "select restore_argument_overrides($1, $2) as count",
    [clinic, ["b.corona-completa.A2"]],
  );
  expect(restored.rows[0]?.count).toBe(1);
  await as(assistant);
  await expect(
    db.query("select restore_argument_overrides($1, $2)", [clinic, ["b.corona-completa.A1"]]),
  ).rejects.toThrow("FORBIDDEN");
  await expect(
    db.query("select save_argument_overrides($1, $2::jsonb)", [clinic, order(["A1"])]),
  ).rejects.toThrow("FORBIDDEN");
});

test("el historial no se puede escribir ni borrar desde la aplicación", async () => {
  await expect(
    db.query(
      `insert into clinical_argument_override_history(clinic_id, phrase_id, entry_id, action)
       values ($1, 'b.x.A1', 'b.x', 'SAVE')`,
      [clinic],
    ),
  ).rejects.toThrow(/permission denied/);
});

test("rechaza frases propias sin texto, ids mal formados y frases de otro tratamiento", async () => {
  await expect(
    db.query(
      `insert into clinical_argument_overrides(clinic_id, phrase_id, entry_id, kind, custom)
       values ($1, 'b.implante-unitario.C-1', 'b.implante-unitario', 'advantage', true)`,
      [clinic],
    ),
  ).rejects.toThrow(/check/);
  await expect(saveOverride("implante", "b.implante-unitario", "x")).rejects.toThrow(/check/);
  await expect(saveOverride("b.corona-completa.A1", "b.implante-unitario", "x")).rejects.toThrow(
    /check/,
  );
});

test("solo quien gestiona el catálogo cambia frases, y cada clínica ve solo las suyas", async () => {
  await as(assistant);
  await expect(saveOverride("b.implante-unitario.A1", "b.implante-unitario", "x")).rejects.toThrow(
    /row-level security/,
  );
  await as(dentist);
  await saveOverride("b.implante-unitario.A1", "b.implante-unitario", "Diente fijo.");
  await expect(
    db.query(
      `insert into clinical_argument_overrides(clinic_id, phrase_id, entry_id, kind, text)
       values ($1, 'b.implante-unitario.A1', 'b.implante-unitario', 'advantage', 'x')`,
      [otherClinic],
    ),
  ).rejects.toThrow(/row-level security/);
  await as(assistant);
  expect((await db.query("select * from clinical_argument_overrides")).rows).toHaveLength(1);
  await as(otherPatient);
  expect((await db.query("select * from clinical_argument_overrides")).rows).toHaveLength(0);
});

test("cada guardado de la comparación añade una versión inmutable a la misma serie", async () => {
  const first = await db.query<{ row: { series_id: string; version: number; created_by: string } }>(
    "select save_treatment_comparison($1, null, $2::jsonb) as row",
    [patient, comparison()],
  );
  const series = first.rows[0]!.row.series_id;
  expect(first.rows[0]!.row).toMatchObject({ version: 1, created_by: dentist });
  const second = await db.query<{ row: { version: number; decision: string } }>(
    "select save_treatment_comparison($1, $2, $3::jsonb) as row",
    [patient, series, comparison({ decision: "ACCEPTED", chosenOptionId: "budget-b" })],
  );
  expect(second.rows[0]!.row).toMatchObject({ version: 2, decision: "ACCEPTED" });
  await expect(
    db.query("update patient_treatment_comparisons set decision = 'DECLINED'"),
  ).rejects.toThrow(/permission denied|COMPARISON_IMMUTABLE/);
  await db.exec("reset role");
  await expect(db.query("delete from patient_treatment_comparisons")).rejects.toThrow(
    "COMPARISON_IMMUTABLE",
  );
});

test("valida la decisión: aceptar exige la opción elegida y no se admiten estados libres", async () => {
  const save = (input: string) =>
    db.query("select save_treatment_comparison($1, null, $2::jsonb)", [patient, input]);
  await expect(save(comparison({ decision: "ACCEPTED" }))).rejects.toThrow(/check/);
  await expect(save(comparison({ decision: "MAYBE" }))).rejects.toThrow(/check/);
  await expect(save(comparison({ chosenOptionId: "budget-a" }))).rejects.toThrow(/check/);
  await expect(save(comparison({ professionalName: " " }))).rejects.toThrow(/check/);
});

test("no guarda comparaciones de otra clínica, de otra serie ni sin rol clínico", async () => {
  await expect(
    db.query("select save_treatment_comparison($1, null, $2::jsonb)", [otherPatient, comparison()]),
  ).rejects.toThrow("FORBIDDEN");
  await expect(
    db.query("select save_treatment_comparison($1, gen_random_uuid(), $2::jsonb)", [
      patient,
      comparison(),
    ]),
  ).rejects.toThrow("COMPARISON_NOT_FOUND");
  await as(assistant);
  await expect(
    db.query("select save_treatment_comparison($1, null, $2::jsonb)", [patient, comparison()]),
  ).rejects.toThrow("FORBIDDEN");
  await expect(
    db.query("select save_treatment_comparison(gen_random_uuid(), null, $1::jsonb)", [
      comparison(),
    ]),
  ).rejects.toThrow("PATIENT_NOT_FOUND");
});
