import { expect, test } from "@playwright/test";

import { fakeSupabase, isolatePage, signIn } from "./support/session";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

test("the phone's “Más” menu closes once a section is chosen", async ({ page }) => {
  const failures = await isolatePage(page);
  await page.goto("/app");

  await page.getByRole("button", { name: "Más herramientas" }).click();
  const menu = page.getByRole("menu");
  await menu.getByRole("link", { name: "Tareas" }).click();

  await expect(page).toHaveURL(/\/app\/tasks$/);
  await expect(menu).toBeHidden();
  expect(failures).toEqual([]);
});
