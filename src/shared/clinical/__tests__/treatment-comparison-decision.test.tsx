// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { BudgetView } from "../budget-options";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  print: vi.fn(),
  comparisons: { isLoading: false, isError: false, data: { items: [] as unknown[] } },
}));

vi.mock("../clinical-arguments-data", () => ({
  useSaveComparisonMutation: () => ({ mutate: mocks.mutate, isPending: false, error: null }),
  usePatientComparisonsQuery: () => mocks.comparisons,
}));
vi.mock("../use-comparison-printer", () => ({
  useComparisonPrinter: () => ({
    print: mocks.print,
    notice: { error: null, clear: vi.fn() },
  }),
}));
vi.mock("@/shared/documents/document-context", () => ({
  useDocumentContext: () => {
    const doctors = [
      { id: "d1", displayName: "Dra. Ruiz", collegiateNumber: "2812" },
      { id: "d2", displayName: "Dr. Gil", collegiateNumber: null },
    ];
    return {
      clinicName: "Clínica",
      doctors,
      defaultDoctorId: "d1",
      doctorById: (id: string | null) => doctors.find((doctor) => doctor.id === id) ?? null,
    };
  },
}));

import { TreatmentComparisonDecision } from "../treatment-comparison-decision";
import { TreatmentComparisonHistory } from "../treatment-comparison-history";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.comparisons.data.items = [];
});

const budgets: BudgetView[] = [
  {
    id: "endo",
    code: "P-1",
    status: "DRAFT",
    title: "Salvar el diente",
    totalCents: 90_000,
    branch: {
      id: "b1",
      sharedPlanItemIds: ["hyg"],
      advantages: "• Conserva tu diente natural.",
      disadvantages: "• Puede reinfectarse.",
      sourcePlanVersion: 1,
    },
    items: [
      { id: "1", clinicalPlanItemId: "hyg", description: "Limpieza dental", totalCents: 6_000 },
      { id: "2", description: "Endodoncia", tooth: "36", totalCents: 84_000 },
    ],
  },
  {
    id: "implant",
    code: "P-2",
    status: "DRAFT",
    title: null,
    totalCents: 160_000,
    items: [
      { id: "3", clinicalPlanItemId: "hyg", description: "Limpieza dental", totalCents: 6_000 },
      { id: "4", description: "Extracción", tooth: "36", totalCents: 9_000 },
      { id: "5", description: "Implante", tooth: "36", totalCents: 145_000 },
    ],
  },
];

function mount() {
  render(
    <MantineProvider env="test">
      <TreatmentComparisonDecision
        patientId="p1"
        budgets={budgets}
        sharedKeys={new Set(["plan:hyg"])}
      />
    </MantineProvider>,
  );
}

describe("TreatmentComparisonDecision", () => {
  test("guarda una decisión pendiente con la copia de lo explicado y el profesional", () => {
    mount();
    const consequences = screen.getByRole("group", {
      name: /Consecuencias de posponer que se han explicado/,
    });
    const infection = within(consequences).getByRole("checkbox", {
      name: /Posponer el tratamiento de una infección activa/,
    });
    expect(infection).not.toBeChecked();
    fireEvent.click(infection);
    fireEvent.change(screen.getByLabelText("Nota"), {
      target: { value: "  Lo hablará en casa. " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar comparación" }));

    const [input] = mocks.mutate.mock.calls[0]!;
    expect(input).toMatchObject({
      seriesId: null,
      decision: "PENDING",
      chosenOptionId: null,
      decisionNote: "Lo hablará en casa.",
      catalogVersion: "1.0",
      professionalName: "Dra. Ruiz · Col. 2812",
    });
    expect(input.content.common).toEqual([
      { description: "Limpieza dental", tooth: null, totalCents: 6_000 },
    ]);
    expect(input.content.options[0]).toMatchObject({
      title: "Salvar el diente",
      advantages: ["Conserva tu diente natural."],
    });
    expect(input.content.consequences.map((item: { id: string }) => item.id)).toEqual(["C10"]);
  });

  test("aceptar exige elegir la opción y la guarda", async () => {
    mount();
    fireEvent.click(screen.getByRole("radio", { name: "Acepta una opción" }));
    const saveButton = screen.getByRole("button", { name: "Guardar comparación" });
    expect(saveButton).toBeDisabled();
    fireEvent.click(screen.getByRole("combobox", { name: "Opción que acepta" }));
    fireEvent.click(await screen.findByRole("option", { name: "Opción 2 · P-2" }));
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);
    expect(mocks.mutate.mock.calls[0]![0]).toMatchObject({
      decision: "ACCEPTED",
      chosenOptionId: "implant",
    });
  });

  test("tras guardar ofrece imprimir y el siguiente guardado es otra versión de la misma serie", async () => {
    const record = { id: "c1", seriesId: "s1", version: 1 };
    mocks.mutate.mockImplementation((_input, options) => options.onSuccess(record));
    mount();
    fireEvent.click(screen.getByRole("radio", { name: "Aplaza el tratamiento" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar comparación" }));
    expect(await screen.findByText("Guardada la versión 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Imprimir para el paciente" }));
    expect(mocks.print).toHaveBeenCalledWith(record);
    fireEvent.click(screen.getByRole("button", { name: "Guardar comparación" }));
    expect(mocks.mutate.mock.calls[1]![0]).toMatchObject({ seriesId: "s1", decision: "POSTPONED" });
  });
});

describe("TreatmentComparisonHistory", () => {
  test("lista las comparaciones guardadas y reimprime cada versión", () => {
    const record = {
      id: "c1",
      patientId: "p1",
      seriesId: "s1",
      version: 2,
      decision: "ACCEPTED",
      chosenOptionId: "endo",
      decisionNote: "",
      catalogVersion: "1.0",
      professionalName: "Dra. Ruiz",
      createdBy: "u1",
      createdAt: "2026-10-21T10:00:00Z",
      content: {
        options: [
          { id: "endo", label: "Opción 1", title: "Salvar el diente" },
          { id: "implant", label: "Opción 2", title: "P-2" },
        ],
        common: [],
        consequences: [],
      },
    };
    mocks.comparisons.data.items = [record];
    render(
      <MantineProvider env="test">
        <TreatmentComparisonHistory patientId="p1" />
      </MantineProvider>,
    );
    const history = screen.getByRole("region", { name: "Comparaciones guardadas" });
    expect(within(history).getByText("Acepta la Opción 1 · Salvar el diente")).toBeInTheDocument();
    expect(within(history).getByText(/Salvar el diente \/ P-2/)).toBeInTheDocument();
    fireEvent.click(
      within(history).getByRole("button", { name: "Imprimir versión 2 del 21/10/2026" }),
    );
    expect(mocks.print).toHaveBeenCalledWith(record);
  });

  test("sin comparaciones lo dice", () => {
    render(
      <MantineProvider env="test">
        <TreatmentComparisonHistory patientId="p1" />
      </MantineProvider>,
    );
    expect(screen.getByText("Todavía no se ha guardado ninguna comparación.")).toBeInTheDocument();
  });
});
