import { expect, test } from "@playwright/test";

import { SAVED, openMoreTools, openOdontogram, pick } from "./support/odontogram";
import { PATIENT_ID, fakeSupabase, isolatePage, signIn } from "./support/session";

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

async function chartWithBothPhases(page: import("@playwright/test").Page) {
  await openOdontogram(page);
  await page.getByRole("button", { name: "Diente 46 superficie oclusal" }).click();
  await expect(page.getByText(SAVED)).toBeVisible({ timeout: 15_000 });
  // The implant template places a planned implant (with its abutment and crown) on 36.
  await openMoreTools(page);
  await pick(page, "Diente", "36");
  await page.getByRole("button", { name: "Implante + pilar + corona" }).click();
  await expect
    .poll(async () => (await fakeSupabase.state()).clinical_plan_items?.length, { timeout: 15_000 })
    .toBe(2);
}

async function goToBudget(page: import("@playwright/test").Page) {
  await page.goto(`/app/patients/${PATIENT_ID}?view=budgets`);
  await page.getByRole("button", { name: "Firma y citas" }).click();
  const flow = page.getByRole("dialog");
  const budgetStep = flow.getByRole("radiogroup", { name: "Cómo presupuestar" });
  for (let i = 0; i < 3 && !(await budgetStep.isVisible()); i++) {
    await flow.getByRole("button", { name: "Siguiente" }).click();
    await budgetStep.waitFor({ timeout: 2_000 }).catch(() => undefined);
  }
  await expect(budgetStep).toBeVisible();
  return flow;
}

test("the treatment flow budgets phase 1 and phase 2 separately and signs the first", async ({
  page,
}) => {
  const failures = await isolatePage(page);
  await chartWithBothPhases(page);
  const flow = await goToBudget(page);

  await expect(flow.getByText("Fase 1 · Salud y urgencias")).toBeVisible();
  await expect(flow.getByText("Fase 2 · Reponer y mejorar")).toBeVisible();
  const budgets = (await fakeSupabase.state()).budgets!;
  const phase1 = budgets.find((row) => row.scope === "primary");
  const phase2 = budgets.find((row) => row.scope === "secondary");
  expect(phase1).toMatchObject({ total_cents: 4500, status: "DRAFT" });
  expect(phase2).toMatchObject({ total_cents: 90000, status: "DRAFT" });
  await expect(
    flow.getByRole("radio", { name: "Firmar Fase 1 · Salud y urgencias" }),
  ).toBeChecked();
  expect(failures).toEqual([]);
});

test("a custom budget can be added alongside the phases", async ({ page }) => {
  const failures = await isolatePage(page);
  await chartWithBothPhases(page);
  const flow = await goToBudget(page);
  await expect(flow.getByText("Fase 2 · Reponer y mejorar")).toBeVisible();

  await flow.getByRole("button", { name: "Nuevo presupuesto" }).click();
  const picker = page.getByRole("dialog", { name: "Nuevo presupuesto" });
  await picker.getByLabel("Nombre").fill("Alternativa solo implante");
  await picker.getByRole("checkbox", { name: /Implante/ }).check();
  await picker.getByRole("button", { name: "Crear presupuesto" }).click();

  await expect(flow.getByText("Alternativa solo implante")).toBeVisible();
  const custom = (await fakeSupabase.state()).budgets!.filter((row) => row.scope === "custom");
  expect(custom).toEqual([
    expect.objectContaining({ title: "Alternativa solo implante", total_cents: 90000 }),
  ]);
  await expect(flow.getByRole("radio", { name: "Firmar Alternativa solo implante" })).toBeChecked();
  expect(failures).toEqual([]);
});

test("the plan step offers the patient-friendly treatment plan document", async ({ page }) => {
  const failures = await isolatePage(page);
  await chartWithBothPhases(page);
  await page.goto(`/app/patients/${PATIENT_ID}?view=budgets`);
  await page.getByRole("button", { name: "Firma y citas" }).click();
  await page.getByRole("button", { name: "Documento del plan" }).click();
  const document = page.getByRole("dialog", { name: "Tu plan de tratamiento" });
  await expect(document.getByRole("region", { name: "Fase 1 · Recuperar la salud" })).toBeVisible();
  await expect(document.getByRole("region", { name: "Fase 2 · Reponer y mejorar" })).toBeVisible();
  await expect(document.getByText(/Qué es\./).first()).toBeVisible();
  expect(failures).toEqual([]);
});
