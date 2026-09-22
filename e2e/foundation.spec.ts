import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("F2 staff shell renders", async ({ page }) => {
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Una base moderna para la clínica" }),
  ).toBeVisible();
});

test("public layout renders without functional auth claims", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Acceso a Denty" })).toBeVisible();
  await expect(page.getByText(/No autentica todavía/)).toBeVisible();
});

test("F2 routes have no serious or critical axe violations", async ({ page }) => {
  for (const route of ["/app", "/login", "/patient/demo"]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(blocking, `${route}: ${JSON.stringify(blocking, null, 2)}`).toEqual([]);
  }
});
