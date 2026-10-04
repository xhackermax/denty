import { expect, test } from "@playwright/test";

import {
  SAVED,
  applyTool,
  expectSaved,
  openMoreTools,
  openOdontogram,
  pick,
  reactivateLayerIfHidden,
  ruleMessage,
  savedEntities,
  savedEntity,
} from "./support/odontogram";
import { PATIENT_ID, fakeSupabase, isolatePage, signIn } from "./support/session";

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

test("legend tools mark faces and whole teeth by clicking the chart", async ({ page }) => {
  const failures = await isolatePage(page);
  await openOdontogram(page);

  await page.getByRole("button", { name: /^Obturación\. .*Se aplica a Cara\.$/ }).click();
  await reactivateLayerIfHidden(page);
  await page.getByRole("button", { name: "Diente 16 superficie mesial" }).click();
  await expectSaved(page, "16", "RESTORATION", "Obturación en la cara mesial del 16");
  expect((await savedEntity("16", "RESTORATION"))?.surfaces_json).toEqual(["M"]);

  await page.getByRole("button", { name: /^Exodoncia\. .*Se aplica a Diente\.$/ }).click();
  await reactivateLayerIfHidden(page);
  await page.getByRole("button", { name: "Diente 18", exact: true }).click();
  await expectSaved(page, "18", "EXTRACTION", "Exodoncia del 18");
  expect(failures).toEqual([]);
});

test("the implant and root-canal templates add their whole stack", async ({ page }) => {
  const failures = await isolatePage(page);
  await openOdontogram(page);
  await openMoreTools(page);

  await pick(page, "Diente", "36");
  await page.getByRole("button", { name: "Implante + pilar + corona" }).click();
  await expectSaved(page, "36", "IMPLANT", "Implante en 36");
  const implantStack = (await savedEntities("36")).map((row) => row.entity_type);
  expect(implantStack).toEqual(expect.arrayContaining(["IMPLANT", "CROWN"]));

  await pick(page, "Diente", "46");
  await page.getByRole("button", { name: "Endo + perno + corona" }).click();
  await expectSaved(page, "46", "CROWN", "Endo + perno + corona en 46");
  const endoStack = (await savedEntities("46")).map((row) => row.entity_type);
  expect(endoStack).toEqual(expect.arrayContaining(["ENDO", "POST", "CROWN"]));
  expect(failures).toEqual([]);
});

test("a fixed bridge is placed across a range of the same arch", async ({ page }) => {
  const failures = await isolatePage(page);
  await openOdontogram(page);
  await openMoreTools(page);

  await page.getByRole("button", { name: "Seleccionar prótesis / puente" }).click();
  await reactivateLayerIfHidden(page);
  await pick(page, "Diente inicial", "34");
  await pick(page, "Diente final", "36");
  await page.getByRole("button", { name: "Aplicar prótesis / puente" }).click();
  await expect
    .poll(async () => (await savedEntities()).length, { timeout: 15_000 })
    .toBeGreaterThan(0);
  await expect(page.getByText(SAVED)).toBeVisible({ timeout: 15_000 });
  expect(await ruleMessage(page)).toBeNull();
  const teeth = new Set((await savedEntities()).map((row) => row.tooth).filter(Boolean));
  expect([...teeth].sort()).toEqual(expect.arrayContaining(["34", "36"]));
  expect(failures).toEqual([]);
});

test("undo, redo and discard keep the saved chart in step", async ({ page }) => {
  const failures = await isolatePage(page);
  await openOdontogram(page);

  await page.getByRole("button", { name: "Diente 26 superficie oclusal" }).click();
  await expectSaved(page, "26", "CARIES", "Caries en 26");

  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect.poll(async () => (await savedEntities("26")).length, { timeout: 15_000 }).toBe(0);
  await page.getByRole("button", { name: "Rehacer" }).click();
  await expectSaved(page, "26", "CARIES", "Rehacer la caries del 26");

  // An edit discarded before the autosave fires never reaches the database.
  await page.getByRole("button", { name: "Diente 27 superficie oclusal" }).click();
  await page.getByRole("button", { name: "Descartar cambios" }).click();
  await page.waitForTimeout(2_000);
  expect(await savedEntities("27")).toEqual([]);
  expect(failures).toEqual([]);
});

test("switching layers and views never breaks the chart", async ({ page }) => {
  const failures = await isolatePage(page);
  await openOdontogram(page);
  for (const layer of ["Perio", "Orto", "Endo", "General"]) {
    await page.getByRole("button", { name: layer, exact: true }).click();
    await expect(page.getByRole("button", { name: "Diente 11", exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Mostrar todo" }).click();
  await page.getByRole("button", { name: "Restablecer vista" }).click();
  await page.getByText("Vista visual", { exact: true }).click();
  await expect(page.getByText("Muestra lo guardado.", { exact: false })).toBeVisible();
  await page.getByText("Editor", { exact: true }).click();
  await expect(page.getByText("Se guarda automáticamente")).toBeVisible();
  expect(failures).toEqual([]);
});

test("a quick periodontal diagnosis is saved with its justification", async ({ page }) => {
  const failures = await isolatePage(page);
  await openOdontogram(page);
  await page.getByRole("button", { name: "Periodontal", exact: true }).click();
  await page.getByRole("button", { name: "Gingivitis", exact: true }).click();
  await page.getByLabel("Justificación").fill("Sangrado generalizado al sondaje");
  await page.getByRole("button", { name: "Guardar diagnóstico" }).click();
  await expect(page.getByText("Historial de diagnósticos (1)")).toBeVisible();
  const [saved] = (await fakeSupabase.state()).clinical_diagnoses!;
  expect(saved).toMatchObject({ category: "periodontal", value: "gingivitis" });
  expect(failures).toEqual([]);
});

test("a supernumerary tooth and a control snapshot can be recorded", async ({ page }) => {
  const failures = await isolatePage(page);
  await openOdontogram(page);
  await page.getByRole("button", { name: "Añadir pieza" }).click();
  // A supernumerary keeps its own identity: it is stored per arch, with the FDI neighbour only
  // recorded as its anchor, so it is looked up by type rather than by tooth.
  await expect
    .poll(async () => (await savedEntities(undefined, "SUPERNUMERARY_TOOTH")).length)
    .toBe(1);
  const [supernumerary] = await savedEntities(undefined, "SUPERNUMERARY_TOOTH");
  expect(supernumerary?.attributes_json).toMatchObject({ toothIdentity: { anchorFdi: "11" } });
  await expect(page.getByText(SAVED)).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Historial", exact: true }).click();
  await page.getByLabel("Nombre del control").fill("Revisión e2e");
  await page.getByRole("button", { name: "Guardar snapshot" }).click();
  await expect.poll(async () => (await fakeSupabase.state()).odontogram_snapshots?.length).toBe(1);
  expect(failures).toEqual([]);
  void PATIENT_ID;
});
