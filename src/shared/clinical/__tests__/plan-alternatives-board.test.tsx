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

  it("groups each plan's treatments into collapsible phases inside a mirrored row", () => {
    renderBoard();
    const planA = screen.getByRole("group", { name: "Tratamientos del Plan A" });
    expect(within(planA).getByRole("button", { name: /Fase periodontal/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(within(planA).getByRole("button", { name: /Fase quirúrgica/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Tratamientos del Plan B" })).toBeInTheDocument();
  });

  it("marks the treatments every plan shares as common", () => {
    renderBoard();
    const planB = screen.getByRole("group", { name: "Tratamientos del Plan B" });
    for (const phase of within(planB).getAllByRole("button")) fireEvent.click(phase);
    const rows = within(planB).getAllByRole("listitem", { hidden: true });
    expect(rows.find((row) => row.textContent?.startsWith("Raspado"))).toHaveTextContent("Común");
    expect(rows.find((row) => row.textContent?.startsWith("Puente"))).not.toHaveTextContent(
      "Común",
    );
  });

  it("opens advantages and disadvantages for every plan at once, aligned in one row", () => {
    renderBoard();
    expect(screen.queryByRole("group", { name: "Ventajas del Plan B" })).toBeNull();
    const toggle = screen.getByRole("button", { name: /^Ventajas/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("group", { name: "Ventajas del Plan A" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Ventajas del Plan B" })).toHaveTextContent(
      "Sin cirugía de implante",
    );
    fireEvent.click(screen.getByRole("button", { name: /^Desventajas/ }));
    expect(screen.getByRole("group", { name: "Desventajas del Plan B" })).toHaveTextContent(
      "Talla dientes vecinos",
    );
  });

  it("suggests pros and cons when the plan has none written, and never shows 'Sin indicar'", () => {
    renderBoard();
    fireEvent.click(screen.getByRole("button", { name: /^Ventajas/ }));
    expect(screen.queryByText("Sin indicar")).toBeNull();
    const planA = screen.getByRole("group", { name: "Ventajas del Plan A" });
    expect(planA).toHaveTextContent("Sugerido");
    expect(planA).toHaveTextContent("No requiere tallar los dientes vecinos.");
    const written = screen.getByRole("group", { name: "Ventajas del Plan B" });
    expect(written).toHaveTextContent("Sin cirugía de implante");
    expect(written).not.toHaveTextContent("Sugerido");
  });

  it("adds up the appointments of each stage into an approximate time per plan", () => {
    renderBoard();
    // Plan A: raspado 2–4 + exodoncia 1–2 + implante 3–5. Plan B: raspado + exodoncia + puente 2–3.
    const toggle = screen.getByRole("button", { name: /^Tiempo aproximado/ });
    expect(toggle).toHaveTextContent("≈ 6–11 citas");
    expect(toggle).toHaveTextContent("≈ 5–9 citas");
    fireEvent.click(toggle);
    const planA = screen.getByRole("group", { name: "Tiempo aproximado del Plan A" });
    expect(planA).toHaveTextContent("Fase periodontal2–4 citas");
    expect(planA).toHaveTextContent("Fase quirúrgica4–7 citas");
    expect(planA).toHaveTextContent("Total aproximado6–11 citas");
    expect(screen.getByRole("group", { name: "Tiempo aproximado del Plan B" })).toHaveTextContent(
      "Fase prostodóncica2–3 citas",
    );
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
    expect(screen.queryByRole("button", { name: /^Ventajas/ })).toBeNull();
  });
});
