import { expect, test } from "@playwright/test";

import { PATIENT_ID, fakeSupabase, isolatePage, signIn } from "./support/session";

test.use({ viewport: { width: 360, height: 780 } });

const FIRST_NAME = "María de los Ángeles Guadalupe";
const LAST_NAME = "Fernández-Villaverde de la Concepción y Santísima Trinidad";

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await fakeSupabase.patch("patients", `id=eq.${PATIENT_ID}`, {
    first_name: FIRST_NAME,
    last_name: LAST_NAME,
    record_number: "DNT-2026-000000012345",
    email:
      "maria.de.los.angeles.fernandez.villaverde.concepcion@clinica-dental-ejemplo-muy-largo.es",
  });
  await signIn(context, baseURL!);
});

for (const [screen, path] of [
  ["patient record", `/app/patients/${PATIENT_ID}`],
  ["odontogram", `/app/patients/${PATIENT_ID}/odontogram`],
] as const) {
  test(`a very long name and unbroken email never widen the ${screen} on a phone`, async ({
    page,
  }) => {
    const failures = await isolatePage(page);
    await page.goto(path);
    await expect(page.getByText(new RegExp(LAST_NAME)).first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    expect(failures).toEqual([]);
  });
}

test("a long treatment and a huge amount fit the plan and budget steps on a phone", async ({
  page,
}) => {
  const failures = await isolatePage(page);
  await page.goto(`/app/patients/${PATIENT_ID}/odontogram`);
  await page.getByRole("button", { name: "Diente 36 superficie oclusal" }).click();
  await expect(page.getByText("Guardado · plan y presupuesto al día")).toBeVisible({
    timeout: 15_000,
  });
  const [item] = (await fakeSupabase.state()).clinical_plan_items!;
  await fakeSupabase.patch("clinical_plan_items", `id=eq.${String(item!.id)}`, {
    label:
      "Rehabilitación completa arcada superior sobre seis implantes con barra fresada CAD/CAM y prótesis híbrida de zirconio monolítico",
    price_snapshot_cents: 9_999_999_999,
  });

  await page.getByRole("button", { name: "Presupuestos" }).click();
  await page.getByRole("button", { name: "Firma y citas" }).click();
  const price = page.getByRole("textbox", { name: /^Precio de Rehabilitación/ });
  await expect(price).toHaveValue("99.999.999,99 €");
  // The whole value fits the field: nothing scrolls out of sight inside it.
  expect(await price.evaluate((input) => input.scrollWidth <= input.clientWidth)).toBe(true);

  for (const _ of [1, 2]) await page.getByRole("button", { name: "Siguiente" }).click();
  const amount = page
    .getByText("99.999.999,99 €", { exact: true })
    .filter({ visible: true })
    .first();
  await expect(amount).toBeVisible();
  const box = await amount.boundingBox();
  expect(box!.height).toBeLessThan(30); // one line, not split mid-number

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  expect(failures).toEqual([]);
});
