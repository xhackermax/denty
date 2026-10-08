// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardCalendar } from "../dashboard-calendar";

const mocks = vi.hoisted(() => ({ monthSummary: vi.fn(), list: vi.fn() }));

vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({
    agenda: { monthSummary: mocks.monthSummary },
    appointments: { list: mocks.list },
  }),
}));

const names: Record<string, string> = { p1: "Ana López", p2: "Luis Pérez" };

beforeEach(() => {
  mocks.monthSummary.mockImplementation(async (month: string) => ({
    month,
    days:
      month === "2026-10"
        ? [
            { date: "2026-10-03", count: 2, patientIds: ["p1", "p2"] },
            { date: "2026-10-16", count: 4, patientIds: ["p1", "p2", "p9"] },
          ]
        : [],
  }));
  mocks.list.mockImplementation(async (date: string) =>
    date === "2026-10-16"
      ? [
          {
            id: "a1",
            patientId: "p2",
            startsAt: "2026-10-16T08:30:00Z",
            endsAt: "2026-10-16T09:00:00Z",
            status: "CONFIRMED",
            title: "Revisión",
          },
        ]
      : [],
  );
});

afterEach(cleanup);

function mount(today = "2026-10-03") {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MantineProvider env="test">
        <DashboardCalendar today={today} patientName={(id) => names[id]} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("DashboardCalendar", () => {
  it("shows the current month with today marked", async () => {
    mount();
    expect(screen.getByRole("heading", { name: "Agenda" })).toBeInTheDocument();
    expect(screen.getByText("Octubre de 2026")).toBeInTheDocument();
    const today = await screen.findByRole("link", { name: /sábado, 3 de octubre.*hoy/i });
    expect(today).toHaveAttribute("data-today", "true");
    expect(today).toHaveAttribute("href", "/app/agenda?date=2026-10-03");
    expect(mocks.monthSummary).toHaveBeenCalledWith("2026-10", undefined);
  });

  it("marks busy days with their appointment count and patients' initials", async () => {
    mount();
    const busy = await screen.findByRole("link", { name: /16 de octubre, 4 citas/i });
    expect(busy).toHaveAttribute("href", "/app/agenda?date=2026-10-16");
    expect(within(busy).getByText("AL")).toBeInTheDocument();
    expect(within(busy).getByText("+3")).toBeInTheDocument();
    expect(within(busy).queryByText("LP")).toBeNull();
  });

  it("lists the chosen day's appointments and links to that day in the agenda", async () => {
    mount();
    fireEvent.click(await screen.findByRole("link", { name: /16 de octubre, 4 citas/i }));
    expect(await screen.findByText("Luis Pérez")).toBeInTheDocument();
    expect(screen.getByText("10:30")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir la agenda del 16 de octubre" })).toHaveAttribute(
      "href",
      "/app/agenda?date=2026-10-16",
    );
  });

  it("shows only the next two appointments and links to the rest", async () => {
    mocks.list.mockImplementation(async (date: string) =>
      ["08:00", "09:00", "10:00", "11:00"].map((time, index) => ({
        id: `b${index}`,
        patientId: index % 2 ? "p2" : "p1",
        startsAt: `${date}T${time}:00Z`,
        endsAt: `${date}T${time}:30Z`,
        status: "CONFIRMED",
        title: "Revisión",
      })),
    );
    mount();
    expect(await screen.findAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Ver 2 citas más" })).toHaveAttribute(
      "href",
      "/app/agenda?date=2026-10-03",
    );
  });

  it("names statuses exactly as the agenda does", async () => {
    mocks.list.mockImplementation(async (date: string) => [
      {
        id: "s1",
        patientId: "p1",
        startsAt: `${date}T08:00:00Z`,
        endsAt: `${date}T08:30:00Z`,
        status: "PLANNED",
        title: "Revisión",
      },
      {
        id: "s2",
        patientId: "p2",
        startsAt: `${date}T09:00:00Z`,
        endsAt: `${date}T09:30:00Z`,
        status: "WAITING",
        title: "Revisión",
      },
    ]);
    mount();
    expect(await screen.findByText("Pendiente de confirmación")).toBeInTheDocument();
    expect(screen.getByText("Ha llegado")).toBeInTheDocument();
  });

  it("says when the chosen day is free", async () => {
    mount();
    fireEvent.click(await screen.findByRole("link", { name: /20 de octubre, sin citas/i }));
    expect(await screen.findByText("Sin citas este día.")).toBeInTheDocument();
  });

  it("renders all 31 days of October without truncating any week", () => {
    mount();
    const grid = screen.getByRole("group", { name: "Días del mes" });
    expect(grid.querySelectorAll('a[data-outside="false"]')).toHaveLength(31);
    expect(grid.querySelectorAll('a[data-outside]')).toHaveLength(42);
    expect(screen.getByRole("link", { name: /sábado, 31 de octubre, sin citas/i })).toHaveAttribute(
      "href",
      "/app/agenda?date=2026-10-31",
    );
  });

  it("shows every day in a 30-day month after navigation", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    const grid = screen.getByRole("group", { name: "Días del mes" });
    expect(grid.querySelectorAll('a[data-outside="false"]')).toHaveLength(30);
    expect(grid.querySelectorAll('a[data-outside]')).toHaveLength(42);
  });

  it("shows all 28 days in a common-year February", () => {
    mount("2027-02-10");
    const grid = screen.getByRole("group", { name: "Días del mes" });
    expect(grid.querySelectorAll('a[data-outside="false"]')).toHaveLength(28);
    expect(grid.querySelectorAll('a[data-outside]')).toHaveLength(42);
  });

  it("shows all 29 days in a leap-year February", () => {
    mount("2028-02-10");
    const grid = screen.getByRole("group", { name: "Días del mes" });
    expect(grid.querySelectorAll('a[data-outside="false"]')).toHaveLength(29);
    expect(screen.getByRole("link", { name: /martes, 29 de febrero, sin citas/i })).toHaveAttribute(
      "href",
      "/app/agenda?date=2028-02-29",
    );
  });

  it("moves between months and back to today", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await waitFor(() => expect(mocks.monthSummary).toHaveBeenCalledWith("2026-11", undefined));
    expect(screen.getByText("Noviembre de 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
    expect(screen.getByText("Octubre de 2026")).toBeInTheDocument();
  });
});
