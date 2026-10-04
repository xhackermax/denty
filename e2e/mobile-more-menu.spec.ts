import { expect, test } from "@playwright/test";

import { fakeSupabase, isolatePage, signIn } from "./support/session";

test.use({ viewport: { width: 360, height: 780 }, hasTouch: true });

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

test("the phone's “Más” menu closes once a section is chosen", async ({ page }) => {
  const failures = await isolatePage(page);
  await page.goto("/app");

  // Every tab and "Más" fit on a 360 px phone: a tab that needs a swipe is a tab nobody finds.
  const bar = page
    .locator("nav")
    .filter({ has: page.getByRole("button", { name: "Más herramientas" }) });
  for (const item of await bar.locator(":scope > *").all()) {
    const box = await item.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 360).toBe(true);
  }

  await page.getByRole("button", { name: "Más herramientas" }).click();
  const menu = page.getByRole("menu");
  await menu.getByRole("link", { name: "Tareas" }).click();

  await expect(page).toHaveURL(/\/app\/tasks$/);
  await expect(menu).toBeHidden();
  expect(failures).toEqual([]);
});

test("the agenda's “Nueva cita” button sits above the tab bar, not under it", async ({ page }) => {
  const failures = await isolatePage(page);
  await page.goto("/app/agenda");

  const fab = page.getByRole("button", { name: "Nueva cita", exact: true }).last();
  const box = await fab.boundingBox();
  expect(box).not.toBeNull();
  const onTop = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.getAttribute("aria-label"),
    { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
  );
  expect(onTop).toBe("Nueva cita");
  expect(failures).toEqual([]);
});
