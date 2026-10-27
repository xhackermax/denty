// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const patientQuery = {
  data: {
    id: "patient-1",
    firstName: "Lucía",
    lastName: "Martín",
    recordNumber: "DNT-0042",
    phone: "600000000",
    email: null,
    declaredSource: null,
    birthDate: null,
    medicalProfile: null,
    photoUrl: null,
    archivedAt: null,
    version: 1,
  },
  isError: false,
};
const projectionQuery = {
  data: {
    appointments: [
      {
        id: "appointment-today",
        startsAt: "2026-10-05T10:30:00+02:00",
        status: "CONFIRMED",
        reason: "Operatoria",
        title: "Cita clínica",
        version: 2,
      },
    ],
    budgets: [],
    documents: [],
    prescriptions: [],
  },
  isPending: false,
  isError: false,
};
const workflowQuery = {
  data: {
    problems: [],
    encounters: [
      {
        id: "history-1",
        narrativeNote: "Diente 36: Caries.",
        nextVisit: "Reconstrucción 36 y valorar endodoncia.",
        signedAt: "2026-10-04T09:01:00.000Z",
        createdAt: "2026-10-04T09:01:00.000Z",
      },
    ],
  },
  isPending: false,
  isError: false,
};
const navigation = vi.hoisted(() => ({ query: "" }));
const dossier = vi.hoisted(() => ({
  print: vi.fn(),
  printing: false,
  notice: { error: null as string | null, clear: () => undefined },
}));

const mutation = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  isError: false,
};

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

vi.mock("@/shared/patients/patient-data", () => ({
  usePatientQuery: () => patientQuery,
  usePatientProjectionQuery: () => projectionQuery,
  useUpdatePatientMutation: () => mutation,
  useArchivePatientMutation: () => mutation,
  useRestorePatientMutation: () => mutation,
  useUploadPatientPhotoMutation: () => mutation,
  useCancelPatientAppointmentMutation: () => mutation,
}));

vi.mock("@/shared/clinical/clinical-data", () => ({
  useClinicalWorkflowQuery: () => workflowQuery,
}));

vi.mock("@/shared/clinical/clinical-pipeline-card", () => ({
  ClinicalPipelineCard: ({ patientId }: { patientId?: string }) => (
    <div data-testid="patient-clinical-pipeline">{patientId}</div>
  ),
}));
vi.mock("@/shared/clinical/clinical-sync-card", () => ({ ClinicalSyncCard: () => null }));
vi.mock("@/shared/clinical/clinical-workspace", () => ({
  ClinicalWorkspace: ({ mode }: { mode?: string }) => (
    <div>
      {mode === "plan" ? "PLAN-STAGE" : mode === "budget" ? "BUDGET-STAGE" : "CLINICAL-STAGE"}
    </div>
  ),
}));
vi.mock("@/shared/clinical/treatment-flow", () => ({
  TreatmentFlowModal: ({ opened }: { opened: boolean }) => (opened ? <div>FLOW-OPEN</div> : null),
}));
vi.mock("./patient-medical-history", () => ({ PatientMedicalHistory: () => null }));
vi.mock("./patient-clinical-summary", () => ({ PatientClinicalSummary: () => null }));
vi.mock("./patient-edit-modal", () => ({ PatientEditModal: () => null }));
vi.mock("@/features/referrals/patient-referrals-card", () => ({
  PatientReferralsCard: () => null,
}));
vi.mock("./patient-photo-capture", () => ({ PatientPhotoCapture: () => null }));
vi.mock("./dossier/use-patient-dossier", () => ({ usePatientDossierPrinter: () => dossier }));

import { PatientProfile } from "./patient-profile";

