// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const newPatients = vi.fn();

vi.mock("@/shared/tenancy/active-context", () => ({
  useActiveTenant: () => ({ activeSiteId: "site-1" }),
}));
vi.mock("@/shared/motion", () => ({
  AnimatedProgress: () => null,
  MotionScrollReveal: ({ children }: { children: React.ReactNode }) => children,
  SpeedingMetric: () => null,
}));
vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({
    analytics: {
      summary: async () => ({ kpiVersion: "DENTY-KPI-1" }),
      treatments: async () => ({ kpiVersion: "DENTY-KPI-1", items: [] }),
      periods: async () => ({
        kpiVersion: "DENTY-KPI-1",
        items: [{ periodStart: "2026-09-01", producedCents: 10000 }],
      }),
      newPatients: (query: Record<string, unknown>) => newPatients(query),
    },
    agenda: { waitTimeMetrics: async () => ({}) },
  }),
}));

import { AnalysisModule } from "../analysis-module";

function renderModule() {
  newPatients.mockImplementation(async (query: Record<string, unknown>) =>
    query.granularity
      ? {
          kpiVersion: "DENTY-KPI-1",
          count: 9,
          items: [
            { periodStart: "2026-10-01", count: 7 },
            { periodStart: "2026-09-01", count: 2 },
          ],
        }
      : { kpiVersion: "DENTY-KPI-1", count: 7, items: [] },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MantineProvider>
        <AnalysisModule />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("AnalysisModule new patients", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows new patients for the selected period without the site filter", async () => {
    renderModule();
    const tile = (await screen.findByText("Pacientes nuevos")).parentElement!;
    expect(await within(tile).findByText("7")).toBeTruthy();
    const rangeQuery = newPatients.mock.calls.find(([query]) => !query.granularity)?.[0];
    expect(rangeQuery).toEqual({ start: expect.any(String), end: expect.any(String) });
  });

  it("adds new patients to history, including periods without billing", async () => {
    renderModule();
    expect(await screen.findByText(/^7 pacientes nuevos · Producción/)).toBeTruthy();
    expect(screen.getByText(/^2 pacientes nuevos · Producción 100,00/)).toBeTruthy();
  });
});
