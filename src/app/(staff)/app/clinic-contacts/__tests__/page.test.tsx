// @vitest-environment jsdom
import { renderToString } from "react-dom/server";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ClinicContactsPage from "../page";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function withoutSupabaseConfig() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
}

describe("clinic contacts build regression", () => {
  it("prerenders the loading view without initializing browser Supabase", () => {
    withoutSupabaseConfig();
    expect(renderToString(<ClinicContactsPage />)).toContain("Cargando contactos");
  });
  it("shows a recoverable error when the session service is unavailable", async () => {
    withoutSupabaseConfig();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 503 }));
    render(<ClinicContactsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo validar la sesión.");
  });
});
