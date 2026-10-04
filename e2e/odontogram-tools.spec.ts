import { expect, test } from "@playwright/test";

import { applyTool, expectSaved, openOdontogram, savedEntity } from "./support/odontogram";
import { fakeSupabase, isolatePage, signIn } from "./support/session";

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

// Every whole-tooth or face tool except fixed prostheses (range tool, tested separately) and
// posts (they need a root canal first).
const TOOLS: readonly [label: string, entityType: string, tooth: string][] = [
  ["Sano", "HEALTHY", "11"],
  ["Obturación realizada", "RESTORATION", "12"],
  ["Obturación insatisfactoria", "RESTORATION", "13"],
  ["Obturación pendiente", "RESTORATION", "14"],
  ["Corona realizada", "CROWN", "15"],
  ["Corona insatisfactoria", "CROWN", "16"],
  ["Corona pendiente", "CROWN", "17"],
  ["Endodoncia realizada", "ENDO", "21"],
  ["Endodoncia insatisfactoria", "ENDO", "22"],
  ["Endodoncia indicada", "ENDO", "23"],
  ["Implante realizado", "IMPLANT", "24"],
  ["Implante a revisar", "IMPLANT", "25"],
  ["Implante indicado", "IMPLANT", "26"],
  ["Removible realizada", "REMOVABLE", "31"],
  ["Removible insatisfactoria", "REMOVABLE", "32"],
  ["Removible pendiente", "REMOVABLE", "33"],
  ["Caries", "CARIES", "34"],
  ["Exodoncia indicada", "EXTRACTION", "35"],
  ["Ausente", "MISSING", "36"],
];

test("every tooth tool records its mark and saves on its own", async ({ page }) => {
  test.setTimeout(240_000);
  const failures = await isolatePage(page);
  await openOdontogram(page);

  const statusByLabel = new Map<string, unknown>();
  for (const [label, entityType, tooth] of TOOLS) {
    await applyTool(page, label, tooth);
    await expectSaved(page, tooth, entityType, `${label} en ${tooth}`);
    statusByLabel.set(label, (await savedEntity(tooth, entityType))?.status);
  }
  // Done, unsatisfactory and pending stay three different clinical states after saving.
  for (const family of ["Obturación", "Corona", "Endodoncia", "Implante", "Removible"]) {
    const statuses = [...statusByLabel].filter(([label]) => label.startsWith(family));
    expect(new Set(statuses.map(([, status]) => status)).size, family).toBe(3);
  }
  expect(failures).toEqual([]);
});

test("posts follow a root canal on the same tooth", async ({ page }) => {
  const failures = await isolatePage(page);
  await openOdontogram(page);
  for (const [label, tooth] of [
    ["Perno realizado", "44"],
    ["Perno insatisfactorio", "45"],
    ["Perno pendiente", "46"],
  ] as const) {
    await applyTool(page, "Endodoncia realizada", tooth);
    await expectSaved(page, tooth, "ENDO", `Endodoncia en ${tooth}`);
    await applyTool(page, label, tooth);
    await expectSaved(page, tooth, "POST", `${label} en ${tooth}`);
  }
  expect(failures).toEqual([]);
});

test("a post without a root canal is stopped with a clinical rule", async ({ page }) => {
  await isolatePage(page);
  await openOdontogram(page);
  await applyTool(page, "Perno pendiente", "47");
  await expect(page.getByText("El perno requiere endodoncia previa.")).toBeVisible();
  expect(await savedEntity("47", "POST")).toBeUndefined();
});
