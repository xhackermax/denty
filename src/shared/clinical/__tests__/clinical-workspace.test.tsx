// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
  reorderPlan: vi.fn(),
  recordPreference: vi.fn(),
  createAlternative: vi.fn(),
}));

vi.mock("../clinical-data", () => ({
  useClinicalWorkflowQuery: () => ({ data: {}, isError: false }),
  useClinicalPlanQuery: () => ({
    data: {
      status: "DRAFT",
      items: [
        {
          id: "plan-a",
          label: "Obturación",
          tooth: "46",
          treatmentCode: "FILLING",
          phase: 1,
          priority: 20,
          status: "PLANNED",
          priceCents: 9000,
        },
        {
          id: "plan-b",
          label: "Corona",
          tooth: "46",
          treatmentCode: "CROWN",
          phase: 2,
          priority: 10,
          status: "PLANNED",
          priceCents: 30000,
        },
      ],
      route: [
        {
          id: "plan-a",
          label: "Obturación",
          tooth: "46",
          treatmentCode: "FILLING",
          phase: 1,
          priority: 20,
          status: "PLANNED",
          priceCents: 9000,
        },
        {
          id: "plan-b",
          label: "Corona",
          tooth: "46",
          treatmentCode: "CROWN",
          phase: 2,
          priority: 10,
          status: "PLANNED",
          priceCents: 30000,
        },
      ],
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
          scope: "custom",
          title: "Conservar el diente",
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
          id: "draft-2",
          code: "P-2-R1",
          status: "DRAFT",
          totalCents: 195000,
          version: 1,
          revision: 1,
          createdAt: "2026-10-05T11:00:00.000Z",
          scope: "custom",
          title: "Implante",
          items: [
            {
              id: "item-2",
              description: "Extracción",
              tooth: "46",
              unitPriceCents: 15000,
              quantity: 1,
              billingMode: "separate",
              totalCents: 15000,
            },
            {
              id: "item-3",
              description: "Implante",
              tooth: "46",
              unitPriceCents: 180000,
              quantity: 1,
              billingMode: "separate",
              totalCents: 180000,
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
  useCreateScopedBudgetMutation: () => ({
    mutate: mocks.createAlternative,
    isPending: false,
    isError: false,
    error: null,
  }),
  useTreatmentCatalogQuery: () => ({ data: { items: [] } }),
  useAddClinicalPlanItemMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useReorderClinicalPlanMutation: () => ({ mutate: mocks.reorderPlan, isPending: false }),
  useCreateClinicalEncounterMutation: () => ({
    mutateAsync: mocks.recordPreference,
    isPending: false,
    error: null,
  }),
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
  mocks.reorderPlan.mockReset();
  mocks.recordPreference.mockResolvedValue({});
  mocks.createAlternative.mockReset();
});

function renderWorkspace() {
  return render(
    <MantineProvider>
      <ClinicalWorkspace patientId="patient-1" />
    </MantineProvider>,
  );
}

describe("patient budget history", () => {
  it("renames the workspace around budgets and treatment plan sequencing", () => {
    renderWorkspace();

    expect(screen.getAllByText("Presupuestos y plan de tratamiento").length).toBeGreaterThan(0);
    expect(screen.getByRole("list", { name: "Tratamientos a realizar" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Presupuestos" })).toBeInTheDocument();
  });

  it("uses direct drag handles instead of subir y bajar controls", () => {
    renderWorkspace();
    const sequence = screen.getByRole("list", { name: "Tratamientos a realizar" });
    const rows = within(sequence).getAllByRole("listitem");
    expect(within(rows[0]!).getByText("1")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("Obturación")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("2")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Corona")).toBeInTheDocument();
    expect(within(rows[0]!).getByRole("button", { name: "Mover Obturación" })).toBeInTheDocument();
    expect(within(rows[1]!).getByRole("button", { name: "Mover Corona" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Subir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Bajar/ })).not.toBeInTheDocument();
  });

  it("can render plan and budgets as independent minimal surfaces", () => {
    const { rerender } = render(
      <MantineProvider>
        <ClinicalWorkspace patientId="patient-1" mode="plan" />
      </MantineProvider>,
    );
    expect(screen.getByRole("list", { name: "Tratamientos a realizar" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Presupuestos" })).not.toBeInTheDocument();

    rerender(
      <MantineProvider>
        <ClinicalWorkspace patientId="patient-1" mode="budget" />
      </MantineProvider>,
    );
    expect(screen.queryByRole("list", { name: "Tratamientos a realizar" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Presupuestos" })).toBeInTheDocument();
  });

  it("shows Plan A/B/C alternatives and carries the chosen plan to consents", () => {
    const openFlow = vi.fn();
    render(
      <MantineProvider>
        <ClinicalWorkspace patientId="patient-1" mode="plan" onOpenGuidedFlow={openFlow} />
      </MantineProvider>,
    );
    expect(screen.getByText("Plan A · Plan completo")).toBeInTheDocument();
    expect(screen.getByText(/Plan B · Conservar el diente/)).toBeInTheDocument();
    expect(screen.getByText(/Plan C · Implante/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continuar con Plan A a consentimientos" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Elegir Plan B" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Continuar con Plan B a consentimientos" }),
    );
    expect(openFlow).toHaveBeenCalledWith("draft-1");
  });

  it("no muestra la tarjeta de estado de sincronización", () => {
    renderWorkspace();
    expect(screen.queryByText("Estado de sincronización")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin estado de sincronización disponible.")).not.toBeInTheDocument();
    expect(screen.queryByText("Sincronización cargada desde el backend.")).not.toBeInTheDocument();
  });

  it("opens previous budget details and keeps signed budgets read-only", async () => {
    renderWorkspace();
    const history = screen.getByRole("region", { name: "Presupuestos" });
    expect(within(history).getAllByRole("button", { name: "Abrir" })).toHaveLength(3);
    expect(within(history).getAllByRole("button", { name: "Editar" })).toHaveLength(2);
    expect(within(history).getAllByRole("button", { name: "Eliminar" })).toHaveLength(2);

    fireEvent.click(within(history).getAllByRole("button", { name: "Abrir" })[0]!);
    expect(await screen.findByRole("dialog", { name: "Presupuesto P-1-R2" })).toBeInTheDocument();
    expect(screen.getByText("Diente 46 · Obturación")).toBeInTheDocument();
  });

  it("compares two draft options in patient-friendly language and records interest", async () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole("button", { name: "Comparar opciones" }));
    const dialog = await screen.findByRole("dialog", { name: "Comparar opciones de tratamiento" });

    expect(within(dialog).getByText("¿Qué opción encaja mejor contigo?")).toBeInTheDocument();
    expect(within(dialog).getByText("Conservar el diente")).toBeInTheDocument();
    expect(within(dialog).getByText("Implante")).toBeInTheDocument();
    expect(within(dialog).getByText("Diente 46: Reconstrucción del diente")).toBeInTheDocument();
    expect(within(dialog).getByText("Diente 46: Extracción del diente")).toBeInTheDocument();
    expect(within(dialog).getByText("Diente 46: Colocación del implante")).toBeInTheDocument();

    const interestButtons = within(dialog).getAllByRole("button", {
      name: "Me interesa esta opción",
    });
    fireEvent.click(interestButtons[1]!);
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar preferencia" }));

    await waitFor(() =>
      expect(mocks.recordPreference).toHaveBeenCalledWith(
        expect.objectContaining({
          narrativeNote: expect.stringContaining(
            "el paciente muestra interés por «Implante»",
          ),
          sign: false,
        }),
      ),
    );
  });

  it("saves draft edits with the expected version and updated line items", async () => {
    renderWorkspace();
    fireEvent.click(
      within(screen.getByRole("region", { name: "Presupuestos" })).getAllByRole("button", {
        name: "Editar",
      })[0]!,
    );
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
    fireEvent.click(
      within(screen.getByRole("region", { name: "Presupuestos" })).getAllByRole("button", {
        name: "Eliminar",
      })[0]!,
    );
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
