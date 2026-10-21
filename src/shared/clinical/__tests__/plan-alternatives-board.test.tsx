// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { comparePlanAlternatives } from "@/domain/plan";
import { PlanAlternativesBoard } from "../plan-alternatives-board";

afterEach(cleanup);

const comparison = comparePlanAlternatives(
  [
    { id: "p1", treatmentCode: "PERIODONTICS", label: "Raspado", tooth: null },
    { id: "p2", treatmentCode: "EXTRACTION", label: "Exodoncia", tooth: "36" },
    { id: "p3", treatmentCode: "IMPLANT", label: "Implante", tooth: "36" },
  ],
  [
    {
      id: "b1",
      title: "Puente",
      advantages: "Sin cirugía de implante",
      disadvantages: "Talla dientes vecinos",
      items: [
        { id: "i1", clinicalPlanItemId: "p1", description: "Raspado" },
        { id: "i2", clinicalPlanItemId: "p2", description: "Exodoncia", tooth: "36" },
        { id: "i3", description: "Puente 35-37", tooth: "35" },
      ],
    },
  ],
);

function renderBoard(onSelect = vi.fn()) {
  render(
    <MantineProvider>
      <PlanAlternativesBoard comparison={comparison} selectedLetter="A" onSelect={onSelect} />
    </MantineProvider>,
  );
  return onSelect;
}

describe("PlanAlternativesBoard", () => {
  it("shows every plan side by side with its own dentigram", () => {
    renderBoard();
    const planA = screen.getByRole("article", { name: "Plan A" });
    const planB = screen.getByRole("article", { name: "Plan B" });
    expect(
      within(planA).getByRole("img", { name: "Dentigrama Plan A: 1 piezas con tratamiento" }),
    ).toBeInTheDocument();
    expect(
      within(planB).getByRole("img", { name: "Dentigrama Plan B: 2 piezas con tratamiento" }),
    ).toBeInTheDocument();
  });

  it("tints the treated teeth by clinical phase", () => {
    renderBoard();
    const planB = screen.getByRole("img", { name: /Dentigrama Plan B/ });
    expect(planB.querySelector('[data-tooth="36"]')).toHaveAttribute("data-phase", "surgical");
    expect(planB.querySelector('[data-tooth="35"]')).toHaveAttribute("data-phase", "prosthetic");
    expect(planB.querySelector('[data-tooth="11"]')).toHaveAttribute("data-phase", "none");
  });

  it("groups each plan's treatments into collapsible phases", () => {
    renderBoard();
    const planA = screen.getByRole("article", { name: "Plan A" });
    expect(within(planA).getByRole("button", { name: /Fase periodontal/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(within(planA).getByRole("button", { name: /Fase quirúrgica/ })).toBeInTheDocument();
  });

  it("lists common treatments and what each alternative changes with pros and cons", () => {
    renderBoard();
    const common = screen.getByRole("list", { name: "Tratamientos comunes" });
    expect(common).toHaveTextContent("Raspado");
    expect(common).toHaveTextContent("Exodoncia · 36");
    expect(common).not.toHaveTextContent("Implante");
    expect(
      screen.getByRole("list", { name: "Tratamientos exclusivos del Plan A" }),
    ).toHaveTextContent("Implante · 36");
    expect(
      screen.getByRole("list", { name: "Tratamientos exclusivos del Plan B" }),
    ).toHaveTextContent("Puente 35-37 · 35");
    expect(screen.getByText("Sin cirugía de implante")).toBeInTheDocument();
    expect(screen.getByText("Talla dientes vecinos")).toBeInTheDocument();
  });

  it("suggests pros and cons when the plan has none written, and never shows 'Sin indicar'", () => {
    renderBoard();
    expect(screen.queryByText("Sin indicar")).toBeNull();
    const planA = screen.getByRole("group", { name: "Ventajas del Plan A" });
    expect(planA).toHaveTextContent("Sugerido");
    expect(planA).toHaveTextContent("No requiere tallar los dientes vecinos.");
    const written = screen.getByRole("group", { name: "Ventajas del Plan B" });
    expect(written).toHaveTextContent("Sin cirugía de implante");
    expect(written).not.toHaveTextContent("Sugerido");
  });

  it("lets the dentist choose a plan from its column", () => {
    const onSelect = renderBoard();
    expect(
      within(screen.getByRole("article", { name: "Plan A" })).getByText("Elegido"),
    ).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("article", { name: "Plan B" })).getByRole("button", {
        name: "Elegir Plan B",
      }),
    );
    expect(onSelect).toHaveBeenCalledWith("b1");
  });

  it("invites to branch when there are no alternatives yet", () => {
    render(
      <MantineProvider>
        <PlanAlternativesBoard comparison={comparePlanAlternatives([], [])} />
      </MantineProvider>,
    );
    expect(screen.getByText(/Todavía no hay alternativas/)).toBeInTheDocument();
    expect(screen.getByText("Sin tratamientos.")).toBeInTheDocument();
  });
});
