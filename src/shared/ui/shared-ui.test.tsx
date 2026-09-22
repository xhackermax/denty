// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { formatEUR } from "@/domain/money";
import { dentyTheme } from "@/styles/theme";

import { DensityProvider, useDensity } from "./density-provider";
import { EmptyState } from "./empty-state";
import { MoneyText } from "./money";
import { PatientAvatar } from "./patient-avatar";
import { PermissionGate } from "./permission-gate";
import { StatusBadge } from "./status-badge";

function renderWithTheme(node: ReactNode) {
  return render(<MantineProvider theme={dentyTheme}>{node}</MantineProvider>);
}

function DensityProbe() {
  const { density } = useDensity();
  return <span>{density}</span>;
}

afterEach(() => {
  window.localStorage.clear();
});

describe("shared UI", () => {
  it("renders semantic empty state content", () => {
    renderWithTheme(<EmptyState title="Sin resultados" description="Prueba otra búsqueda" />);
    expect(screen.getByRole("region", { name: "Sin resultados" })).toBeInTheDocument();
    expect(screen.getByText("Prueba otra búsqueda")).toBeInTheDocument();
  });

  it("formats money from integer cents", () => {
    const { container } = render(<MoneyText cents={123456} />);
    expect(container.textContent).toBe(formatEUR(123456));
  });

  it("shows content only when all required permissions exist", () => {
    const { rerender } = render(
      <PermissionGate permissions={["patients.read"]} require="patients.read">
        <span>Permitido</span>
      </PermissionGate>,
    );

    expect(screen.getByText("Permitido")).toBeInTheDocument();

    rerender(
      <PermissionGate permissions={[]} require="patients.read">
        <span>Permitido</span>
      </PermissionGate>,
    );

    expect(screen.queryByText("Permitido")).not.toBeInTheDocument();
  });

  it("pairs status tone with visible text and an icon", () => {
    renderWithTheme(<StatusBadge label="En gabinete" tone="active" />);
    expect(screen.getByText("En gabinete")).toBeInTheDocument();
  });

  it("derives patient initials", () => {
    renderWithTheme(<PatientAvatar name="Juan Pérez" />);
    expect(screen.getByText("JP")).toBeInTheDocument();
  });

  it("restores the UI density preference without overwriting it during hydration", async () => {
    window.localStorage.setItem("denty.ui.density", "compact");

    render(
      <DensityProvider>
        <DensityProbe />
      </DensityProvider>,
    );

    expect(await screen.findByText("compact")).toBeInTheDocument();
    expect(window.localStorage.getItem("denty.ui.density")).toBe("compact");
  });
});
