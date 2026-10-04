import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fakeSupabase, isolatePage, PATIENT_ID, signIn } from "./support/session";

const editor = `/app/patients/${PATIENT_ID}/odontogram`;
const backend = `http://127.0.0.1:${process.env.FAKE_SUPABASE_PORT ?? 54399}`;
const clinic = "00000000-0000-4000-8000-000000000001";
const entityId = "00000000-0000-4000-8000-0000000000f1";

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

for (const entityType of [
  "SURGERY",
  "BONE_GRAFT",
  "MEMBRANE",
  "SINUS_LIFT",
  "SURGICAL_LESION",
  "IMPLANT_COMPONENT",
  "PROSTHETIC_STRUCTURE",
  "PERIODONTAL_FINDING",
]) {
  test(`RG005 reload persisted ${entityType} without losing the odontogram editor`, async ({
    page,
  }, info) => {
    const failures = await isolatePage(page);
    // Seed the external backend, then exercise the actual Next route, decoder and React editor.
    const inserted = await fetch(`${backend}/rest/v1/dental_entities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: entityId,
        clinic_id: clinic,
        patient_id: PATIENT_ID,
        tooth: "36",
        entity_type: entityType,
        status: "planned",
        active: true,
        version: 2,
        surfaces_json: [],
        attributes_json: {},
        parent_id: null,
        created_at: new Date().toISOString(),
      }),
    });
    expect(inserted.ok).toBe(true);
    await page.goto(editor);
    try {
      await expect(
        page.getByRole("button", { name: "Diente 36 superficie oclusal", exact: true }),
      ).toBeVisible();
      expect(failures).toEqual([]);
    } finally {
      const screenshot = info.outputPath("persisted-entity-reload.png");
      await page.screenshot({ path: screenshot, fullPage: true });
      await info.attach("persisted-entity-reload.png", {
        path: screenshot,
        contentType: "image/png",
      });
      const errors = info.outputPath("javascript-errors.json");
      await writeFile(errors, JSON.stringify(failures));
      await info.attach("javascript-errors.json", {
        path: errors,
        contentType: "application/json",
      });
    }
  });
}

for (const [name, entity] of [
  ["impossible FDI", { tooth: "99", entityType: "CARIES", status: "caries", surfaces: ["O"] }],
  ["blank FDI", { tooth: " ", entityType: "CARIES", status: "caries", surfaces: ["O"] }],
  ["invalid surface", { tooth: "36", entityType: "CARIES", status: "caries", surfaces: ["X"] }],
  ["unknown entity type", { tooth: "36", entityType: "UNKNOWN", status: "planned" }],
  ["impossible status", { tooth: "36", entityType: "CARIES", status: "impossible_status" }],
] as const) {
  test(`BD API rejects ${name} before any database write`, async ({ context, baseURL }, info) => {
    const response = await context.request.post(`/api/patients/${PATIENT_ID}/odontogram/batch`, {
      headers: { Origin: baseURL! },
      data: { expectedVersion: 1, entities: [{ id: entityId, ...entity, active: true }] },
    });
    const responsePath = info.outputPath("api-response.json");
    await writeFile(
      responsePath,
      JSON.stringify({ status: response.status(), body: await response.json() }),
    );
    await info.attach("api-response.json", { path: responsePath, contentType: "application/json" });
    expect(response.status()).toBe(400);
    expect((await fakeSupabase.state()).dental_entities).toHaveLength(0);
  });
}

test("SQ snapshot selection before autosave preserves the pending clinical edit", async ({
  page,
}, info) => {
  const inserted = await fetch(`${backend}/rest/v1/odontogram_snapshots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: entityId,
      clinic_id: clinic,
      patient_id: PATIENT_ID,
      label: "Control previo",
      version: 1,
      created_at: new Date().toISOString(),
      payload_json: { version: 1, entities: [], periodontal: [] },
    }),
  });
  expect(inserted.ok).toBe(true);
  const failures = await isolatePage(page);
  await page.goto(editor);
  await page.getByRole("button", { name: "Historial", exact: true }).click();
  const view = page.getByRole("button", { name: "Ver", exact: true });
  await expect(view).toBeVisible();
  const clockStart = new Date();
  await page.clock.install({ time: clockStart });
  await page.clock.pauseAt(new Date(clockStart.getTime() + 1000));
  await page.getByRole("button", { name: "Diente 36 superficie oclusal", exact: true }).click();
  await expect(page.getByText("Cambios pendientes…", { exact: true })).toBeVisible();
  await view.click();
  await page.getByRole("button", { name: "Volver al actual", exact: true }).click();
  // Autosave debounces for 1200 ms; advance beyond it if selection preserves the draft.
  await page.clock.runFor(2500);
  const screenshot = info.outputPath("snapshot-return.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  await info.attach("snapshot-return.png", { path: screenshot, contentType: "image/png" });
  await expect.poll(async () => (await fakeSupabase.state()).dental_entities?.length).toBe(1);
  expect(failures).toEqual([]);
});

test("RG002 undo the final saved finding persists an empty odontogram", async ({ page }, info) => {
  const failures = await isolatePage(page);
  await page.goto(editor);
  await page.getByRole("button", { name: "Diente 36 superficie oclusal", exact: true }).click();
  await expect(page.getByText("Guardado · plan y presupuesto al día", { exact: true })).toBeVisible(
    { timeout: 15_000 },
  );
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  try {
    await expect(
      page.getByText("Guardado · plan y presupuesto al día", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(
        async () =>
          (await fakeSupabase.state()).dental_entities?.filter((row) => row.active).length,
      )
      .toBe(0);
    await page.reload();
    await expect(page.getByText("v3", { exact: true })).toBeVisible();
    expect(failures).toEqual([]);
  } finally {
    const screenshot = info.outputPath("undo-final-finding.png");
    await page.screenshot({ path: screenshot, fullPage: true });
    await info.attach("undo-final-finding.png", { path: screenshot, contentType: "image/png" });
  }
});
