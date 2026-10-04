import { defineConfig, devices } from "@playwright/test";

// Browser tests run the production build against e2e/support/fake-supabase.mjs, an in-memory
// Supabase, so flows that write clinical data can be exercised without a real database.
const APP_PORT = Number(process.env.E2E_APP_PORT ?? 3100);
const SUPABASE_PORT = Number(process.env.FAKE_SUPABASE_PORT ?? 54399);
// Lets local runs use the Chromium preinstalled in sandboxes instead of downloading one.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  // Every spec shares one fake database; running them in parallel would mix their writes.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // next start builds request.url on localhost; the same-origin mutation check compares against it.
    baseURL: `http://localhost:${APP_PORT}`,
    trace: "retain-on-failure",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: [
    {
      command: "node e2e/support/fake-supabase.mjs",
      url: `http://127.0.0.1:${SUPABASE_PORT}/__log`,
      env: { FAKE_SUPABASE_PORT: String(SUPABASE_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npx next start -p ${APP_PORT} -H 127.0.0.1`,
      url: `http://127.0.0.1:${APP_PORT}/`,
      env: {
        SUPABASE_URL: `http://127.0.0.1:${SUPABASE_PORT}`,
        SUPABASE_PUBLISHABLE_KEY: "e2e-publishable",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "tablet-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
    },
  ],
});
