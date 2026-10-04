import { expect, test } from "@playwright/test";

import { PATIENT_ID, fakeSupabase, isolatePage, signIn } from "./support/session";

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

test("marking a caries saves itself and brings plan and budget up to date", async ({ page }) => {
  const failures = await isolatePage(page);
  await page.goto(`/app/patients/${PATIENT_ID}/odontogram`);
  await expect(page.getByText("Se guarda automáticamente")).toBeVisible();

  // Default tool is caries: clicking a face marks it, with no "Guardar" or plan step.
  await page.getByRole("button", { name: "Diente 36 superficie oclusal" }).click();
  await expect(page.getByText("Cambios pendientes…")).toBeVisible();
  await expect(page.getByText("Guardado · plan y presupuesto al día")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("No se pudo cargar")).toHaveCount(0);

  const state = await fakeSupabase.state();
  const caries = state.dental_entities!.find(
    (row) => row.tooth === "36" && row.entity_type === "CARIES",
  );
  expect(caries?.surfaces_json).toEqual(["O"]);
  expect(state.clinical_plan_items).toEqual([
    expect.objectContaining({ dental_entity_id: caries?.id, treatment_code: "filling" }),
  ]);
  expect(state.budgets).toEqual([expect.objectContaining({ status: "DRAFT", total_cents: 4500 })]);

  // The editor stays usable: a second mark saves on top of the version just written.
  await page.getByRole("button", { name: "Diente 46 superficie oclusal" }).click();
  await expect(page.getByText("Guardado · plan y presupuesto al día")).toBeVisible({
    timeout: 15_000,
  });
  const saves = (await fakeSupabase.log()).filter(
    (entry) => entry.name === "save_odontogram_batch",
  );
  expect(saves.map((entry) => entry.body?.p_expected_version)).toEqual([1, 2]);
  expect(failures).toEqual([]);
});

test("a crown on an untouched natural tooth is recorded without a clinical-rule stop", async ({
  page,
}) => {
  const failures = await isolatePage(page);
  await page.goto(`/app/patients/${PATIENT_ID}/odontogram`);

  await page.getByRole("button", { name: /^Corona\. .*Se aplica a Diente\.$/ }).click();
  // Crowns live on the prosthetics layer, hidden in the default view: turn it on as a user would.
  await page.getByRole("button", { name: "Reactivar capa" }).click();
  // Whole-tooth tools act on the tooth itself; its faces stay disabled.
  await page.getByRole("button", { name: "Diente 46", exact: true }).click();

  await expect(page.getByText("Guardado · plan y presupuesto al día")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Regla clínica")).toHaveCount(0);
  const crown = (await fakeSupabase.state()).dental_entities!.find(
    (row) => row.active && row.tooth === "46" && row.entity_type === "CROWN",
  );
  expect(crown).toBeDefined();
  expect(failures).toEqual([]);
});
