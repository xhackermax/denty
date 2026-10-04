import { expect, type Page } from "@playwright/test";

import { PATIENT_ID, fakeSupabase } from "./session";

export const SAVED = "Guardado · plan y presupuesto al día";

export async function openOdontogram(page: Page, patientId = PATIENT_ID) {
  await page.goto(`/app/patients/${patientId}/odontogram`);
  await expect(page.getByText("Se guarda automáticamente")).toBeVisible();
}

export async function openMoreTools(page: Page) {
  const summary = page.getByText("Más herramientas", { exact: true });
  if (!(await page.getByRole("button", { name: "Aplicar al diente seleccionado" }).isVisible()))
    await summary.click();
}

export async function pick(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** Turns the active tool's layer on when the chart says it is hidden. */
export async function reactivateLayerIfHidden(page: Page) {
  const reactivate = page.getByRole("button", { name: "Reactivar capa" });
  if (await reactivate.isVisible()) await reactivate.click();
}

/** Applies a tool to a tooth through "Más herramientas", as a user would. */
export async function applyTool(page: Page, toolLabel: string, tooth: string) {
  await openMoreTools(page);
  await pick(page, "Herramienta", toolLabel);
  await reactivateLayerIfHidden(page);
  await pick(page, "Diente", tooth);
  await page.getByRole("button", { name: "Aplicar al diente seleccionado" }).click();
}

export async function ruleMessage(page: Page): Promise<string | null> {
  const alert = page.getByRole("alert").filter({ hasText: "Regla clínica" });
  return (await alert.count()) ? ((await alert.first().textContent()) ?? "") : null;
}

// Saved rows use the canonical clinical vocabulary ("Obturación realizada" is stored as a
// RESTORATION with status restoration_completed), so marks are matched by entity type.
export async function savedEntities(tooth?: string, entityType?: string) {
  const rows = (await fakeSupabase.state()).dental_entities ?? [];
  return rows.filter(
    (row) =>
      row.active &&
      (tooth === undefined || row.tooth === tooth) &&
      (entityType === undefined || row.entity_type === entityType),
  );
}

export async function savedEntity(tooth: string, entityType: string) {
  return (await savedEntities(tooth, entityType))[0];
}

/** Waits until the mark reaches the database and the chart says plan and budget caught up. */
export async function expectSaved(page: Page, tooth: string, entityType: string, what: string) {
  await expect
    .poll(async () => Boolean(await savedEntity(tooth, entityType)), {
      message: `${what} se guarda (aviso: ${await ruleMessage(page)})`,
      timeout: 15_000,
    })
    .toBe(true);
  await expect(page.getByText(SAVED)).toBeVisible({ timeout: 15_000 });
  expect(await ruleMessage(page), `${what}: sin aviso clínico`).toBeNull();
}