describe("PatientProfile next visit context", () => {
  beforeEach(() => {
    navigation.query = "";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T08:00:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("keeps the clinical pipeline inside the selected patient's clinical tab", () => {
    const { unmount } = render(
      <MantineProvider>
        <PatientProfile patientId="patient-1" />
      </MantineProvider>,
    );
    expect(screen.queryByTestId("patient-clinical-pipeline")).not.toBeInTheDocument();
    unmount();

    navigation.query = "view=clinical";
    render(
      <MantineProvider>
        <PatientProfile patientId="patient-1" />
      </MantineProvider>,
    );
    expect(screen.getByTestId("patient-clinical-pipeline")).toHaveTextContent("patient-1");
  });

  it("opens plan and budgets as stages inside the patient record", () => {
    navigation.query = "view=plan";
    const { unmount } = render(
      <MantineProvider>
        <PatientProfile patientId="patient-1" />
      </MantineProvider>,
    );
    expect(screen.getByText("PLAN-STAGE")).toBeInTheDocument();
    expect(screen.queryByText("BUDGET-STAGE")).not.toBeInTheDocument();
    unmount();

    navigation.query = "view=budgets";
    render(
      <MantineProvider>
        <PatientProfile patientId="patient-1" />
      </MantineProvider>,
    );
    expect(screen.getByText("BUDGET-STAGE")).toBeInTheDocument();
    expect(screen.queryByText("PLAN-STAGE")).not.toBeInTheDocument();
  });

  it("opens the guided signature flow from the patient budget stage", () => {
    navigation.query = "view=budgets&action=sign";
    render(
      <MantineProvider>
        <PatientProfile patientId="patient-1" />
      </MantineProvider>,
    );
    expect(screen.getByText("BUDGET-STAGE")).toBeInTheDocument();
    expect(screen.getByText("FLOW-OPEN")).toBeInTheDocument();
  });

  it("shows the latest next-visit clinical note when the patient has an appointment today", () => {
    render(
      <MantineProvider>
        <PatientProfile patientId="patient-1" />
      </MantineProvider>,
    );

    expect(screen.getByText("Previsto para hoy")).toBeInTheDocument();
    expect(screen.getByText("Reconstrucción 36 y valorar endodoncia.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "05/10/2026 · 10:30" })).toBeInTheDocument();
  });

  it("links each pipeline stage once, without duplicated shortcuts", () => {
    render(
      <MantineProvider>
        <PatientProfile patientId="patient-1" />
      </MantineProvider>,
    );
    expect(screen.getAllByRole("link", { name: /Odontograma/ })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /Presupuesto/ })).toHaveLength(1);
    expect(screen.queryByRole("tab", { name: "Plan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Presupuestos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Documentos" })).not.toBeInTheDocument();
  });

  it("cancels an upcoming appointment from the next-visit tile", async () => {
    mutation.mutateAsync.mockResolvedValue(undefined);
    render(
      <MantineProvider>
        <PatientProfile patientId="patient-1" />
      </MantineProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar cita del 05/10/2026 · 10:30" }));
    fireEvent.change(screen.getByLabelText("Motivo de cancelación"), {
      target: { value: "Pide cambiar de día" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    await vi.waitFor(() =>
      expect(mutation.mutateAsync).toHaveBeenCalledWith({
        id: "appointment-today",
        expectedVersion: 2,
        reason: "Pide cambiar de día",
      }),
    );
  });

  it("prints the whole patient dossier from a single header button", () => {
    render(
      <MantineProvider>
        <PatientProfile patientId="patient-1" />
      </MantineProvider>,
    );
    const buttons = screen.getAllByRole("button", { name: /dossier/i });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]!);
    expect(dossier.print).toHaveBeenCalledWith(
      expect.objectContaining({ id: "patient-1", firstName: "Lucía" }),
      [],
    );
  });

  it("shows why the dossier could not be printed", () => {
    dossier.notice.error = "No se pudo abrir el diálogo de impresión.";
    render(
      <MantineProvider>
        <PatientProfile patientId="patient-1" />
      </MantineProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo abrir el diálogo de impresión.",
    );
    dossier.notice.error = null;
  });
});
