// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
}));

vi.mock("../clinical-data", () => ({
  useClinicalWorkflowQuery: () => ({ data: {}, isError: false }),
  useClinicalPlanQuery: () => ({
    data: {
      status: "DRAFT",
      items: [],
      route: [],
      budgets: [],
    },
    isError: false,
    isLoading: false,
  }),
  usePatientBudgetsQuery: () => ({
    data: {
      items: [
        {
          id: "draft-1",
          code: "P-1-R2",
          status: "DRAFT",
          totalCents: 9000,
          version: 2,
          revision: 2,
          createdAt: "2026-10-05T10:00:00.000Z",
          scope: "primary",
          title: "Fase 1",
          items: [
            {
              id: "item-1",
              description: "Obturación",
              tooth: "46",
              unitPriceCents: 9000,
              quantity: 1,
              billingMode: "separate",
              totalCents: 9000,
            },
          ],
        },
        {
          id: "signed-1",
          code: "P-1-R1",
          status: "SIGNED",
          totalCents: 7000,
          version: 2,
          revision: 1,
          createdAt: "2026-09-20T10:00:00.000Z",
          scope: "plan",
          title: null,
          items: [],
        },
      ],
    },
    isError: false,
    isLoading: false,
  }),
  useClinicalSyncQuery: () => ({ data: null, isError: false }),
  useSyncPlanFromOdontogramMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useSyncBudgetFromPlanMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useTreatmentCatalogQuery: () => ({ data: { items: [] } }),
  useAddClinicalPlanItemMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateDraftBudgetMutation: () => ({
    mutateAsync: mocks.updateBudget,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useDeleteDraftBudgetMutation: () => ({
    mutateAsync: mocks.deleteBudget,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
}));

import { ClinicalWorkspace } from "../clinical-workspace";

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateBudget.mockResolvedValue({});
  mocks.deleteBudget.mockResolvedValue({});
});

function renderWorkspace() {
  return render(
    <MantineProvider>
      <ClinicalWorkspace patientId="patient-1" />
    </MantineProvider>,
  );
}

describe("patient budget history", () => {
  it("opens previous budget details and keeps signed budgets read-only", async () => {
    renderWorkspace();
    const history = screen.getByRole("region", { name: "Presupuestos anteriores" });
    expect(within(history).getAllByRole("button", { name: "Abrir" })).toHaveLength(2);
    expect(within(history).getAllByRole("button", { name: "Editar" })).toHaveLength(1);
    expect(within(history).getAllByRole("button", { name: "Eliminar" })).toHaveLength(1);

    fireEvent.click(within(history).getAllByRole("button", { name: "Abrir" })[0]!);
    expect(await screen.findByRole("dialog", { name: "Presupuesto P-1-R2" })).toBeInTheDocument();
    expect(screen.getByText("Diente 46 · Obturación")).toBeInTheDocument();
  });

  it("saves draft edits with the expected version and updated line items", async () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar presupuesto P-1-R2" });
    fireEvent.change(within(dialog).getByLabelText("Nombre del presupuesto"), {
      target: { value: "Fase 1 revisada" },
    });
    fireEvent.change(within(dialog).getByLabelText("Obturación · importe unitario en euros"), {
      target: { value: "95" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mocks.updateBudget).toHaveBeenCalledWith({
        budgetId: "draft-1",
        expectedVersion: 2,
        title: "Fase 1 revisada",
        items: [{ id: "item-1", unitPriceCents: 9500 }],
      }),
    );
  });

  it("requires confirmation before deleting a draft", async () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog", { name: "¿Eliminar este presupuesto?" });
    expect(within(dialog).getByText(/Esta acción no se puede deshacer/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar presupuesto" }));

    await waitFor(() =>
      expect(mocks.deleteBudget).toHaveBeenCalledWith({
        budgetId: "draft-1",
        expectedVersion: 2,
      }),
    );
  });
});
