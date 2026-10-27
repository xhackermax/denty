// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  assign: vi.fn(),
  patients: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/shared/patients/patient-data", () => ({
  usePatientsQuery: () => ({ data: { items: mocks.patients }, isError: false }),
}));
vi.mock("../recalls-data", () => ({
  fetchRecallCandidates: vi.fn(),
  useRecallStaffAndSitesQuery: () => ({ data: { sites: [], staff: [] } }),
  useSaveRecallTemplateMutation: () => ({ mutateAsync: mocks.save, isPending: false, error: null }),
  useAssignRecallMutation: () => ({ mutateAsync: mocks.assign, isPending: false, error: null }),
}));

import type { RecallTemplate } from "@/shared/api";

import { RecallTemplateWizard } from "../recall-template-wizard";

const saved = { id: "11111111-1111-4111-8111-111111111111", name: "Higiene semestral" };

const template = {
  ...saved,
  code: "HIGIENE",
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
  version: 7,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z",
  openCount: 12,
  overdueCount: 0,
} satisfies RecallTemplate;

function renderWizard(onClose = vi.fn()) {
  render(
    <MantineProvider env="test">
      <RecallTemplateWizard opening={{ mode: "create" }} onClose={onClose} />
    </MantineProvider>,
  );
  return onClose;
}

const next = () => fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

afterEach(cleanup);
beforeEach(() => {
  mocks.save.mockReset().mockResolvedValue(saved);
  mocks.assign.mockReset();
  mocks.patients = [];
});

describe("RecallTemplateWizard", () => {
  it("no avanza sin nombre y explica qué falta", () => {
    renderWizard();
    next();
    expect(screen.getByText("Entre 3 y 100 caracteres.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toBeInTheDocument();
  });

  it("sugiere el código a partir del nombre y crea el tipo sin pacientes", async () => {
    const onClose = renderWizard();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Higiene semestral" } });
    expect(screen.getByLabelText(/Código/)).toHaveValue("HIGIENE_SEMESTRAL");
    next();
    next();
    next();
    next();
    expect(screen.getByLabelText("Resumen")).toHaveTextContent("ninguno por ahora");
    fireEvent.click(screen.getByRole("button", { name: "Crear tipo" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mocks.save).toHaveBeenCalledWith({
      templateId: null,
      template: expect.objectContaining({ code: "HIGIENE_SEMESTRAL", autoEnroll: false }),
    });
    expect(mocks.assign).not.toHaveBeenCalled();
  });

  it("asigna los pacientes elegidos y muestra los que se saltaron", async () => {
    mocks.patients = [
      {
        id: "22222222-2222-4222-8222-222222222222",
        firstName: "Ana",
        lastName: "Ruiz",
        recordNumber: "7",
      },
    ];
    mocks.assign.mockResolvedValue({
      added: 0,
      dryRun: false,
      skipped: [{ patientId: "22222222-2222-4222-8222-222222222222", reason: "ALREADY_ACTIVE" }],
    });
    const onClose = renderWizard();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Higiene semestral" } });
    next();
    next();
    fireEvent.click(screen.getByText("Manual"));
    fireEvent.change(screen.getByLabelText("Buscar paciente"), { target: { value: "Ana" } });
    fireEvent.click(await screen.findByRole("button", { name: "Añadir" }, { timeout: 2000 }));
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: "Crear tipo" }));
    expect(await screen.findByText(/Ana Ruiz: ya tenía uno abierto/)).toBeInTheDocument();
    expect(mocks.assign).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: saved.id,
        patientIds: ["22222222-2222-4222-8222-222222222222"],
        idempotencyKey: expect.any(String),
      }),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("exige canal y días cuando se preparan avisos", () => {
    renderWizard();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Higiene semestral" } });
    next();
    next();
    next();
    expect(screen.getByText(/Denty no envía mensajes/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Preparar avisos automáticos"));
    next();
    expect(screen.getByText("Elige al menos un canal.")).toBeInTheDocument();
  });

  it("al editar bloquea el código con pacientes y permite recalcular pendientes", async () => {
    const onClose = vi.fn();
    render(
      <MantineProvider env="test">
        <RecallTemplateWizard opening={{ mode: "edit", template }} onClose={onClose} />
      </MantineProvider>,
    );
    expect(screen.getByLabelText(/Código/)).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Higiene anual" } });
    expect(screen.getByLabelText(/Código/)).toHaveValue("HIGIENE");
    next();
    fireEvent.change(screen.getByLabelText("Cada"), { target: { value: "12" } });
    next();
    next();
    next();
    fireEvent.click(screen.getByLabelText("Recalcular las fechas de los 12 recalls pendientes"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mocks.save).toHaveBeenCalledWith({
      templateId: saved.id,
      template: expect.objectContaining({ name: "Higiene anual", intervalValue: 12 }),
      expectedVersion: 7,
      recomputePending: true,
    });
  });

  it("duplicar propone código y nombre nuevos y permite volver atrás", () => {
    render(
      <MantineProvider env="test">
        <RecallTemplateWizard
          opening={{
            mode: "duplicate",
            template,
          }}
          onClose={vi.fn()}
        />
      </MantineProvider>,
    );
    expect(screen.getByText("Duplicar tipo de recall")).toBeInTheDocument();
    expect(screen.getByLabelText(/Código/)).toHaveValue("HIGIENE_COPIA");
    expect(screen.getByLabelText(/Código/)).toBeEnabled();
    next();
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByLabelText(/Nombre/)).toHaveValue("Higiene semestral (copia)");
  });
});
