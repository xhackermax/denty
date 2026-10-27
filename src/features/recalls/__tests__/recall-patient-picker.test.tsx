// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ candidates: vi.fn(), fail: false }));
vi.mock("@/shared/patients/patient-data", () => ({
  usePatientsQuery: () => ({ data: { items: [] }, isError: false }),
}));
vi.mock("../recalls-data", () => ({
  // A rejected vi.fn() result is reported by Vitest even when the component catches it.
  fetchRecallCandidates: (filters: unknown) =>
    mocks.fail ? Promise.reject(new Error("network")) : mocks.candidates(filters),
  useRecallStaffAndSitesQuery: () => ({ data: { sites: [], staff: [] } }),
}));

import {
  RecallPatientPicker,
  type AssignmentMode,
  type PickedPatient,
} from "../recall-patient-picker";

function Harness({ initialMode = "FILTRO" as AssignmentMode, allowAutomatic = true }) {
  const [mode, setMode] = useState<AssignmentMode>(initialMode);
  const [picked, setPicked] = useState<PickedPatient[]>([]);
  return (
    <MantineProvider env="test">
      <RecallPatientPicker
        mode={mode}
        onModeChange={setMode}
        picked={picked}
        onPickedChange={setPicked}
        excludeTemplateId="t-1"
        allowAutomatic={allowAutomatic}
      />
    </MantineProvider>
  );
}

afterEach(cleanup);
beforeEach(() => {
  mocks.candidates.mockReset();
  mocks.fail = false;
});

describe("RecallPatientPicker", () => {
  it("busca por filtro, excluye a los ya inscritos y añade el resultado", async () => {
    mocks.candidates.mockResolvedValue({
      total: 2,
      items: [
        {
          patientId: "p1",
          patientName: "Ana Ruiz",
          recordNumber: "7",
          lastVisitAt: null,
          siteName: null,
        },
        {
          patientId: "p2",
          patientName: "Luis Gil",
          recordNumber: null,
          lastVisitAt: null,
          siteName: null,
        },
      ],
    });
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Edad mínima"), { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver pacientes que cumplen" }));
    expect(await screen.findByText(/2 pacientes activos cumplen los filtros/)).toBeInTheDocument();
    expect(mocks.candidates).toHaveBeenCalledWith({ minAge: 18, excludeTemplateId: "t-1" });
    fireEvent.click(screen.getByRole("button", { name: /Añadir/ }));
    expect(screen.getByText("2 pacientes seleccionados")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Fecha propia para Ana Ruiz"), {
      target: { value: "2026-12-01" },
    });
    expect(screen.getByLabelText("Fecha propia para Ana Ruiz")).toHaveValue("2026-12-01");
    fireEvent.click(screen.getByRole("button", { name: "Quitar a Luis Gil" }));
    expect(screen.getByText("1 paciente seleccionado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quitar todos" }));
    expect(screen.queryByText(/seleccionado/)).not.toBeInTheDocument();
  });

  it("avisa si el cálculo falla", async () => {
    mocks.fail = true;
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Ver pacientes que cumplen" }));
    expect(await screen.findByText("No se pudo calcular la lista.")).toBeInTheDocument();
  });

  it("explica que la inscripción automática aún no crea recalls", () => {
    render(<Harness initialMode="AUTOMATICA" />);
    expect(screen.getByText(/todavía no crea recalls/)).toBeInTheDocument();
  });

  it("puede ocultar el modo automático", () => {
    render(<Harness initialMode="NINGUNO" allowAutomatic={false} />);
    expect(screen.getByText(/Se crea el tipo sin pacientes/)).toBeInTheDocument();
    expect(screen.queryByText("Automática")).not.toBeInTheDocument();
  });
});
