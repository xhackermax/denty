import { expect, test, type Page } from "@playwright/test";

import {
  CHILD_PATIENT_ID,
  MIXED_PATIENT_ID,
  PATIENT_ID,
  fakeSupabase,
  isolatePage,
  signIn,
} from "./support/session";

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

const isPrimary = (tooth: string) => Number(tooth[0]) >= 5;

/** FDI numbers of every tooth the editor draws ("Diente 46" buttons, faces excluded). */
async function chartedTeeth(page: Page): Promise<string[]> {
  const labels = await page
    .getByRole("button", { name: /^Diente \d\d(,|$)/ })
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label") ?? ""));
  return labels.map((label) => label.slice(7, 9));
}

async function openOdontogram(page: Page, patientId: string) {
  const failures = await isolatePage(page);
  await page.goto(`/app/patients/${patientId}/odontogram`);
  await expect(page.getByText("Se guarda automáticamente")).toBeVisible();
  return failures;
}

test("an adult's chart has only permanent teeth", async ({ page }) => {
  const failures = await openOdontogram(page, PATIENT_ID);
  const teeth = await chartedTeeth(page);
  expect(teeth).toHaveLength(32);
  expect(teeth.filter(isPrimary)).toEqual([]);
  expect(failures).toEqual([]);
});

test("a four-year-old's chart has only primary teeth", async ({ page }) => {
  const failures = await openOdontogram(page, CHILD_PATIENT_ID);
  await expect.poll(async () => (await chartedTeeth(page)).length).toBe(20);
  const teeth = await chartedTeeth(page);
  expect(teeth.filter((tooth) => !isPrimary(tooth))).toEqual([]);

  // Marking a caries on a primary molar saves like any other tooth.
  await page.getByRole("button", { name: "Diente 85 superficie oclusal" }).click();
  await expect(page.getByText("Guardado · plan y presupuesto al día")).toBeVisible({
    timeout: 15_000,
  });
  const saved = (await fakeSupabase.state()).dental_entities!;
  expect(
    saved.some((row) => row.active && row.tooth === "85" && row.entity_type === "CARIES"),
  ).toBe(true);
  expect(failures).toEqual([]);
});

test("an eight-year-old's chart shows one tooth per position, primary or permanent", async ({
  page,
}) => {
  const failures = await openOdontogram(page, MIXED_PATIENT_ID);
  await expect.poll(async () => (await chartedTeeth(page)).length).toBe(24);
  const teeth = await chartedTeeth(page);
  expect(teeth).toEqual(expect.arrayContaining(["16", "55", "11", "26", "46", "75", "36"]));
  expect(teeth).not.toContain("15"); // its predecessor 55 is still in place
  expect(teeth).not.toContain("18"); // not erupted at eight
  expect(failures).toEqual([]);
});
