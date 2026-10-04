import type { BrowserContext, Page } from "@playwright/test";

// Must match IDS in fake-supabase.mjs: the session row the fake seeds for the admin user.
export const PATIENT_ID = "00000000-0000-4000-8000-0000000000d1";
export const CHILD_PATIENT_ID = "00000000-0000-4000-8000-0000000000d2"; // born 2022: primary teeth
export const MIXED_PATIENT_ID = "00000000-0000-4000-8000-0000000000d3"; // born 2018: mixed
const APP_SESSION_ID = "00000000-0000-4000-8000-0000000000e1";
const FAKE_SUPABASE = `http://127.0.0.1:${process.env.FAKE_SUPABASE_PORT ?? 54399}`;

export interface FakeLogEntry {
  kind: string;
  name?: string;
  table?: string;
  path?: string;
  known?: boolean;
  handled?: boolean;
  body?: Record<string, unknown>;
}

export type FakeTables = Record<string, Record<string, unknown>[]>;

export const fakeSupabase = {
  reset: async () => void (await fetch(`${FAKE_SUPABASE}/__reset`)),
  log: async () => (await (await fetch(`${FAKE_SUPABASE}/__log`)).json()) as FakeLogEntry[],
  state: async () => (await (await fetch(`${FAKE_SUPABASE}/__state`)).json()) as FakeTables,
  patch: async (table: string, filter: string, body: Record<string, unknown>) =>
    void (await fetch(`${FAKE_SUPABASE}/rest/v1/${table}?${filter}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })),
};

/** Signs the browser in as the seeded clinic admin (the fake accepts any access token). */
export async function signIn(context: BrowserContext, baseURL: string): Promise<void> {
  const { hostname } = new URL(baseURL);
  await context.addCookies(
    [
      ["denty_sb_access", "e2e-access-token"],
      ["denty_app_session", APP_SESSION_ID],
    ].map(([name, value]) => ({ name: name!, value: value!, domain: hostname, path: "/" })),
  );
}

/**
 * Keeps the browser off the real Supabase project baked into the client bundle (realtime) and
 * records every failing API response so a test can assert none happened.
 */
export async function isolatePage(page: Page): Promise<string[]> {
  await page.route(/supabase\.co/, (route) => route.abort());
  const failures: string[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith("/api/") && response.status() >= 500)
      failures.push(`${response.status()} ${response.request().method()} ${url.pathname}`);
  });
  page.on("pageerror", (error) => failures.push(`pageerror ${error.message}`));
  return failures;
}
