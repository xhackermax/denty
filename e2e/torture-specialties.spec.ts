import { expect, test, type Page } from "@playwright/test";
import { PATIENT_ID, fakeSupabase, isolatePage, signIn } from "./support/session";

const url = `/app/patients/${PATIENT_ID}/odontogram`;
const saved = "Guardado · plan y presupuesto al día";
const face = (page: Page) => page.getByRole("button", { name: "Diente 36 superficie oclusal" });

async function openOrthodontics(page: Page) {
  await page.getByRole("combobox", { name: "Preset de vista" }).selectOption("orthodontic_review");
  await page.locator("summary").filter({ hasText: /^Editar ortodoncia$/ }).click();
  return page.getByRole("region", { name: "Odontograma ortodóntico", exact: true });
}

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

test("SP-001: persisted orthodontic notes, overjet and tooth mark hydrate after full reload", async ({ page }) => {
  test.setTimeout(60_000);
  const failures = await isolatePage(page);
  await page.goto(url);
  const panel = await openOrthodontics(page);
  await panel.getByRole("textbox", { name: "Notas ortodónticas" }).fill("Control persistente de ortodoncia");
  await panel.getByRole("textbox", { name: "Overjet", exact: true }).fill("7");
  await panel.locator('button[title="36 · Sin marca. Clic para cambiar."]').click();
  await panel.getByRole("button", { name: "Guardar odontograma ortodóntico" }).click();
  await expect(page.getByText(saved)).toBeVisible({ timeout: 15_000 });
  const entities = (await fakeSupabase.state()).dental_entities!;
  expect(entities).toHaveLength(1);
  expect(entities[0]).toMatchObject({ entity_type: "ORTHODONTIC", attributes_json: {
    notes: "Control persistente de ortodoncia", overjetMm: 7, toothMarks: { "36": "bracket" },
  } });
  await page.reload();
  const restored = await openOrthodontics(page);
  await expect(restored.getByRole("textbox", { name: "Notas ortodónticas" })).toHaveValue("Control persistente de ortodoncia");
  await expect(restored.getByRole("textbox", { name: "Overjet", exact: true })).toHaveValue("7 mm");
  await expect(restored.locator('button[title="36 · Bracket. Clic para cambiar."]')).toHaveAttribute("data-mark", "bracket");
  expect((await fakeSupabase.state()).dental_entities).toEqual(entities);
  expect(failures).toEqual([]);
});

test("SP-002: snapshot creation flushes a pending clinical draft before capturing committed data", async ({ page }) => {
  test.setTimeout(45_000);
  const failures = await isolatePage(page);
  await page.goto(url);
  await expect(face(page)).toBeVisible();
  // Freeze the debounce only; user events, React effects and network requests remain real.
  const clockStart = new Date();
  await page.clock.install({ time: clockStart });
  await page.clock.pauseAt(new Date(clockStart.getTime() + 1000));
  await page.getByRole("navigation", { name: "Capas del odontograma" }).getByRole("button", { name: "Historial", exact: true }).click();
  await page.getByRole("textbox", { name: "Nombre del control" }).fill("Control con borrador pendiente");
  await face(page).click();
  await expect(page.getByText("Cambios pendientes…", { exact: true })).toBeVisible();
  expect((await fakeSupabase.state()).dental_entities).toHaveLength(0);
  await page.getByRole("button", { name: "Guardar snapshot", exact: true }).click();
  await expect(page.getByText("Snapshot guardado.", { exact: true })).toBeVisible();
  const state = await fakeSupabase.state();
  expect(state.odontogram_snapshots).toHaveLength(1);
  expect(state.odontogram_snapshots![0]).toMatchObject({
    label: "Control con borrador pendiente", version: 2,
    payload_json: { entities: [expect.objectContaining({ tooth: "36", entityType: "CARIES", surfacesJson: ["O"] })] },
  });
  const writes = (await fakeSupabase.log()).filter(entry => ["save_odontogram_batch", "create_odontogram_snapshot"].includes(entry.name ?? ""));
  expect(writes.map(entry => entry.name)).toEqual(["save_odontogram_batch", "create_odontogram_snapshot"]);
  await page.reload();
  await expect(page.getByText("No se pudo cargar el odontograma")).toHaveCount(0);
  expect((await fakeSupabase.state()).odontogram_snapshots).toHaveLength(1);
  expect(failures).toEqual([]);
});

test("SP-003: applying a completed restoration updates the same surface's visible state", async ({ page }) => {
  const failures = await isolatePage(page);
  await page.goto(url);
  await face(page).click();
  await expect(page.getByText(saved)).toBeVisible({ timeout: 15_000 });
  await expect(face(page)).toHaveAttribute("data-state", "caries");
  await page.getByRole("button", { name: "Obturación. Realizada. Se aplica a Cara.", exact: true }).click();
  await face(page).click();
  await expect(page.getByText(saved)).toBeVisible({ timeout: 15_000 });
  const restoration = (await fakeSupabase.state()).dental_entities!.find(row => row.entity_type === "RESTORATION");
  expect(restoration).toMatchObject({ tooth: "36", status: "restoration_completed", surfaces_json: ["O"] });
  await expect(face(page)).toHaveAttribute("data-state", "filling");
  await page.reload();
  await expect(face(page)).toHaveAttribute("data-state", "filling");
  expect(failures).toEqual([]);
});

test("SP-004: a whole-tooth tool on a hidden layer cannot register an invisible mark", async ({ page }) => {
  const failures = await isolatePage(page);
  await page.goto(url);
  await expect(face(page)).toBeVisible();
  const clockStart = new Date();
  await page.clock.install({ time: clockStart });
  await page.clock.pauseAt(new Date(clockStart.getTime() + 1000));
  await page.getByRole("button", { name: "Corona. Realizada. Se aplica a Diente.", exact: true }).click();
  await expect(page.getByText("La herramienta activa pertenece a una capa oculta", { exact: true })).toBeVisible();
  // The UI explicitly requires reactivating the layer before registering a mark.
  // aria-disabled alone does not suppress a real pointer click on a native button.
  // Bypass Playwright's ARIA actionability check, while still sending pointer events.
  const tooth = page.getByRole("button", { name: "Diente 46", exact: true });
  await expect(tooth).toHaveAttribute("aria-disabled", "true");
  await tooth.click({ force: true });
  await page.clock.runFor(1300);
  expect((await fakeSupabase.state()).dental_entities).toHaveLength(0);
  await expect(page.getByRole("button", { name: "Guardar", exact: true })).toBeDisabled();
  expect((await fakeSupabase.log()).filter(entry => entry.name === "save_odontogram_batch")).toHaveLength(0);
  expect(failures).toEqual([]);
});
