import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { PATIENT_ID, fakeSupabase, isolatePage, signIn } from "./support/session";

const SCREENS = [
  ["inicio", "/app"],
  ["pacientes", "/app/patients"],
  ["ficha", `/app/patients/${PATIENT_ID}`],
  ["odontograma", `/app/patients/${PATIENT_ID}/odontogram`],
  ["agenda", "/app/agenda"],
  ["finanzas", "/app/finance"],
  ["ajustes", "/app/settings"],
  ["menú de la clínica", "/app/admin/navigation"],
] as const;

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

async function audit(page: Page, path: string, scheme: "light" | "dark") {
  await page.addInitScript((value) => {
    try {
      localStorage.setItem("denty-appearance", value);
    } catch {
      // Storage can be blocked; the default scheme is still audited.
    }
  }, scheme);
  const failures = await isolatePage(page);
  await page.goto(path);
  await page.waitForLoadState("networkidle");

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const report = violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join(" | ")}`,
  );
  expect(report).toEqual([]);
  expect(failures).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  for (const [name, path] of SCREENS) {
    test(`${name} meets WCAG 2.1 AA in ${scheme} mode`, async ({ page }) => {
      await audit(page, path, scheme);
    });
  }
}

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  for (const [name, path] of SCREENS) {
    test(`${name} meets WCAG 2.1 AA on a phone`, async ({ page }) => {
      await audit(page, path, "light");
    });
  }
});
