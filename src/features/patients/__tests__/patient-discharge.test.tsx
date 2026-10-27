// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const suggestion = vi.hoisted(() => ({
  data: { months: 12, basedOn: "Obturación" } as
    { months: 6 | 12; basedOn: string | null } | undefined,
  isLoading: false,
  isError: false,
}));
const discharge = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  isError: false,
  error: null as unknown,
}));

vi.mock("@/shared/patients/patient-data", () => ({
  useDischargeSuggestionQuery: () => suggestion,
  useDischargePatientMutation: () => discharge,
}));

import {
  PatientDischargeBanner,
  PatientDischargeModal,
  reviewAppointmentHref,
} from "../patient-discharge";

function renderUi(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  suggestion.data = { months: 12, basedOn: "Obturación" };
  discharge.isError = false;
  discharge.error = null;
});

describe("dar de alta", () => {
  it("propone el intervalo del tratamiento y avisa de dar cita al confirmar", async () => {
    discharge.mutateAsync.mockResolvedValue({ patient: {}, reviewDueDate: "2027-10-27" });
    renderUi(
      <PatientDischargeModal patientId="p1" expectedVersion={3} opened onClose={() => undefined} />,
    );
    expect(screen.getByText("Propuesto por su tratamiento: Obturación.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Anual (12 meses)" })).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Dar de alta" }));

    await waitFor(() =>
      expect(screen.getByText("Dale cita de revisión en la agenda")).toBeInTheDocument(),
    );
    expect(discharge.mutateAsync).toHaveBeenCalledWith({
      patientId: "p1",
      expectedVersion: 3,
      reviewMonths: 12,
      notes: "",
    });
    expect(screen.getByText(/27\/10\/2027/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dar cita de revisión/i })).toHaveAttribute(
      "href",
      "/app/agenda?patientId=p1&date=2027-10-27&action=review",
    );
  });

  it("permite cambiar a 6 meses antes de confirmar", async () => {
    discharge.mutateAsync.mockResolvedValue({ patient: {}, reviewDueDate: "2027-04-27" });
    renderUi(
      <PatientDischargeModal patientId="p1" expectedVersion={1} opened onClose={() => undefined} />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Cada 6 meses" }));
    fireEvent.click(screen.getByRole("button", { name: "Dar de alta" }));
    await waitFor(() =>
      expect(discharge.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ reviewMonths: 6 }),
      ),
    );
  });

  it("sin intervalo en los tratamientos usa la revisión habitual", () => {
    suggestion.data = { months: 6, basedOn: null };
    renderUi(
      <PatientDischargeModal patientId="p1" expectedVersion={1} opened onClose={() => undefined} />,
    );
    expect(screen.getByText(/Propuesta habitual/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Cada 6 meses" })).toBeChecked();
  });

  it("muestra el error si la ficha cambió", () => {
    discharge.isError = true;
    discharge.error = new Error("La ficha cambió antes de darse de alta.");
    renderUi(
      <PatientDischargeModal patientId="p1" expectedVersion={1} opened onClose={() => undefined} />,
    );
    expect(screen.getByText("La ficha cambió antes de darse de alta.")).toBeInTheDocument();
  });
});

describe("aviso en la ficha de un paciente de alta", () => {
  const now = new Date("2026-11-02T10:00:00Z").getTime();

  it("pide dar cita cuando no tiene ninguna programada", () => {
    renderUi(
      <PatientDischargeBanner
        patientId="p1"
        dischargedAt="2026-10-27T10:00:00Z"
        reviewMonths={6}
        hasUpcomingAppointment={false}
        now={now}
      />,
    );
    expect(screen.getByText("Falta dar cita de revisión")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dar cita de revisión/i })).toHaveAttribute(
      "href",
      reviewAppointmentHref("p1", "2027-04-27"),
    );
  });

  it("solo informa cuando ya tiene cita", () => {
    renderUi(
      <PatientDischargeBanner
        patientId="p1"
        dischargedAt="2026-10-27T10:00:00Z"
        reviewMonths={12}
        hasUpcomingAppointment
        now={now}
      />,
    );
    expect(screen.getByText("Paciente de alta")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
