// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SidebarWeekAgenda } from "../sidebar-week-agenda";

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

function currentMonthDays(): NodeListOf<Element> {
  return screen.getByRole("group", { name: "Días del mes" }).querySelectorAll('a[data-outside="false"]');
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

describe("SidebarWeekAgenda: full month", () => {
  it("shows 31 October dates inside six complete Monday-first weeks", async () => {
    mount();
    expect(screen.getByText("Agenda")).toBeInTheDocument();
    expect(screen.getByText("Octubre de 2026")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Días de la semana" }).children).toHaveLength(7);
    expect(currentMonthDays()).toHaveLength(31);
    expect(screen.getByRole("group", { name: "Días del mes" }).querySelectorAll("a")).toHaveLength(42);
    expect(screen.getByRole("link", { name: /sábado, 31 de octubre/i })).toHaveAttribute(
      "href", "/app/agenda?date=2026-10-31",
    );
    const busy = await screen.findByRole("link", { name: /jueves, 8 de octubre, 3 citas/i });
    expect(busy).toHaveAttribute("href", "/app/agenda?date=2026-10-08");
    expect(busy).toHaveAttribute("data-busy", "true");
    expect(screen.getByText("6 citas este mes")).toBeInTheDocument();
    expect(mocks.monthSummary).toHaveBeenCalledWith("2026-10", "site-zaragoza");
  });

  it("navigates by month, loads new totals and returns to today", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("Noviembre de 2026")).toBeInTheDocument();
    expect(currentMonthDays()).toHaveLength(30);
    expect(await screen.findByText("4 citas este mes")).toBeInTheDocument();
    expect(mocks.monthSummary).toHaveBeenCalledWith("2026-11", "site-zaragoza");
    expect(screen.getByRole("link", { name: /domingo, 1 de noviembre, 4 citas/i })).toHaveAttribute(
      "href", "/app/agenda?date=2026-11-01",
    );
    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
    expect(screen.getByText("Octubre de 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Abrir agenda del jueves, 8 de octubre/i })).toHaveAttribute(
      "href", "/app/agenda?date=2026-10-08",
    );
  });

  it("keeps boundary dates linked and DST changes do not skip days", () => {
    mount();
    const nextMonth = screen.getByRole("link", { name: /domingo, 1 de noviembre, mes contiguo/i });
    expect(nextMonth).toHaveAttribute("href", "/app/agenda?date=2026-11-01");
    expect(nextMonth).toHaveAttribute("data-outside", "true");
    expect(screen.getByRole("link", { name: /domingo, 25 de octubre/i })).toHaveAttribute(
      "href", "/app/agenda?date=2026-10-25",
    );
    expect(screen.getByRole("link", { name: /lunes, 26 de octubre/i })).toHaveAttribute(
      "href", "/app/agenda?date=2026-10-26",
    );
  });

  it.each([
    ["2027-02-10", 28],
    ["2028-02-10", 29],
  ])("shows every day of February for %s", (date, length) => {
    mount(date);
    expect(currentMonthDays()).toHaveLength(length);
    expect(screen.getByRole("group", { name: "Días del mes" }).querySelectorAll("a")).toHaveLength(42);
  });

  it("never fetches private appointment counts without an active clinic site", () => {
    mocks.siteId = null;
    mount();
    expect(currentMonthDays()).toHaveLength(31);
    expect(screen.getByText("Selecciona una sede")).toBeInTheDocument();
    expect(mocks.monthSummary).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /jueves, 8 de octubre, citas no disponibles/i }))
      .toHaveAttribute("href", "/app/agenda?date=2026-10-08");
  });

  it("reuses the monthly summary cache for each requested month", async () => {
    mount();
    await waitFor(() => expect(mocks.monthSummary).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await waitFor(() => expect(mocks.monthSummary).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    await waitFor(() => expect(screen.getByText("6 citas este mes")).toBeInTheDocument());
    expect(mocks.monthSummary).toHaveBeenCalledTimes(2);
  });
});
