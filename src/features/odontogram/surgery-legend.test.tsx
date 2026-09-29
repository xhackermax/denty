// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SurgeryLegend } from "./surgery-legend";

const implant = {
  id: "implant-16",
  tooth: "16",
  entityType: "IMPLANT" as const,
  status: "implant_planned",
  active: true,
  attributes: { lifecycle: "PLANIFICADO", design: "UNIT_TIBASE" },
};

afterEach(cleanup);

describe("SurgeryLegend", () => {
  it("is collapsed by default and exposes contextual advanced detail", () => {
    render(<SurgeryLegend selectedTooth="16" entities={[implant]} requiredFields={[]} />);
    const details = screen.getByTestId("surgery-legend");
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByText("Implante planificado")).toBeInTheDocument();
    expect(screen.queryByText(/Sistema:/)).not.toBeInTheDocument();
  });

  it("opens and moves focus when validation requires context", () => {
    render(
      <SurgeryLegend
        selectedTooth="16"
        entities={[implant]}
        requiredFields={["system", "diameterMm"]}
      />,
    );
    expect(screen.getByTestId("surgery-legend")).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: /Detalles quirúrgicos de 16/ })).toHaveFocus();
    expect(screen.getByText(/Faltan: sistema, diámetro/)).toBeInTheDocument();
  });
});
