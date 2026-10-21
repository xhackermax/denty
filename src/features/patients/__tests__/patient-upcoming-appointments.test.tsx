// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PatientUpcomingAppointments,
  upcomingAppointments,
  type UpcomingAppointment,
} from "../patient-upcoming-appointments";

const NOW = Date.parse("2026-10-05T08:00:00Z");

function appointment(overrides: Partial<UpcomingAppointment>): UpcomingAppointment {
  return {
    id: "a1",
    startsAt: "2026-10-06T10:30:00+02:00",
    status: "CONFIRMED",
    title: "Cita",
    reason: "Revisión",
    version: 3,
    ...overrides,
  };
}

afterEach(cleanup);

describe("upcomingAppointments", () => {
  it("keeps only future active appointments, soonest first", () => {
    const list = upcomingAppointments(
      [
        appointment({ id: "later", startsAt: "2026-10-09T10:00:00+02:00" }),
        appointment({ id: "past", startsAt: "2026-10-01T10:00:00+02:00" }),
        appointment({ id: "cancelled", status: "CANCELLED" }),
        appointment({ id: "no-show", status: "NO_SHOW" }),
        appointment({ id: "done", status: "COMPLETED" }),
        appointment({ id: "soon", startsAt: "2026-10-06T09:00:00+02:00" }),
      ],
      NOW,
    );
    expect(list.map((item) => item.id)).toEqual(["soon", "later"]);
  });

  it("returns an empty list without appointments", () => {
    expect(upcomingAppointments([], NOW)).toEqual([]);
  });
});

describe("PatientUpcomingAppointments", () => {
  function renderList(onCancel = vi.fn().mockResolvedValue(undefined), error?: string) {
    render(
      <MantineProvider>
        <PatientUpcomingAppointments
          appointments={[
            appointment({ id: "a1" }),
            appointment({
              id: "a2",
              startsAt: "2026-10-08T17:15:00+02:00",
              reason: null,
              title: "Higiene",
            }),
          ]}
          onCancel={onCancel}
          {...(error ? { error } : {})}
        />
      </MantineProvider>,
    );
    return onCancel;
  }

  it("lists each appointment with date, time and reason", () => {
    renderList();
    const list = screen.getByRole("list", { name: "Próximas citas" });
    expect(list).toHaveTextContent("06/10/2026 · 10:30");
    expect(list).toHaveTextContent("Revisión");
    expect(list).toHaveTextContent("08/10/2026 · 17:15");
    expect(list).toHaveTextContent("Higiene");
  });

  it("asks for confirmation and a reason before cancelling", () => {
    const onCancel = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar cita del 08/10/2026 · 17:15" }));
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Motivo de cancelación"), {
      target: { value: "Paciente enfermo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    expect(onCancel).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a2", version: 3 }),
      "Paciente enfermo",
    );
  });

  it("lets the user back out without cancelling", () => {
    const onCancel = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar cita del 06/10/2026 · 10:30" }));
    fireEvent.click(screen.getByRole("button", { name: "Mantener cita" }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Motivo de cancelación")).toBeNull();
  });

  it("does not cancel with an empty reason", () => {
    const onCancel = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar cita del 06/10/2026 · 10:30" }));
    fireEvent.change(screen.getByLabelText("Motivo de cancelación"), { target: { value: "  " } });
    expect(screen.getByRole("button", { name: "Confirmar cancelación" })).toBeDisabled();
  });

  it("shows the cancellation error", () => {
    renderList(undefined, "La cita cambió en otro dispositivo.");
    expect(screen.getByRole("alert")).toHaveTextContent("La cita cambió en otro dispositivo.");
  });

  it("renders nothing when there are no upcoming appointments", () => {
    const { container } = render(
      <MantineProvider>
        <PatientUpcomingAppointments appointments={[]} onCancel={vi.fn()} />
      </MantineProvider>,
    );
    expect(container.querySelector("ul")).toBeNull();
  });
});
