// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { dentyTheme } from "@/styles/theme";
import { ClinicalTabs } from "./clinical-tabs";
import { EndodonticPanel } from "./endodontic-panel";
import { OrthodonticPanel } from "./orthodontic-panel";
import { PediatricPanel } from "./pediatric-panel";
import { PeriodontogramPanel } from "./periodontogram-panel";

function renderWithTheme(node: React.ReactNode) {
  return render(<MantineProvider theme={dentyTheme}>{node}</MantineProvider>);
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
  it("muestra las vistas clinicas principales", () => {
    renderWithTheme(<ClinicalTabs active="general" onChange={() => undefined} />);
    expect(screen.getByRole("button", { name: "General" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Periodonto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ortodoncia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pediatrico" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Endodoncia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Historial" })).toBeInTheDocument();
  });

  it("muestra resumen periodontal completo", () => {
    renderWithTheme(<PeriodontogramPanel readOnly={false} />);
    expect(screen.getByText("Periodontograma completo")).toBeInTheDocument();
    expect(screen.getByText("BOP")).toBeInTheDocument();
    expect(screen.getByText("Max PD")).toBeInTheDocument();
    expect(screen.getAllByText(/Furca/).length).toBeGreaterThan(0);
  });

  it("muestra controles de odontograma ortodontico", () => {
    renderWithTheme(
      <OrthodonticPanel patientId="patient-1" readOnly={false} onCommit={() => undefined} />,
    );
    expect(screen.getByText("Odontograma ortodontico")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Clase molar derecha").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Overjet").length).toBeGreaterThan(0);
    expect(screen.getByText("Alineadores")).toBeInTheDocument();
  });

  it("muestra denticion pediatrica sugerida por edad", () => {
    renderWithTheme(
      <PediatricPanel birthDate="2020-09-22" readOnly={false} onCommit={() => undefined} />,
    );
    expect(screen.getByText("Odontograma pediatrico")).toBeInTheDocument();
    expect(screen.getAllByText("Denticion mixta").length).toBeGreaterThan(0);
    expect(screen.getByText("Raices fantasma")).toBeInTheDocument();
  });

  it("muestra diagnostico visual de absceso apical cronico", () => {
    renderWithTheme(
      <EndodonticPanel selectedTooth="11" readOnly={false} onCommit={() => undefined} />,
    );
    expect(screen.getByText("Endodoncia visual")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Diagnostico apical").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Absceso apical cronico").length).toBeGreaterThan(0);
  });
});
