// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";

import { BudgetOptions, type BudgetPlanItem, type BudgetView } from "../budget-options";

const api = vi.hoisted(() => ({ scopedBudget: vi.fn() }));
vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({ clinical: { sync: { scopedBudget: api.scopedBudget } } }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const items: BudgetPlanItem[] = [
  {
    id: "f",
    treatmentCode: "FILLING",
    label: "Obturación",
    tooth: "46",
    priceCents: 6000,
    status: "PLANNED",
  },
  {
    id: "e",
    treatmentCode: "ENDODONTICS",
    label: "Endodoncia",
    tooth: "25",
    priceCents: 20000,
    status: "PLANNED",
  },
  {
    id: "i",
    treatmentCode: "IMPLANT",
    label: "Implante",
    tooth: "36",
    priceCents: 90000,
    status: "PLANNED",
  },
];
const whole: BudgetView = {
  id: "whole",
  code: "P-R1",
  status: "DRAFT",
  totalCents: 116000,
  version: 1,
  scope: "plan",
  items: [],
};

function budgetFor(input: { scope: string; title?: string; clinicalPlanItemIds: string[] }) {
  const chosen = items.filter((item) => input.clinicalPlanItemIds.includes(item.id));
  return {
    budget: {
      id: `b-${input.scope}-${input.clinicalPlanItemIds.join("")}`,
      code: `P-${input.scope}`,
      status: "DRAFT",
      version: 1,
      scope: input.scope,
      title: input.title ?? null,
      totalCents: chosen.reduce((sum, item) => sum + (item.priceCents ?? 0), 0),
      items: chosen.map((item) => ({
        id: `bi-${item.id}`,
        description: item.label,
        tooth: item.tooth,
        totalCents: item.priceCents ?? 0,
      })),
    },
    sync: {},
  };
}

function Harness({ planItems }: { planItems: BudgetPlanItem[] }) {
  const [selected, setSelected] = useState<BudgetView | null>(whole);
  return (
    <>
      <BudgetOptions
        patientId="p"
        items={planItems}
        wholeBudget={whole}
        wholeLoading={false}
        wholeError={null}
        onRetryWhole={() => undefined}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
      />
      <output aria-label="Seleccionado">{selected?.id ?? "ninguno"}</output>
    </>
  );
}

function renderOptions(planItems = items) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <MantineProvider>
        <Harness planItems={planItems} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

function answerWithBudgets() {
  api.scopedBudget.mockImplementation(
    async (_patient: string, input: Parameters<typeof budgetFor>[0]) => budgetFor(input),
  );
}

test("a plan with both kinds of work is budgeted natively in two phases", async () => {
  answerWithBudgets();
  renderOptions();
  expect(await screen.findByText("Fase 2 · Reponer y mejorar")).toBeInTheDocument();
  expect(screen.getByText("Fase 1 · Salud y urgencias")).toBeInTheDocument();
  expect(api.scopedBudget).toHaveBeenCalledWith("p", {
    scope: "primary",
    title: "Fase 1 · Salud y urgencias",
    clinicalPlanItemIds: ["f", "e"],
  });
  expect(api.scopedBudget).toHaveBeenCalledWith("p", {
    scope: "secondary",
    title: "Fase 2 · Reponer y mejorar",
    clinicalPlanItemIds: ["i"],
  });
  // Phase 1 is what the patient signs first.
  expect(screen.getByLabelText("Seleccionado")).toHaveTextContent("b-primary-fe");
  expect(screen.getByText(/Total 260,00/)).toBeInTheDocument();
  expect(screen.getByText(/Total 900,00/)).toBeInTheDocument();
});

test("the patient can choose to sign the second phase instead", async () => {
  answerWithBudgets();
  renderOptions();
  fireEvent.click(await screen.findByRole("radio", { name: "Firmar Fase 2 · Reponer y mejorar" }));
  expect(screen.getByLabelText("Seleccionado")).toHaveTextContent("b-secondary-i");
});

test("a single-phase plan starts as one budget for the whole plan", () => {
  answerWithBudgets();
  renderOptions(items.slice(0, 2));
  expect(screen.getByText("Presupuesto completo")).toBeInTheDocument();
  expect(api.scopedBudget).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Seleccionado")).toHaveTextContent("whole");
});

test("switching from phases to one budget selects the whole-plan budget", async () => {
  answerWithBudgets();
  renderOptions();
  await screen.findByText("Fase 2 · Reponer y mejorar");
  fireEvent.click(screen.getByText("Un presupuesto"));
  expect(screen.getByLabelText("Seleccionado")).toHaveTextContent("whole");
});

test("a custom budget is made from chosen treatments and becomes the one to sign", async () => {
  answerWithBudgets();
  renderOptions();
  await screen.findByText("Fase 2 · Reponer y mejorar");
  fireEvent.click(screen.getByRole("button", { name: "Nuevo presupuesto" }));
  const dialog = await screen.findByRole("dialog", { name: "Nuevo presupuesto" });
  fireEvent.change(within(dialog).getByLabelText("Nombre"), {
    target: { value: "Solo urgencias" },
  });
  fireEvent.click(within(dialog).getByRole("checkbox", { name: /Endodoncia/ }));
  expect(within(dialog).getByText(/1 tratamientos · 200,00/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Crear presupuesto" }));

  await waitFor(() =>
    expect(api.scopedBudget).toHaveBeenCalledWith("p", {
      scope: "custom",
      title: "Solo urgencias",
      clinicalPlanItemIds: ["e"],
    }),
  );
  expect(await screen.findByText("Solo urgencias")).toBeInTheDocument();
  expect(screen.getByLabelText("Seleccionado")).toHaveTextContent("b-custom-e");
});

test("a failure preparing the phases is reported once and retried only on request", async () => {
  api.scopedBudget.mockRejectedValue(new Error("PLAN_OUTDATED"));
  renderOptions();
  expect(await screen.findByText("No se pudieron preparar las fases")).toBeInTheDocument();
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(api.scopedBudget).toHaveBeenCalledTimes(1);

  answerWithBudgets();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("Fase 2 · Reponer y mejorar")).toBeInTheDocument();
});
