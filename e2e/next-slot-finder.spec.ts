import { expect, test } from "@playwright/test";

import { fakeSupabase, isolatePage, signIn } from "./support/session";

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

test("reception finds the next afternoon slot and books from it", async ({ page }) => {
  const failures = await isolatePage(page);
  await page.goto("/app/agenda");

  await page.getByRole("button", { name: "Próximo hueco" }).click();
  const finder = page.getByRole("dialog", { name: "Próximo hueco libre" });
  const afternoon = finder.getByRole("button", { name: /^PM/ });
  await afternoon.click();
  await expect(afternoon).toHaveAttribute("aria-pressed", "true");

  const slot = finder.getByRole("button", { name: /Dra\. Ana Prueba/ });
  await expect(slot).toBeVisible();
  const searches = (await fakeSupabase.log()).filter((entry) => entry.name === "agenda_next_slots");
  expect(searches.at(-1)?.body).toMatchObject({ p_from_minute: 840, p_to_minute: 1440 });

  await slot.click();
  await expect(finder).toBeHidden();
  await expect(page.getByRole("button", { name: "Guardar cita" })).toBeVisible();
  expect(failures).toEqual([]);
});
