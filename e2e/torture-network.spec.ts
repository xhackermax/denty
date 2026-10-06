import { expect, test, type Page } from "@playwright/test";
import { PATIENT_ID, fakeSupabase, signIn } from "./support/session";

const editor = `/app/patients/${PATIENT_ID}/odontogram`;
const batch = `**/api/patients/${PATIENT_ID}/odontogram/batch`;
const saved = "Guardado · información clínica al día";

// Intentional error responses are part of these tests; uncaught browser exceptions are not.
async function monitor(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/supabase\.co/, (route) => route.abort());
  return errors;
}
async function writes() {
  return (await fakeSupabase.log()).filter((entry) => entry.name === "save_odontogram_batch");
}
async function mark(page: Page) {
  await page.getByRole("button", { name: "Diente 36 superficie oclusal" }).click();
}
async function assertDraft(page: Page) {
  await expect(page.getByRole("button", { name: "Diente 36 superficie oclusal" })).toHaveAttribute(
    "data-state",
    "caries",
  );
  await expect(page.getByRole("button", { name: "Descartar cambios", exact: true })).toBeEnabled();
}
async function assertPersisted() {
  const entities = (await fakeSupabase.state()).dental_entities!;
  expect(entities.filter((row) => row.tooth === "36" && row.entity_type === "CARIES")).toEqual([
    expect.objectContaining({ surfaces_json: ["O"] }),
  ]);
  expect(await writes()).toHaveLength(1);
}

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

for (const status of [400, 401, 403, 404, 409, 429, 500, 502, 503, 504]) {
  test(`ES network: HTTP ${status} retains the draft and explicit retry saves once`, async ({
    page,
  }) => {
    const errors = await monitor(page);
    let attempts = 0;
    await page.route(batch, async (route) => {
      attempts++;
      await route.fulfill({
        status,
        json: { error: { code: "INJECTED_FAILURE", message: "Injected failure" } },
      });
    });
    await page.goto(editor);
    await mark(page);
    await expect(
      page.getByText(status === 409 ? "Conflicto" : "Error al guardar", { exact: true }),
    ).toBeVisible();
    await assertDraft(page);
    expect(await writes()).toHaveLength(0);
    expect(attempts).toBe(1);
    await page.unroute(batch);
    // A conflict has no Reintentar button; Guardar is the existing explicit retry control.
    await page
      .getByRole("button", { name: status === 409 ? "Guardar" : "Reintentar", exact: true })
      .click();
    await expect(page.getByText(saved)).toBeVisible({ timeout: 15_000 });
    await assertPersisted();
    expect(errors).toEqual([]);
  });
}

test("ES offline: paused save retains draft and reconnect commits once", async ({
  page,
  context,
}) => {
  const errors = await monitor(page);
  let attempts = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === `/api/patients/${PATIENT_ID}/odontogram/batch`)
      attempts++;
  });
  await page.goto(editor);
  await expect(page.getByText("Se guarda automáticamente")).toBeVisible();
  await context.setOffline(true);
  await mark(page);
  // React Query's default online networkMode pauses mutations before sending them.
  // The shell announces disconnection while the autosave promise remains pending.
  await expect(page.getByRole("alert", { name: "Sin conexión con el servidor" })).toBeVisible();
  await expect(page.getByText("Guardando…", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Diente 36 superficie oclusal" })).toHaveAttribute(
    "data-state",
    "caries",
  );
  await expect(page.getByRole("button", { name: "Guardar", exact: true })).toBeDisabled();
  expect(await writes()).toHaveLength(0);
  expect(attempts).toBe(0);
  await context.setOffline(false);
  await expect(page.getByText(saved)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("alert", { name: "Sin conexión con el servidor" })).toHaveCount(0);
  await assertPersisted();
  expect(attempts).toBe(1);
  expect(errors).toEqual([]);
});

test("SQ slow save: rapid triple save clicks produce one request and one database batch", async ({
  page,
}) => {
  const errors = await monitor(page);
  let attempts = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(batch, async (route) => {
    attempts++;
    await gate;
    await route.continue();
  });
  await page.goto(editor);
  await mark(page);
  // Dispatch a genuine rapid click sequence before React can render the disabled/loading state.
  await page.getByRole("button", { name: "Guardar", exact: true }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect.poll(() => attempts).toBe(1);
  await expect(page.getByText("Guardando…", { exact: true })).toBeVisible();
  expect(await writes()).toHaveLength(0);
  release();
  await expect(page.getByText(saved)).toBeVisible({ timeout: 15_000 });
  await assertPersisted();
  expect(attempts).toBe(1);
  expect(errors).toEqual([]);
});

test("ES removed session: rejected save preserves draft and protected navigation goes to login", async ({
  page,
  context,
}) => {
  const errors = await monitor(page);
  await page.goto(editor);
  await expect(page.getByText("Se guarda automáticamente")).toBeVisible();
  await context.clearCookies();
  await mark(page);
  await expect(page.getByText("Error al guardar", { exact: true })).toBeVisible();
  await assertDraft(page);
  expect(await writes()).toHaveLength(0);
  await page.goto(editor);
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(errors).toEqual([]);
});

test("ES002 server-expired session rejects a save even with access cookies present", async ({
  page,
}) => {
  const errors = await monitor(page);
  await page.goto(editor);
  await expect(page.getByText("Se guarda automáticamente")).toBeVisible();
  await fakeSupabase.patch("app_sessions", "id=eq.00000000-0000-4000-8000-0000000000e1", {
    expires_at: new Date(Date.now() - 60_000).toISOString(),
  });
  await mark(page);
  await expect(page.getByText("Error al guardar", { exact: true })).toBeVisible();
  await assertDraft(page);
  expect(await writes()).toHaveLength(0);
  await page.goto(editor);
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(errors).toEqual([]);
});

test("ES cancellation: navigation during an unsubmitted save leaves no partial database write", async ({
  page,
}) => {
  const errors = await monitor(page);
  let arrived!: () => void;
  const requested = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(batch, async (route) => {
    arrived();
    await gate;
    await route.abort("aborted").catch(() => undefined);
  });
  await page.goto(editor);
  await mark(page);
  await requested;
  await expect(page.getByText("Guardando…", { exact: true })).toBeVisible();
  await page.goto("/app/patients");
  release();
  await expect(page).toHaveURL(/\/app\/patients$/);
  expect(await writes()).toHaveLength(0);
  await page.unroute(batch);
  await page.goto(editor);
  await expect(page.getByText("Se guarda automáticamente")).toBeVisible();
  expect(
    (await fakeSupabase.state()).dental_entities!.filter((row) => row.entity_type === "CARIES"),
  ).toHaveLength(0);
  expect(errors).toEqual([]);
});

test("ES controlled load failure: odontogram GET error renders recovery message and reload recovers", async ({
  page,
}) => {
  const errors = await monitor(page);
  const load = `**/api/patients/${PATIENT_ID}/odontogram`;
  await page.route(load, (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: "UNAVAILABLE", message: "Injected load failure" } },
    }),
  );
  await page.goto(editor);
  await expect(page.getByText("No se pudo cargar el odontograma", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByText("Revisa la conexión con Denty e inténtalo de nuevo.", { exact: true }),
  ).toBeVisible();
  expect(await writes()).toHaveLength(0);
  await page.unroute(load);
  await page.reload();
  await mark(page);
  await expect(page.getByText(saved)).toBeVisible({ timeout: 15_000 });
  await assertPersisted();
  expect(errors).toEqual([]);
});
