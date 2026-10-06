import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fakeSupabase, isolatePage, PATIENT_ID, signIn } from "./support/session";

// Run explicitly: this file contains real 30-minute and two-hour wall-clock tests.
// DENTY_TORTURE_MINUTES / DENTY_SOAK_MINUTES can extend runs; shortening is diagnostic only.
const odontogram = `/app/patients/${PATIENT_ID}/odontogram`;
const routes = ["/app", "/app/patients", "/app/agenda", odontogram];
const seed = Number(process.env.DENTY_MONKEY_SEED ?? 1000) >>> 0;
function random(initial: number) {
  let state = initial;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function minutes(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`Harness configuration: ${name} must be positive`);
  return value;
}

// Long traces retain every DOM snapshot in the runner and distort the memory stress result.
// Persist action checkpoints and failure screenshots instead.
test.use({ hasTouch: true, trace: "off" });
test.beforeEach(async ({ context, baseURL }) => {
  await fakeSupabase.reset();
  await signIn(context, baseURL!);
});

async function run(
  page: Page,
  info: TestInfo,
  options: { iterations?: number; durationMs?: number },
) {
  const rng = random(seed);
  const actions: Record<string, unknown>[] = [];
  const violations: Record<string, unknown>[] = [];
  const events: Record<string, unknown>[] = [];
  const heaps: { elapsedMs: number; bytes: number; url: string }[] = [];
  const heapBudgetBytes = Number(process.env.DENTY_HEAP_BUDGET_MB ?? 256) * 1024 * 1024;
  if (!Number.isFinite(heapBudgetBytes) || heapBudgetBytes <= 0)
    throw new Error("Harness configuration: invalid DENTY_HEAP_BUDGET_MB");
  const applicationFailures = await isolatePage(page);
  const unexpectedApi: string[] = [];
  const responseChecks = new Set<Promise<void>>();
  let injected = false;
  const stamp = () => ({ utc: new Date().toISOString(), url: page.url() });
  page.on("console", (message) => {
    if (message.type() === "error")
      events.push({ ...stamp(), kind: "console", injected, text: message.text() });
  });
  page.on("requestfailed", (request) =>
    events.push({
      ...stamp(),
      kind: "network",
      injected,
      request: request.url(),
      error: request.failure()?.errorText,
    }),
  );
  page.on("response", (response) => {
    if (
      !injected &&
      new URL(response.url()).pathname.startsWith("/api/") &&
      response.status() >= 400
    ) {
      const check = (async () => {
        const pathname = new URL(response.url()).pathname;
        // The documented empty-plan read is 404, not a broken route or failed write.
        if (
          response.status() === 404 &&
          response.request().method() === "GET" &&
          pathname === `/api/patients/${PATIENT_ID}/clinical-plan`
        ) {
          const body = (await response.json().catch(() => null)) as {
            error?: { code?: string };
          } | null;
          if (
            body?.error?.code === "CLINICAL_PLAN_NOT_FOUND" &&
            !(await fakeSupabase.state()).clinical_plans?.length
          ) {
            events.push({ ...stamp(), kind: "expected-empty-plan", status: 404 });
            return;
          }
        }
        unexpectedApi.push(`${response.status()} ${response.request().method()} ${response.url()}`);
      })().catch((error) => {
        unexpectedApi.push(`Response inspection failed: ${String(error)}`);
      });
      responseChecks.add(check);
      void check.then(() => responseChecks.delete(check));
    }
  });
  page.on("crash", () => violations.push({ ...stamp(), kind: "browser-crash" }));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const started = Date.now();
  let heartbeat = started;
  let nextSample = started;
  let checkedFailures = 0;
  let checkedApi = 0;
  let i = 0;
  await page.goto(odontogram);

  async function clean() {
    // Never navigate away from a known unsaved editor; failed persistence is a violation.
    if (new URL(page.url()).pathname === odontogram) {
      await expect(page.getByText("Cambios pendientes…", { exact: true })).toBeHidden({
        timeout: 15_000,
      });
      await expect(page.getByText("Guardando…", { exact: true })).toBeHidden({ timeout: 15_000 });
      await expect(page.getByText("No se pudo guardar", { exact: false })).toBeHidden();
      await expect(page.getByText("Error al guardar", { exact: true })).toBeHidden();
      await expect(page.getByText("Conflicto", { exact: true })).toBeHidden();
    }
  }
  async function healthy() {
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
    expect(await page.evaluate(() => document.body.innerText.trim().length)).toBeGreaterThan(20);
    await expect(page.getByText("No se pudo cargar el odontograma", { exact: true })).toBeHidden();
    await expect(page.getByRole("alert", { name: "No se pudo cargar", exact: true })).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Denty no pudo iniciar", exact: true }),
    ).toBeHidden();
    // A real renderer round-trip after each action detects an unresponsive page.
    expect(
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => resolve(true))),
      ),
    ).toBe(true);
    const added = applicationFailures.slice(checkedFailures);
    checkedFailures = applicationFailures.length;
    expect(added, "Uncaught JS error or unexpected HTTP 5xx").toEqual([]);
    await Promise.all([...responseChecks]);
    const apiAdded = unexpectedApi.slice(checkedApi);
    checkedApi = unexpectedApi.length;
    expect(apiAdded, "Unexpected API 4xx/5xx outside deliberate read fault injection").toEqual([]);
  }
  async function optionalButton(name: string, twice = false, touch = false) {
    const button = page.getByRole("button", { name, exact: true }).first();
    if (!(await button.isVisible()) || !(await button.isEnabled())) return "unavailable";
    if (touch) await button.tap();
    else await button.click();
    if (twice && (await button.isVisible()) && (await button.isEnabled())) await button.click();
    return "clicked";
  }
  while (options.iterations ? i < options.iterations : Date.now() - started < options.durationMs!) {
    const roll = rng();
    const entry: Record<string, unknown> = { index: i++, ...stamp(), roll };
    actions.push(entry);
    try {
      await clean();
      if (roll < 0.1) {
        entry.action = "reload";
        await page.reload();
      } else if (roll < 0.2) {
        entry.action = "back";
        await page.goBack();
        if (!page.url().includes("/app")) await page.goto("/app");
      } else if (roll < 0.3) {
        entry.action = "forward";
        await page.goForward();
      } else if (roll < 0.4) {
        entry.action = "duplicate-click";
        entry.result = await optionalButton("Restablecer vista", true);
      } else if (roll < 0.45) {
        entry.action = "network-failure";
        // Fail only a read; writes are excluded so the monkey cannot silently discard dirty data.
        injected = true;
        const matcher = "**/api/**";
        await page.route(matcher, (route) =>
          route.request().method() === "GET" ? route.abort("failed") : route.continue(),
        );
        try {
          await page.reload();
        } finally {
          await page.unroute(matcher);
          injected = false;
        }
        await page.reload();
      } else {
        const choice = Math.floor(rng() * 13);
        entry.choice = choice;
        if (choice < 3) {
          entry.action = "route";
          entry.target = routes[Math.floor(rng() * routes.length)];
          await page.goto(entry.target as string);
        } else if (choice === 3) {
          entry.action = "scroll";
          await page.mouse.wheel(0, rng() < 0.5 ? 650 : -650);
        } else if (choice === 4) {
          entry.action = "undo";
          entry.result = await optionalButton("Deshacer");
        } else if (choice === 5) {
          entry.action = "redo";
          entry.result = await optionalButton("Rehacer");
        } else if (choice === 6) {
          entry.action = "layers";
          entry.result = await optionalButton(rng() < 0.5 ? "Mostrar todo" : "Restablecer vista");
        } else if (choice === 7) {
          entry.action = "view-or-menu";
          const view = page
            .getByText(rng() < 0.5 ? "Vista visual" : "Editor", { exact: true })
            .first();
          if (await view.isVisible()) await view.click();
          else entry.result = await optionalButton("Más herramientas");
          await page.keyboard.press("Escape");
        } else if (choice === 8) {
          entry.action = "touch-fixture-caries";
          const face = page.getByRole("button", {
            name: "Diente 36 superficie oclusal",
            exact: true,
          });
          if ((await face.isVisible()) && (await face.isEnabled())) {
            await face.tap();
            await expect(
              page.getByText("Guardado · información clínica al día", { exact: true }),
            ).toBeVisible({ timeout: 15_000 });
            entry.persistedEntityCount = (await fakeSupabase.state()).dental_entities?.length;
          } else entry.result = "unavailable";
        } else if (choice === 9) {
          entry.action = "type-and-clear-search";
          const search = page.getByRole("textbox", { name: /buscar|búsqueda/i }).first();
          if ((await search.isVisible()) && (await search.isEditable())) {
            await search.fill(rng() < 0.5 ? "Paciente 🦷" : "   ");
            await search.clear();
          } else entry.result = "unavailable";
        } else if (choice === 10) {
          entry.action = "history-open-close";
          entry.result = await optionalButton("Historial", true);
        } else if (choice === 11) {
          entry.action = "duplicate-tab-switch-close";
          const other = await page.context().newPage();
          const otherFailures = await isolatePage(other);
          try {
            await other.goto(page.url());
            await other.bringToFront();
            await expect(other.locator("main").first()).toBeVisible();
            expect(otherFailures).toEqual([]);
            await page.bringToFront();
          } finally {
            await other.close();
          }
        } else {
          entry.action = "appointment-open-cancel";
          const button = page.getByRole("button", { name: "Nueva cita", exact: true }).last();
          if ((await button.isVisible()) && (await button.isEnabled())) {
            await button.click();
            await expect(page.getByRole("dialog")).toBeVisible();
            await page.keyboard.press("Escape");
            await expect(page.getByRole("dialog")).toBeHidden();
          } else entry.result = "unavailable";
        }
      }
      await clean();
      await healthy();
      entry.result ??= "ok";
    } catch (error) {
      const text = String(error);
      const kind = /selector|Unexpected token|strict mode violation|Harness configuration/i.test(
        text,
      )
        ? "harness-error"
        : "application-or-interaction-failure";
      const violation = { ...stamp(), index: entry.index, kind, error: text };
      violations.push(violation);
      entry.result = violation;
      await info.attach(`failure-${i}.png`, {
        body: await page
          .screenshot({ fullPage: true })
          .catch(() => Buffer.from("screenshot unavailable")),
        contentType: "image/png",
      });
      // Continue collecting independent diagnostics, retaining the complete failure record.
      await page.goto(odontogram).catch(() => undefined);
    }
    if (Date.now() >= nextSample) {
      try {
        await cdp.send("HeapProfiler.collectGarbage");
        const metrics = await cdp.send("Performance.getMetrics");
        const bytes = metrics.metrics.find((m) => m.name === "JSHeapUsedSize")?.value;
        if (bytes === undefined) throw new Error("JSHeapUsedSize metric unavailable");
        heaps.push({ elapsedMs: Date.now() - started, bytes, url: page.url() });
        if (bytes > heapBudgetBytes)
          violations.push({ ...stamp(), kind: "JS-heap-budget-exceeded", bytes, heapBudgetBytes });
      } catch (error) {
        events.push({ ...stamp(), kind: "metrics-unavailable", error: String(error) });
      }
      nextSample = Date.now() + 60_000;
    }
    if (Date.now() - heartbeat >= 60_000) {
      await writeFile(
        info.outputPath("torture-checkpoint.json"),
        JSON.stringify({
          seed,
          elapsedMs: Date.now() - started,
          requested: options,
          actions,
          violations,
          events,
          heaps,
        }),
      );
      console.log(
        `[torture heartbeat] ${JSON.stringify({ ...stamp(), seed, actions: i, elapsedMs: Date.now() - started, violations: violations.length })}`,
      );
      heartbeat = Date.now();
    }
    // Seeded random pacing exercises variable timing while retaining replayable choices.
    const delayMs = options.durationMs ? 50 + Math.floor(rng() * 401) : 20 + Math.floor(rng() * 81);
    entry.delayMs = delayMs;
    await page.waitForTimeout(delayMs);
  }
  const report = {
    seed,
    elapsedMs: Date.now() - started,
    requested: options,
    heapBudgetBytes,
    actions,
    violations,
    events,
    unexpectedApi,
    heaps,
    memoryInterpretation:
      "Post-forced-GC Chromium JS heap only, sampled every 60 seconds. Values across reloads are different renderer lifetimes. A configurable 256 MiB post-GC JS heap budget flags excessive retained heap; passing that budget is not proof of leak freedom. Compare sustained same-route samples and inspect trace. This excludes browser/native/server memory.",
  };
  const reportPath = info.outputPath("complete-torture-report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  await info.attach("complete-torture-report.json", {
    path: reportPath,
    contentType: "application/json",
  });
  console.log(
    `[torture complete] seed=${seed} actions=${i} elapsedMs=${report.elapsedMs} violations=${violations.length}`,
  );
  expect(
    violations,
    "See complete sequence, UTC times, URLs, console/network events and failure screenshots",
  ).toEqual([]);
}

test("MONKEY1000 deterministic 1000-action sequence", async ({ page }, info) => {
  test.setTimeout(60 * 60_000);
  await run(page, info, { iterations: 1000 });
});

test("TORTURE combined real 30-minute randomized run", async ({ page }, info) => {
  test.skip(
    process.env.DENTY_LONG_TESTS !== "1",
    "Opt in with DENTY_LONG_TESTS=1 for real elapsed long tests",
  );
  const durationMs = minutes("DENTY_TORTURE_MINUTES", 30) * 60_000;
  test.setTimeout(durationMs + 120_000);
  await run(page, info, { durationMs });
});

test("ST005 real extended soak", async ({ page }, info) => {
  test.skip(
    process.env.DENTY_LONG_TESTS !== "1",
    "Opt in with DENTY_LONG_TESTS=1 for real elapsed long tests",
  );
  const durationMs = minutes("DENTY_SOAK_MINUTES", 120) * 60_000;
  test.setTimeout(durationMs + 120_000);
  await run(page, info, { durationMs });
});
