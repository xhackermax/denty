import { expect, test } from "@playwright/test";

import { fakeSupabase, isolatePage, signIn } from "./support/session";

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

test("the admin reorders the clinic menu and the sidebar follows", async ({ page }) => {
  const failures = await isolatePage(page);
  await page.goto("/app/admin/navigation");
  const sidebar = page.getByRole("complementary").getByRole("navigation");
  await expect(sidebar.getByRole("link").nth(1)).toHaveText(/Pacientes/);

  await page.getByRole("button", { name: "Subir Agenda" }).click();
  await page.getByRole("button", { name: "Guardar menú de la clínica" }).click();

  await expect(sidebar.getByRole("link").nth(1)).toHaveText(/Agenda/);
  const state = await fakeSupabase.state();
  expect(state.clinic_settings![0]!.navigation_layout).toEqual({
    pinned: ["home", "agenda", "patients", "documents", "finance"],
  });
  expect(failures).toEqual([]);
});
