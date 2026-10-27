// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tenant = vi.hoisted(() => ({
  role: "ADMIN",
  permissions: ["recalls.read", "recalls.manage", "recalls.templates.manage"] as string[],
}));
const data = vi.hoisted(() => ({
  items: [] as Array<Record<string, unknown>>,
  templates: [] as Array<Record<string, unknown>>,
}));
const mutations = vi.hoisted(() => ({
  act: vi.fn(),
  bulk: vi.fn(),
  archive: vi.fn(),
  assign: vi.fn(),
}));

vi.mock("@/shared/tenancy/active-context", () => ({ useActiveTenant: () => tenant }));
vi.mock("@/shared/patients/patient-data", () => ({
  usePatientsQuery: () => ({ data: { items: [] }, isError: false }),
}));
vi.mock("../recall-template-wizard", () => ({
  RecallTemplateWizard: ({ opening }: { opening: { mode: string } }) => (
    <div role="dialog" aria-label={`Asistente ${opening.mode}`} />
  ),
}));
vi.mock("../recalls-data", () => ({
  fetchRecallCandidates: vi.fn(),
  useRecallListQuery: () => ({
    data: {
      total: data.items.length,
      kpis: { pending: 3, upcoming: 1, overdue: 2, contacted: 0, booked: 0, completed: 4 },
      items: data.items,
    },
    isError: false,
    isLoading: false,
  }),
  useRecallTemplatesQuery: () => ({ data: { items: data.templates }, isError: false }),
  useRecallHistoryQuery: (id: string | null) => ({
    data: {
      items: id
        ? [
            {
              id: "e1",
              eventType: "CONTACTED",
              actorName: "Recepción",
              createdAt: "2026-10-20T09:00:00.000Z",
            },
          ]
        : [],
    },
    isError: false,
  }),
  useRecallStaffAndSitesQuery: () => ({ data: { sites: [], staff: [] } }),
  useRecallActionMutation: () => ({ mutate: mutations.act, isPending: false, error: null }),
  useRecallBulkMutation: () => ({ mutate: mutations.bulk, isPending: false, error: null }),
  useArchiveRecallTemplateMutation: () => ({
    mutate: mutations.archive,
    isPending: false,
    error: null,
  }),
  useAssignRecallMutation: () => ({
    mutate: mutations.assign,
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
    data: undefined,
  }),
  useSaveRecallTemplateMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { RecallsModule } from "../recalls-module";

function recall(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    patientId: `p-${id}`,
    patientName: `Paciente ${id}`,
    recordNumber: "1",
    kind: "RECALL_HIGIENE",
    templateId: "t-1",
    templateName: "Higiene",
    dueAt: "2026-10-01T07:00:00.000Z",
    status: "pending",
    state: "VENCIDO",
    closeReason: null,
    pausedUntil: null,
    siteId: null,
    siteName: null,
    staffId: null,
    staffName: null,
    contactedAt: null,
    contactAttempts: 0,
    maxAttempts: 3,
    bookedAppointmentId: null,
    bookedAppointmentAt: null,
    lastVisitAt: null,
    nextAppointment: null,
    version: 4,
    createdAt: "2026-04-01T07:00:00.000Z",
    ...overrides,
  };
}

function renderModule() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider env="test">
        <RecallsModule />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

afterEach(cleanup);
beforeEach(() => {
  tenant.permissions = ["recalls.read", "recalls.manage", "recalls.templates.manage"];
  data.items = [recall("a"), recall("b", { status: "booked", state: "CITA_PROGRAMADA" })];
  data.templates = [];
  mutations.act.mockReset();
  mutations.bulk.mockReset();
  mutations.archive.mockReset();
});

const template = {
  id: "t-1",
  code: "HIGIENE",
  name: "Higiene",
  category: "GENERAL",
  description: null,
  intervalValue: 6,
  intervalUnit: "MESES",
  anchorType: "FECHA_MANUAL",
  leadDays: 14,
  maxAttempts: 3,
  autoRecurrence: true,
  autoEnroll: false,
  messagingEnabled: false,
  channels: [],
  reminderOffsets: [],
  messageTemplateKey: null,
  defaultSiteId: null,
  defaultStaffId: null,
  active: true,
  archivedAt: null,
  version: 1,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z",
  openCount: 5,
  overdueCount: 2,
};

const openTemplates = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Tipos de recall" }));
  await screen.findByRole("button", { name: "Opciones de Higiene" });
};

describe("RecallsModule", () => {
  it("muestra los indicadores y los recalls con su estado", () => {
    renderModule();
    expect(screen.getByText("Vencidos").nextSibling).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: "Paciente a" })).toHaveAttribute(
      "href",
      "/app/patients/p-a",
    );
    const rowB = screen.getByRole("link", { name: "Paciente b" }).closest("span");
    expect(rowB).toHaveTextContent("Cita programada");
  });

  it("marca contactado directamente con la versión esperada", () => {
    renderModule();
    fireEvent.click(screen.getByRole("button", { name: "Acciones para Paciente a" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Marcar contactado" }));
    expect(mutations.act).toHaveBeenCalledWith(
      { recallId: "a", request: { expectedVersion: 4, action: "CONTACT", payload: {} } },
      expect.anything(),
    );
  });

  it("pide la fecha antes de posponer", () => {
    renderModule();
    fireEvent.click(screen.getByRole("button", { name: "Acciones para Paciente a" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Posponer" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Guardar" })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Volver a mostrar/), {
      target: { value: "2026-12-01" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(mutations.act).toHaveBeenCalledWith(
      {
        recallId: "a",
        request: { expectedVersion: 4, action: "POSTPONE", payload: { until: "2026-12-01" } },
      },
      expect.anything(),
    );
  });

  it("confirma la cancelación masiva y solo permite seleccionar recalls abiertos", () => {
    renderModule();
    expect(
      screen.queryByRole("checkbox", { name: "Seleccionar a Paciente b" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar a Paciente a" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar recall" }));
    expect(mutations.bulk).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(mutations.bulk).toHaveBeenCalledWith(
      { ids: ["a"], action: "CANCEL", payload: {} },
      expect.anything(),
    );
  });

  it("solo lectura: sin acciones de cambio ni creación de tipos", () => {
    tenant.permissions = ["recalls.read"];
    renderModule();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nuevo tipo de recall" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Acciones para Paciente a" }));
    expect(screen.queryByRole("menuitem", { name: "Marcar contactado" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Historial" })).toBeInTheDocument();
  });

  it("muestra un estado vacío útil sin recalls", () => {
    data.items = [];
    renderModule();
    expect(screen.getByText("No hay recalls con estos filtros")).toBeInTheDocument();
  });

  it("confirma antes de marcar realizado", () => {
    renderModule();
    fireEvent.click(screen.getByRole("button", { name: "Acciones para Paciente a" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Marcar realizado" }));
    expect(screen.getByText(/se programa el siguiente/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(mutations.act).toHaveBeenCalledWith(
      { recallId: "a", request: { expectedVersion: 4, action: "COMPLETE", payload: {} } },
      expect.anything(),
    );
  });

  it("informa de los fallos parciales de un lote y deja seleccionados los que fallaron", () => {
    mutations.bulk.mockImplementation((_request, options: { onSuccess: (r: unknown) => void }) =>
      options.onSuccess({ updated: 0, failed: [{ id: "a", reason: "RECALL_INVALID_TRANSITION" }] }),
    );
    renderModule();
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar a Paciente a" }));
    fireEvent.click(screen.getByRole("button", { name: "Marcar contactado" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(screen.getByText(/1 no se pudieron cambiar/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Seleccionar a Paciente a" })).toBeChecked();
  });

  it("abre el historial del recall", () => {
    renderModule();
    fireEvent.click(screen.getByRole("button", { name: "Acciones para Paciente a" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Historial" }));
    const drawer = screen.getByRole("dialog", { name: "Historial · Paciente a" });
    expect(within(drawer).getByText("Contactado")).toBeInTheDocument();
    expect(drawer).toHaveTextContent("Recepción");
  });

  it("gestiona los tipos: crear, editar, archivar con confirmación y asignar", async () => {
    data.templates = [template];
    renderModule();
    await openTemplates();
    expect(screen.getByText(/cada 6 meses · 5 abiertos · 2 vencidos/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Nuevo tipo de recall" }));
    expect(screen.getByRole("dialog", { name: "Asistente create" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Opciones de Higiene" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Archivar" }));
    expect(mutations.archive).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Archivar" }));
    expect(mutations.archive).toHaveBeenCalledWith(
      { templateId: "t-1", archive: true },
      expect.anything(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Asignar pacientes" }));
    const assignDialog = screen.getByRole("dialog", { name: "Asignar pacientes · Higiene" });
    expect(within(assignDialog).getByRole("button", { name: /^Asignar/ })).toBeDisabled();
    expect(within(assignDialog).queryByText("Automática")).not.toBeInTheDocument();
  });

  it("restaura un tipo archivado sin pedir confirmación", async () => {
    data.templates = [{ ...template, archivedAt: "2026-10-20T08:00:00.000Z" }];
    renderModule();
    await openTemplates();
    expect(screen.getByText("Archivado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Asignar pacientes" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Opciones de Higiene" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Restaurar" }));
    expect(mutations.archive).toHaveBeenCalledWith({ templateId: "t-1", archive: false });
  });
});
