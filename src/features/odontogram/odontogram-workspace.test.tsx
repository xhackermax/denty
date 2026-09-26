// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { dentyTheme } from "@/styles/theme";
import { ClinicalTabs } from "./clinical-tabs";
import { EndodonticPanel } from "./endodontic-panel";
import { OdontogramLegend } from "./odontogram-legend";
import { OrthodonticPanel } from "./orthodontic-panel";
import { PediatricPanel } from "./pediatric-panel";
import { PeriodontogramPanel } from "./periodontogram-panel";

function renderWithTheme(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={dentyTheme}>{node}</MantineProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
});

describe("clinical odontogram workspace", () => {
  it("usa la leyenda como selector de herramienta y activa el modo de puente", () => {
    const onSelect = vi.fn();
    renderWithTheme(
      <OdontogramLegend selection={{ state: "caries", placement: "tooth" }} onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Prótesis fija \/ puente/i }));
    expect(onSelect).toHaveBeenCalledWith({ state: "prosthesis", placement: "bridge" });
  });

  it("cicla el estado al pulsar de nuevo la misma herramienta de la leyenda", () => {
    const onSelect = vi.fn();
    renderWithTheme(
      <OdontogramLegend selection={{ state: "filling", placement: "tooth" }} onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Obturación/i }));
    expect(onSelect).toHaveBeenCalledWith({ state: "filling_bad", placement: "tooth" });
  });

  it("muestra las vistas clinicas principales", () => {
    renderWithTheme(<ClinicalTabs active="general" onChange={() => undefined} />);
    expect(screen.getByRole("button", { name: "General" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Periodonto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ortodoncia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pediátrico" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Endodoncia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cirugía" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Historial" })).toBeInTheDocument();
  });

  it("muestra resumen periodontal completo", () => {
    renderWithTheme(<PeriodontogramPanel patientId="patient-1" readOnly={false} />);
    expect(screen.getByText("Periodontograma completo")).toBeInTheDocument();
    expect(screen.getByText("BOP")).toBeInTheDocument();
    expect(screen.getByText("Máx. PD")).toBeInTheDocument();
    expect(screen.getAllByText(/furca/i).length).toBeGreaterThan(0);
  });

  it("muestra controles de odontograma ortodontico", () => {
    renderWithTheme(
      <OrthodonticPanel patientId="patient-1" readOnly={false} onCommit={() => undefined} />,
    );
    expect(screen.getByText("Odontograma ortodóntico")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Clase molar derecha").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Overjet").length).toBeGreaterThan(0);
    expect(screen.getByText("Alineadores")).toBeInTheDocument();
  });

  it("muestra denticion pediatrica sugerida por edad", () => {
    renderWithTheme(
      <PediatricPanel
        patientId="patient-1"
        birthDate="2020-09-22"
        readOnly={false}
        onCommit={() => undefined}
      />,
    );
    expect(screen.getByText("Odontograma pediátrico")).toBeInTheDocument();
    expect(screen.getAllByText("Dentición mixta").length).toBeGreaterThan(0);
    expect(screen.getByText(/Raíces fantasma/)).toBeInTheDocument();
  });

  it("muestra diagnostico visual de absceso apical cronico", () => {
    renderWithTheme(
      <EndodonticPanel selectedTooth="11" readOnly={false} onCommit={() => undefined} />,
    );
    expect(screen.getByText("Diagnóstico endodóntico visual")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Diagnóstico apical").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Absceso apical crónico").length).toBeGreaterThan(0);
  });
});
