// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SidebarWeekAgenda, weekDatesMadrid } from "../sidebar-week-agenda";

const mocks = vi.hoisted(() => ({
  monthSummary: vi.fn(),
  siteId: "site-zaragoza" as string | null,
  loading: false,
}));

vi.mock("@/shared/tenancy/active-context", () => ({
  useActiveTenant: () => ({
    activeSiteId: mocks.siteId,
    loading: mocks.loading,
  }),
}));

vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({ agenda: { monthSummary: mocks.monthSummary } }),
}));

function mount(initialToday = "2026-10-08") {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SidebarWeekAgenda active={true} initialToday={initialToday} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.siteId = "site-zaragoza";
  mocks.loading = false;
  mocks.monthSummary.mockImplementation(async (month: string) => ({
    days: month === "2026-10"
      ? [
          { date: "2026-10-08", count: 3, patientIds: [] },
          { date: "2026-10-09", count: 1, patientIds: [] },
          { date: "2026-10-30", count: 2, patientIds: [] },
        ]
      : month === "2026-11"
        ? [{ date: "2026-11-01", count: 4, patientIds: [] }]
        : [],
  }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SidebarWeekAgenda", () => {
  it("uses Monday-first Madrid days even across month and DST boundaries", () => {
    expect(weekDatesMadrid("2026-10-08")).toEqual([
      "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08",
      "2026-10-09", "2026-10-10", "2026-10-11",
    ]);
    expect(weekDatesMadrid("2026-10-25")).toEqual([
      "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22",
      "2026-10-23", "2026-10-24", "2026-10-25",
    ]);
    expect(weekDatesMadrid("2026-11-01")[0]).toBe("2026-10-26");
  });

  it("replaces the label with seven linked days and real scoped appointment counts", async () => {
    mount();
    expect(screen.queryByText(/^Agenda$/)).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Días de la semana" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Semana anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Semana siguiente" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Abrir agenda de hoy/ })).toHaveAttribute("href", "/app/agenda?date=2026-10-08");
    const today = await screen.findByRole("link", { name: /jueves, 8 de octubre, 3 citas/i });
    expect(today).toHaveAttribute("href", "/app/agenda?date=2026-10-08");
    expect(today).toHaveAttribute("data-busy", "true");
    expect(screen.getByText("4 citas esta semana")).toBeInTheDocument();
    expect(mocks.monthSummary).toHaveBeenCalledWith("2026-10", "site-zaragoza");
  });

  it("moves between weeks and returns to this week's days", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Semana siguiente" }));
    expect(await screen.findByRole("link", { name: /lunes, 12 de octubre/i })).toHaveAttribute(
      "href", "/app/agenda?date=2026-10-12",
    );
    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
    expect(screen.getByRole("link", { name: /jueves, 8 de octubre/i })).toHaveAttribute(
      "href", "/app/agenda?date=2026-10-08",
    );
  });

  it("loads both months when the week crosses into November", async () => {
    mount("2026-10-30");
    await waitFor(() => {
      expect(mocks.monthSummary).toHaveBeenCalledWith("2026-10", "site-zaragoza");
      expect(mocks.monthSummary).toHaveBeenCalledWith("2026-11", "site-zaragoza");
    });
    expect(await screen.findByRole("link", { name: /domingo, 1 de noviembre, 4 citas/i }))
      .toHaveAttribute("href", "/app/agenda?date=2026-11-01");
    expect(screen.getByText("6 citas esta semana")).toBeInTheDocument();
  });

  it("does not request private appointment data before an active site is available", () => {
    mocks.siteId = null;
    mount();
    expect(screen.getByText("Selecciona una sede")).toBeInTheDocument();
    expect(mocks.monthSummary).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /jueves, 8 de octubre, citas no disponibles/i }))
      .toHaveAttribute("href", "/app/agenda?date=2026-10-08");
  });
});
