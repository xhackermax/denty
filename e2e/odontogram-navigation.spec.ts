import { expect, test, type Page } from "@playwright/test";

import { SAVED, savedEntities } from "./support/odontogram";
import { PATIENT_ID, fakeSupabase, isolatePage, signIn } from "./support/session";

const odontogram = `/app/patients/${PATIENT_ID}/odontogram`;

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

const face = (page: Page, tooth: string) =>
  page.getByRole("button", { name: `Diente ${tooth} superficie oclusal` });

async function sidebarLink(page: Page, name: RegExp) {
  const sidebar = page.getByRole("complementary").getByRole("navigation");
  if (await sidebar.isVisible()) return sidebar.getByRole("link", { name }).first();
  // Narrow layouts tuck the sections behind the "Más" menu.
  await page.getByRole("button", { name: /^Más/ }).click();
  return page.getByRole("dialog").getByRole("link", { name }).first();
}

async function batchWrites() {
  return (await fakeSupabase.log()).filter((entry) => entry.name === "save_odontogram_batch");
}

async function expectChartBack(page: Page, tooth: string, state = "caries") {
  await expect(face(page, tooth)).toHaveAttribute("data-state", state, { timeout: 15_000 });
  await expect(page.getByText("No se pudo cargar")).toHaveCount(0);
  // A freshly opened chart has nothing pending: no stale "saving" or error state carried over.
  await expect(
    page.getByText(/^(Se guarda automáticamente|Guardado · información clínica al día)$/),
  ).toBeVisible();
}

for (const destination of [/^Agenda/, /^Pacientes/, /^Inicio/]) {
  test(`a pending edit is saved when leaving for ${destination.source} and is there on return`, async ({
    page,
  }) => {
    const failures = await isolatePage(page);
    await page.goto(odontogram);
    await face(page, "36").click();
    await expect(page.getByText("Cambios pendientes…")).toBeVisible();

    await (await sidebarLink(page, destination)).click();
    const dialog = page.getByRole("dialog", { name: "Tienes cambios sin guardar" });
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page).not.toHaveURL(new RegExp(`${odontogram}$`));
    expect(await savedEntities("36", "CARIES")).toHaveLength(1);

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${odontogram}$`));
    await expectChartBack(page, "36");
    expect(await batchWrites()).toHaveLength(1);
    expect(failures).toEqual([]);
  });
}

test("discarding on the way out writes nothing and the chart comes back clean", async ({
  page,
}) => {
  const failures = await isolatePage(page);
  await page.goto(odontogram);
  await face(page, "36").click();
  await (await sidebarLink(page, /^Agenda/)).click();
  await page
    .getByRole("dialog", { name: "Tienes cambios sin guardar" })
    .getByRole("button", { name: "Descartar" })
    .click();
  await expect(page).toHaveURL(/\/app\/agenda/);
  await page.goto(odontogram);
  await expect(face(page, "36")).not.toHaveAttribute("data-state", "caries");
  expect(await batchWrites()).toHaveLength(0);
  expect(failures).toEqual([]);
});

test("leaving while a save is still in flight neither loses the edit nor conflicts", async ({
  page,
}) => {
  const failures = await isolatePage(page);
  let delayed = 0;
  await page.route("**/odontogram/batch", async (route) => {
    if (delayed++ === 0) await new Promise((resolve) => setTimeout(resolve, 2_500));
    await route.continue();
  });
  await page.goto(odontogram);
  await face(page, "36").click();
  await expect(page.getByText(/Guardando/)).toBeVisible({ timeout: 5_000 });
  // A second edit lands while the first request is still on the wire.
  await face(page, "46").click();
  await (await sidebarLink(page, /^Agenda/)).click();
  await page
    .getByRole("dialog", { name: "Tienes cambios sin guardar" })
    .getByRole("button", { name: "Guardar" })
    .click();
  await expect(page).toHaveURL(/\/app\/agenda/, { timeout: 15_000 });

  const writes = await batchWrites();
  expect(writes.map((entry) => entry.body?.p_expected_version)).toEqual([1, 2]);
  await page.goto(odontogram);
  await expectChartBack(page, "36");
  await expectChartBack(page, "46");
  expect(failures).toEqual([]);
});

test("back and forward after saving keep the chart and its version", async ({ page }) => {
  const failures = await isolatePage(page);
  await page.goto(odontogram);
  await face(page, "36").click();
  await expect(page.getByText(SAVED)).toBeVisible({ timeout: 15_000 });
  await page.goto(`/app/patients/${PATIENT_ID}`);
  await page.goto("/app/agenda");
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/app/patients/${PATIENT_ID}$`));
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${odontogram}$`));
  await expectChartBack(page, "36");
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`/app/patients/${PATIENT_ID}$`));
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${odontogram}$`));
  await expectChartBack(page, "36");

  // The editor still writes against the right version after all that travelling.
  await face(page, "46").click();
  await expect.poll(async () => (await savedEntities("46", "CARIES")).length).toBe(1);
  expect((await batchWrites()).map((entry) => entry.body?.p_expected_version)).toEqual([1, 2]);
  expect(failures).toEqual([]);
});

const FLOW_STEPS = ["Plan", "Consentimientos", "Presupuesto", "Firma", "Citas"] as const;

for (const [index, step] of FLOW_STEPS.entries()) {
  test(`leaving the treatment flow at ${step} and coming back keeps everything`, async ({
    page,
  }) => {
    const failures = await isolatePage(page);
    await page.goto("/app");
    await page.goto(odontogram);
    await face(page, "36").click();
    await expect(page.getByText(SAVED)).toBeVisible({ timeout: 15_000 });

    // Appointments come after the patient signs; a signed budget lets the flow skip the signature.
    let moves = index;
    if (step === "Citas") {
      await expect.poll(async () => (await fakeSupabase.state()).budgets?.length).toBe(1);
      const [budget] = (await fakeSupabase.state()).budgets!;
      await fakeSupabase.patch("budgets", `id=eq.${String(budget!.id)}`, { status: "SIGNED" });
      moves = index - 1;
    }
    await expect(page.getByRole("button", { name: "Plan de tratamiento" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Presupuestos" })).toHaveCount(0);

    await page.goto(`/app/patients/${PATIENT_ID}?view=budgets`);
    await page.getByRole("button", { name: "Firma y citas" }).click();
    const flow = page.getByRole("dialog");
    await expect(flow).toBeVisible();
    for (let move = 0; move < moves; move += 1) {
      await flow.getByRole("button", { name: "Siguiente" }).click();
    }
    await expect(flow.getByText(step, { exact: true }).first()).toBeVisible();

    // Going back returns to the clean odontogram, with the edit intact.
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${odontogram}$`));
    await expectChartBack(page, "36");

    // Forward returns to the patient record stage, not to an embedded odontogram panel.
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/app/patients/${PATIENT_ID}\\?view=budgets`));
    await expect(page.getByRole("button", { name: "Firma y citas" })).toBeVisible();

    // Closing the flow and using the global menu still preserves the chart when returning.
    await page.getByRole("button", { name: "Firma y citas" }).click();
    await page.keyboard.press("Escape");
    await (await sidebarLink(page, /^Agenda/)).click();
    await expect(page).toHaveURL(/\/app\/agenda/);
    await page.goBack();
    await page.goBack();
    await expectChartBack(page, "36");

    expect(await batchWrites()).toHaveLength(1);
    expect(await savedEntities("36", "CARIES")).toHaveLength(1);
    expect(failures).toEqual([]);
  });
}
