import { expect, test, type Page } from "@playwright/test";
import { PATIENT_ID, fakeSupabase, isolatePage, signIn } from "./support/session";

const odontogram = `/app/patients/${PATIENT_ID}/odontogram`;
const saved = "Guardado · plan y presupuesto al día";
const face = (page: Page, tooth: string) =>
  page.getByRole("button", { name: `Diente ${tooth} superficie oclusal` });

async function assertOneFinding(tooth: string, version: number) {
  const state = await fakeSupabase.state();
  expect(state.dental_entities).toEqual([
    expect.objectContaining({ tooth, entity_type: "CARIES", surfaces_json: ["O"], version }),
  ]);
  expect(state.clinical_plan_items).toHaveLength(1);
  expect(state.budgets).toHaveLength(1);
  expect(state.budgets![0]).toMatchObject({ total_cents: 4500 });
}

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

test("ST-001: 100 real reloads retain one persisted odontogram and version", async ({ page }) => {
  test.setTimeout(300_000);
  const failures = await isolatePage(page);
  await page.goto(odontogram);
  await face(page, "36").click();
  await expect(page.getByText(saved)).toBeVisible({ timeout: 15_000 });
  const original = await fakeSupabase.state();
  for (let iteration = 0; iteration < 100; iteration++) {
    await test.step(`reload ${iteration + 1}/100`, async () => {
      await page.reload();
      await expect(face(page, "36")).toBeVisible();
      await expect(page.getByText("v2", { exact: true })).toBeVisible();
      await expect(page.getByText("No se pudo cargar")).toHaveCount(0);
      await assertOneFinding("36", 2);
      expect((await fakeSupabase.state()).dental_entities).toEqual(original.dental_entities);
    });
  }
  expect(
    (await fakeSupabase.log()).filter((entry) => entry.name === "save_odontogram_batch"),
  ).toHaveLength(1);
  expect(failures).toEqual([]);
});

test("ST-002: 100 menu and appointment modal open-close cycles release overlays", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 360, height: 780 });
  const failures = await isolatePage(page);
  await page.goto("/app/agenda");
  for (let iteration = 0; iteration < 100; iteration++) {
    await test.step(`menu and modal ${iteration + 1}/100`, async () => {
      await page.getByRole("button", { name: "Más herramientas" }).click();
      await expect(page.getByRole("menu")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("menu")).toBeHidden();
      await page.getByRole("button", { name: "Nueva cita", exact: true }).last().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
    });
  }
  expect((await fakeSupabase.state()).appointments ?? []).toHaveLength(0);
  expect(failures).toEqual([]);
});

for (const clicks of [2, 3]) {
  test(`ST-003: ${clicks} rapid save clicks and an action during saving create no duplicates`, async ({
    page,
  }) => {
    test.setTimeout(45_000);
    const failures = await isolatePage(page);
    await page.goto(odontogram);
    await expect(face(page, "36")).toBeVisible();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let arrived!: () => void;
    const intercepted = new Promise<void>((resolve) => {
      arrived = resolve;
    });
    await page.route(/\/api\/.*\/odontogram\/batch/, async (route) => {
      if (route.request().method() === "POST") {
        arrived();
        await gate;
      }
      await route.continue();
    });
    try {
      await face(page, "36").click();
      // Multiple genuine DOM click events in one turn reach the same dirty render.
      await page.getByRole("button", { name: "Guardar", exact: true }).evaluate((button, count) => {
        for (let index = 0; index < count; index++) (button as HTMLButtonElement).click();
      }, clicks);
      await intercepted;
      await expect(page.getByText("Guardando…", { exact: true })).toBeVisible();
      // A second clinical edit while the first write is held must survive its response.
      await face(page, "46").click();
    } finally {
      release();
    }
    await expect(page.getByText(saved)).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(
        async () =>
          (await fakeSupabase.state()).dental_entities?.filter((row) => row.active).length,
      )
      .toBe(2);
    await expect.poll(async () => (await fakeSupabase.state()).clinical_plan_items?.length).toBe(2);
    await expect
      .poll(async () => (await fakeSupabase.state()).budgets?.[0]?.total_cents)
      .toBe(9000);
    const state = await fakeSupabase.state();
    expect(
      state
        .dental_entities!.filter((row) => row.active)
        .map((row) => row.tooth)
        .sort(),
    ).toEqual(["36", "46"]);
    expect(
      new Set(state.dental_entities!.filter((row) => row.active).map((row) => row.id)).size,
    ).toBe(2);
    expect(state.clinical_plan_items).toHaveLength(2);
    expect(state.budgets).toHaveLength(1);
    expect(state.budgets![0]).toMatchObject({ total_cents: 9000 });
    const writes = (await fakeSupabase.log()).filter(
      (entry) => entry.name === "save_odontogram_batch",
    );
    expect(writes.map((entry) => entry.body?.p_expected_version)).toEqual([1, 2]);
    expect(failures).toEqual([]);
  });
}

test("NV-001 NV-002: direct protected routes, navigation permutations, back and forward", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const failures = await isolatePage(page);
  const routes = ["/app", "/app/patients", "/app/agenda", "/app/tasks", odontogram];
  for (const ordering of [
    routes,
    [...routes].reverse(),
    [routes[2]!, routes[0]!, routes[4]!, routes[1]!, routes[3]!],
  ]) {
    for (const route of ordering) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await expect(page.locator("main")).toBeVisible();
    }
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${ordering[3]}$`));
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${ordering[4]}$`));
  }
  expect(failures).toEqual([]);
});

test("NV-003 NV-004: absent session redirects protected URLs and unknown route returns 404", async ({
  page,
  context,
}) => {
  const failures = await isolatePage(page);
  await context.clearCookies();
  for (const route of ["/app", odontogram, "/app/agenda"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?next=/);
    expect(new URL(page.url()).searchParams.get("next")).toBe(route);
  }
  const response = await page.goto("/regression-torture-missing-route");
  expect(response?.status()).toBe(404);
  expect(failures).toEqual([]);
});

test("ST-004: two tabs editing the same version reject a stale write without overwriting", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  const second = await context.newPage();
  const failures = await isolatePage(page);
  const secondFailures = await isolatePage(second);
  try {
    await Promise.all([page.goto(odontogram), second.goto(odontogram)]);
    await expect(face(page, "36")).toBeVisible();
    await expect(face(second, "46")).toBeVisible();
    await face(page, "36").click();
    await expect(page.getByText(saved)).toBeVisible({ timeout: 15_000 });
    await face(second, "46").click();
    await expect(second.getByText("Conflicto", { exact: true })).toBeVisible({ timeout: 15_000 });
    await assertOneFinding("36", 2);
    await second.reload();
    await expect(second.getByText("v2", { exact: true })).toBeVisible();
    await face(second, "46").click();
    await expect(second.getByText(saved)).toBeVisible({ timeout: 15_000 });
    const state = await fakeSupabase.state();
    expect(
      state
        .dental_entities!.filter((row) => row.active)
        .map((row) => row.tooth)
        .sort(),
    ).toEqual(["36", "46"]);
    expect(
      state.dental_entities!.filter((row) => row.active).every((row) => row.version === 3),
    ).toBe(true);
    expect(state.clinical_plan_items).toHaveLength(2);
    expect(state.budgets).toHaveLength(1);
    expect(failures).toEqual([]);
    expect(secondFailures).toEqual([]);
  } finally {
    await second.close();
  }
});
