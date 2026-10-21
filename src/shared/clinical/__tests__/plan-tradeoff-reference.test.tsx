// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { comparePlanAlternatives, planTradeoffContext } from "@/domain/plan";
import { PlanTradeoffReference } from "../plan-tradeoff-reference";

afterEach(cleanup);

const comparison = comparePlanAlternatives(
  [
    { id: "p1", treatmentCode: "EXTRACTION", label: "Exodoncia", tooth: "36" },
    { id: "p2", treatmentCode: "IMPLANT", label: "Implante", tooth: "36" },
  ],
  [
    {
      id: "b1",
      title: "Puente",
      items: [
        { id: "i1", clinicalPlanItemId: "p1", description: "Exodoncia", tooth: "36" },
        { id: "i2", description: "Puente 35-37", tooth: "35" },
      ],
    },
  ],
);

function renderReference(context = planTradeoffContext(comparison)) {
  return render(
    <MantineProvider>
      <PlanTradeoffReference context={context} />
    </MantineProvider>,
  );
}

describe("PlanTradeoffReference", () => {
  it("shows the worked comparison of part I and the guidelines to validate against", () => {
    renderReference(
      planTradeoffContext(
        comparePlanAlternatives(
          [{ id: "p1", treatmentCode: "ENDODONTICS", label: "Endodoncia", tooth: "36" }],
          [
            {
              id: "b1",
              title: "Implante",
              items: [
                { id: "i1", description: "Extracción", tooth: "36" },
                { id: "i2", description: "Implante", tooth: "36" },
              ],
            },
          ],
        ),
      ),
    );
    const table = screen.getByRole("table", {
      name: "Comparación detallada · Salvar el diente o colocar implante",
    });
    expect(
      within(table).getByRole("columnheader", { name: "Endodoncia + restauración" }),
    ).toBeInTheDocument();
    expect(within(table).getByRole("rowheader", { name: "Cirugía" })).toBeInTheDocument();
    expect(
      screen.getByText(/no reproduce por completo el complejo diente-ligamento/),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Fuentes clínicas" })).getByRole("link", {
        name: "European Society of Endodontology",
      }),
    ).toHaveAttribute("href", "https://doi.org/10.1111/iej.13974");
  });

  it("is folded by default to keep the comparison short", () => {
    const { container } = renderReference();
    expect(container.querySelector("details")).not.toHaveAttribute("open");
    expect(screen.getByText("Si se pospone o no se trata")).toBeInTheDocument();
  });

  it("explains not replacing the tooth and the consequences of postponing", () => {
    renderReference();
    const section = screen.getByRole("region", { name: "No tratar o posponer" });
    expect(section).toHaveTextContent("No reponer un diente ausente");
    expect(
      within(section).getByRole("list", { name: "Consecuencias de posponer" }),
    ).toHaveTextContent("Extraer un diente y dejar el espacio");
  });

  it("names the reference scenario with its clinical check and the dentist's cautions", () => {
    renderReference();
    expect(screen.getByRole("region", { name: "Comparación de referencia" })).toHaveTextContent(
      "Diente ausente: implante o puente. Comprobar: Valorar dientes pilares",
    );
    expect(screen.getByRole("region", { name: "Avisos clínicos" })).toHaveTextContent(
      "Datos diagnósticos insuficientes",
    );
    expect(screen.getByText(/pendiente de revisión profesional/)).toBeInTheDocument();
  });

  it("renders nothing for an empty plan", () => {
    const { container } = renderReference(planTradeoffContext(comparePlanAlternatives([], [])));
    expect(container.querySelector("details")).toBeNull();
  });
});
