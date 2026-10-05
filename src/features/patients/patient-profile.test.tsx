// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
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
const mutation = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  isError: false,
};

vi.mock("@/shared/patients/patient-data", () => ({
  usePatientQuery: () => patientQuery,
  usePatientProjectionQuery: () => projectionQuery,
  useUpdatePatientMutation: () => mutation,
  useArchivePatientMutation: () => mutation,
  useRestorePatientMutation: () => mutation,
  useUploadPatientPhotoMutation: () => mutation,
}));

vi.mock("@/shared/clinical/clinical-data", () => ({
  useClinicalWorkflowQuery: () => workflowQuery,
}));

vi.mock("@/shared/clinical/clinical-pipeline-card", () => ({ ClinicalPipelineCard: () => null }));
vi.mock("@/shared/clinical/clinical-sync-card", () => ({ ClinicalSyncCard: () => null }));
vi.mock("./patient-medical-history", () => ({ PatientMedicalHistory: () => null }));
vi.mock("./patient-clinical-summary", () => ({ PatientClinicalSummary: () => null }));
vi.mock("./patient-edit-modal", () => ({ PatientEditModal: () => null }));
vi.mock("./patient-photo-capture", () => ({ PatientPhotoCapture: () => null }));

import { PatientProfile } from "./patient-profile";

describe("PatientProfile next visit context", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T08:00:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("shows the latest next-visit clinical note when the patient has an appointment today", () => {
    render(
      <MantineProvider>
        <PatientProfile patientId="patient-1" />
      </MantineProvider>,
    );

    expect(screen.getByText("Previsto para hoy")).toBeInTheDocument();
    expect(screen.getByText("Reconstrucción 36 y valorar endodoncia.")).toBeInTheDocument();
    expect(screen.getByText("05/10/2026 · 10:30")).toBeInTheDocument();
  });
});
