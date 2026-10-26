// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./clinical-data", () => ({
  usePatientBudgetsQuery: () => ({
    isLoading: false,
    isError: false,
    data: {
      items: [
        {
          id: "implants",
          code: "R-2",
          status: "DRAFT",
          scope: "custom",
          title: "Periodoncia + implantes",
          totalCents: 210000,
          branch: {
            id: "branch-a",
            sharedPlanItemIds: ["perio"],
            advantages: "Rehabilitación fija",
            disadvantages: "Requiere cirugía",
            sourcePlanVersion: 4,
          },
          items: [
            {
              id: "p-1",
              clinicalPlanItemId: "perio",
              description: "Tratamiento periodontal",
              totalCents: 30000,
            },
            {
              id: "imp",
              clinicalPlanItemId: null,
              description: "Implante y corona",
              totalCents: 180000,
            },
          ],
        },
        {
          id: "removable",
          code: "R-3",
          status: "DRAFT",
          scope: "custom",
          title: "Periodoncia + removible",
          totalCents: 75000,
          branch: {
            id: "branch-b",
            sharedPlanItemIds: ["perio"],
            advantages: "Evita cirugía implantológica",
            disadvantages: "Mantenimiento removible",
            sourcePlanVersion: 4,
          },
          items: [
            {
              id: "p-2",
              clinicalPlanItemId: "perio",
              description: "Tratamiento periodontal",
              totalCents: 30000,
            },
            {
              id: "rem",
              clinicalPlanItemId: null,
              description: "Prótesis removible",
              totalCents: 45000,
            },
          ],
        },
        {
          id: "phase",
          code: "R-4",
          status: "DRAFT",
          scope: "primary",
          title: "Fase de saneamiento",
          totalCents: 30000,
          items: [
            {
              id: "p-3",
              clinicalPlanItemId: "perio",
              description: "Tratamiento periodontal",
              totalCents: 30000,
            },
          ],
        },
      ],
    },
  }),
}));
vi.mock("./treatment-comparison-decision", () => ({
  TreatmentComparisonDecision: ({ budgets }: { budgets: Array<{ id: string }> }) => (
    <section aria-label="Decisión del paciente">
      {budgets.map((budget) => budget.id).join(",")}
    </section>
  ),
}));
vi.mock("./treatment-comparison-history", () => ({
  TreatmentComparisonHistory: () => <section aria-label="Comparaciones guardadas" />,
}));
import { PatientBudgetComparisonPage } from "./patient-budget-comparison-page";
afterEach(cleanup);

describe("full-page multi-budget comparison", () => {
  it("displays common periodontal treatment once, then branch-only implant/removable steps in separate columns", () => {
    render(
      <MantineProvider>
        <PatientBudgetComparisonPage
          patientId="patient-1"
          initialSelectedIds={["implants", "removable"]}
        />
      </MantineProvider>,
    );
    const region = screen.getByRole("region", { name: "Comparación de presupuestos por columnas" });
    const columns = within(region).getAllByRole("article");
    expect(columns).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Tratamientos compartidos" })).toHaveTextContent(
      "Tratamiento periodontal",
    );
    expect(columns[0]).toHaveTextContent("Implante y corona");
    expect(columns[0]).toHaveTextContent("Rehabilitación fija");
    expect(columns[0]).toHaveTextContent("Requiere cirugía");
    expect(
      within(columns[0]!).getByRole("button", { name: /Tiempo aproximado/ }),
    ).toHaveTextContent("5–9 citas");
    expect(
      within(columns[1]!).getByRole("button", { name: /Tiempo aproximado/ }),
    ).toHaveTextContent("6–9 citas");
    const timePanel = within(columns[0]!).getByRole("button", { name: /Tiempo aproximado/ });
    fireEvent.click(timePanel);
    expect(timePanel).toHaveAttribute("aria-expanded", "true");
    expect(columns[1]).toHaveTextContent("Prótesis removible");
    expect(columns[1]).toHaveTextContent("Evita cirugía implantológica");
    expect(columns[1]).toHaveTextContent("Mantenimiento removible");
    fireEvent.click(
      within(columns[0]!).getByRole("button", { name: "Aspectos clínicos a tener en cuenta" }),
    );
    fireEvent.click(
      within(columns[1]!).getByRole("button", { name: "Aspectos clínicos a tener en cuenta" }),
    );
    expect(columns[0]).toHaveTextContent("Incluye cirugía");
    expect(columns[1]).not.toHaveTextContent("Incluye cirugía");
    expect(screen.queryByRole("checkbox", { name: /Fase de saneamiento/ })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Decisión del paciente" })).toHaveTextContent(
      "implants,removable",
    );
    expect(screen.getByRole("region", { name: "Comparaciones guardadas" })).toBeInTheDocument();
  });
  it("requires two distinct checked proposals to render columns", () => {
    render(
      <MantineProvider>
        <PatientBudgetComparisonPage patientId="patient-1" initialSelectedIds={["implants"]} />
      </MantineProvider>,
    );
    expect(screen.getByText(/Selecciona al menos dos presupuestos/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Decisión del paciente" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Comparaciones guardadas" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Periodoncia \+ removible/ }));
    expect(
      within(
        screen.getByRole("region", { name: "Comparación de presupuestos por columnas" }),
      ).getAllByRole("article"),
    ).toHaveLength(2);
  });
});
