// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AgendaMiniCalendar } from "../agenda-mini-calendar";

vi.mock("@/domain/dates", async (original) => ({
  ...(await original<typeof import("@/domain/dates")>()),
  todayMadrid: () => "2026-10-03",
}));

afterEach(cleanup);

function mount(selected = "2026-10-16", onSelect = vi.fn()) {
  render(
    <MantineProvider env="test">
      <AgendaMiniCalendar
        selected={selected}
        visible={["2026-10-16", "2026-10-17"]}
        onSelect={onSelect}
      />
    </MantineProvider>,
  );
  return onSelect;
}

describe("AgendaMiniCalendar", () => {
  it("always shows six Monday-first weeks with today, selection and visible days marked", () => {
    mount();
    expect(screen.getByText("Octubre 2026")).toBeInTheDocument();
    const days = screen.getAllByRole("button", { name: /^\d{4}-\d{2}-\d{2}$/ });
    expect(days).toHaveLength(42);
    expect(days[0]).toHaveAccessibleName("2026-09-28");
    expect(screen.getByRole("button", { name: "2026-10-03" })).toHaveAttribute(
      "data-today",
      "true",
    );
    expect(screen.getByRole("button", { name: "2026-10-16" })).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(screen.getByRole("button", { name: "2026-10-17" })).toHaveAttribute(
      "data-visible",
      "true",
    );
    expect(screen.getByRole("button", { name: "2026-09-30" })).toHaveAttribute(
      "data-outside",
      "true",
    );
  });

  it("moves across years and picks a day", () => {
    const onSelect = mount("2026-12-10");
    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("Enero 2027")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^\d{4}-\d{2}-\d{2}$/ })).toHaveLength(42);
    fireEvent.click(screen.getByRole("button", { name: "2027-01-15" }));
    expect(onSelect).toHaveBeenCalledWith("2027-01-15");
    fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(screen.getByText("Noviembre 2026")).toBeInTheDocument();
  });
});
