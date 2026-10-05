import { expect, test } from "@playwright/test";

import { PATIENT_ID, fakeSupabase, signIn } from "./support/session";

test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

test("dashboard distinguishes failed agenda, alert, and finance queries from empty data", async ({
  page,
}) => {
  const failRequest = (route: Parameters<Parameters<typeof page.route>[1]>[0]) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Datos no disponibles en la prueba" }),
    });
  await page.route("**/api/appointments**", failRequest);
  await page.route("**/api/admin/alerts", failRequest);
  await page.route("**/api/analytics/summary**", failRequest);

  await page.goto("/app");

  await expect(page.getByText("Agenda no disponible").first()).toBeVisible();
  await expect(page.getByText("Alertas no disponibles")).toBeVisible();
  await expect(page.getByText("No disponible").first()).toBeVisible();
  await expect(page.getByText("Jornada despejada")).toHaveCount(0);
  await expect(page.getByText("0 alertas")).toHaveCount(0);
});

test("finance distinguishes failed metrics and lists from zero and empty results", async ({
  page,
}) => {
  const failRequest = (route: Parameters<Parameters<typeof page.route>[1]>[0]) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Datos no disponibles en la prueba" }),
    });
  await page.route("**/api/analytics/summary**", failRequest);
  await page.route("**/api/invoices", failRequest);
  await page.route("**/api/payments", failRequest);
  await page.route("**/api/admin/verifactu/status", failRequest);

  await page.goto("/app/finance");

  await expect(page.getByText("Hay datos financieros no disponibles")).toBeVisible();
  await expect(page.getByText("No disponible").first()).toBeVisible();
  await expect(page.getByText("Facturas no disponibles.")).toBeVisible();
  await expect(page.getByText("Pagos no disponibles.")).toBeVisible();
  await expect(page.getByText("Sin facturas.")).toHaveCount(0);
  await expect(page.getByText("Sin pagos.")).toHaveCount(0);
});

test("patient overview does not turn a failed projection into a zero budget or empty schedule", async ({
  page,
}) => {
  await page.route(`**/api/patient/${PATIENT_ID}/projection`, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Proyección no disponible en la prueba" }),
    }),
  );

  await page.goto(`/app/patients/${PATIENT_ID}`);

  await expect(page.getByRole("alert", { name: "Resumen incompleto" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No disponible" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sin próxima cita" })).toHaveCount(0);
  await expect(page.getByText("0 presupuestos abiertos")).toHaveCount(0);
});
