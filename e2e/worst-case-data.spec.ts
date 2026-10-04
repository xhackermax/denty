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
