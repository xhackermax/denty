// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const workflowQuery = { data: undefined, isError: false, isPending: true };
const createMutation = { mutateAsync: vi.fn(), isPending: false, isError: false };

vi.mock("@/shared/clinical/clinical-data", () => ({
  useClinicalWorkflowQuery: () => workflowQuery,
  useCreateClinicalEncounterMutation: () => createMutation,
  useCreateClinicalProblemMutation: () => createMutation,
}));

import { PatientClinicalSummary } from "./patient-clinical-summary";

function renderSummary() {
  return render(
    <MantineProvider env="test">
      <PatientClinicalSummary patientId="patient-1" />
    </MantineProvider>,
  );
}

describe("PatientClinicalSummary query states", () => {
  afterEach(() => {
    cleanup();
    Object.assign(workflowQuery, { data: undefined, isError: false, isPending: true });
  });

  it("shows loading labels instead of zero counts before workflow data arrives", () => {
    renderSummary();

    expect(screen.getAllByText("Cargando…")).toHaveLength(2);
    expect(screen.getByText("Cargando problemas…")).toBeInTheDocument();
    expect(screen.getByText("Cargando evoluciones…")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows explicit empty states after a successful empty response", () => {
    Object.assign(workflowQuery, {
      data: { problems: [], encounters: [] },
      isError: false,
      isPending: false,
    });

    renderSummary();

    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.getByText("Sin problemas registrados.")).toBeInTheDocument();
    expect(screen.getByText("Sin evoluciones registradas.")).toBeInTheDocument();
  });

  it("keeps query errors distinct from an empty clinical history", () => {
    Object.assign(workflowQuery, { data: undefined, isError: true, isPending: false });

    renderSummary();

    expect(screen.getByRole("alert")).toHaveTextContent("Error al cargar historia");
    expect(screen.getByText("Problemas no disponibles.")).toBeInTheDocument();
    expect(screen.getByText("Evoluciones no disponibles.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar problema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Firmar nota clínica" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin problemas registrados.")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin evoluciones registradas.")).not.toBeInTheDocument();
  });

  it("shows encounters as a dated clinical timeline with next visit notes", () => {
    Object.assign(workflowQuery, {
      data: {
        problems: [],
        encounters: [
          {
            id: "history-1",
            narrativeNote: "Diente 36: Caries.",
            nextVisit: "Reconstrucción 36 y valorar endodoncia.",
            signedAt: "2026-10-05T09:01:00.000Z",
            createdAt: "2026-10-05T09:01:00.000Z",
          },
        ],
      },
      isError: false,
      isPending: false,
    });

    renderSummary();

    expect(screen.getByText("05/10/2026")).toBeInTheDocument();
    expect(screen.getByText("Diente 36: Caries.")).toBeInTheDocument();
    expect(screen.getByText("Próxima: Reconstrucción 36 y valorar endodoncia.")).toBeInTheDocument();
  });
});
