import { describe, expect, it, vi } from "vitest";

import type { SupabaseRestClient } from "../../supabase/rest-client";
import { PatientRepository } from "../patient-repository";

const patientRow = {
  id: "p1",
  clinic_id: "clinic",
  legacy_id: null,
  record_number: "42",
  first_name: "Lucía",
  last_name: "Martín",
  dni: null,
  phone: null,
  email: null,
  birth_date: null,
  declared_source: null,
  declared_source_detail: null,
  photo_url: null,
  medical_profile: {},
  archived_at: null,
  archived_reason: null,
  discharged_at: "2026-10-27T10:00:00Z",
  discharge_review_months: 6,
  discharge_notes: "Fin de ortodoncia",
  version: 4,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-10-27T10:00:00Z",
};

function repository(selects: Record<string, unknown[]>, rpcResult: unknown = {}) {
  const client = {
    select: vi.fn(async (table: string) => selects[table] ?? []),
    rpc: vi.fn(async () => rpcResult),
  };
  return {
    client,
    repo: new PatientRepository(client as unknown as SupabaseRestClient, "clinic"),
  };
}

describe("alta del paciente en el repositorio", () => {
  it("propone el intervalo más corto de los tratamientos realizados", async () => {
    const { client, repo } = repository({
      clinical_treatment_executions: [
        { treatment_code: "IMPLANT" },
        { treatment_code: "FILLING" },
        { treatment_code: "IMPLANT" },
        { treatment_code: null },
      ],
      treatment_catalog: [
        { name: "Obturación", review_interval_months: 12 },
        { name: "Implante", review_interval_months: 6 },
      ],
    });
    await expect(repo.getDischargeSuggestion("p1")).resolves.toEqual({
      months: 6,
      basedOn: "Implante",
    });
    expect(client.select).toHaveBeenCalledWith(
      "treatment_catalog",
      expect.objectContaining({
        code: 'in.("IMPLANT","FILLING")',
        clinic_id: "eq.clinic",
        review_interval_months: "not.is.null",
      }),
    );
  });

  it("sin tratamientos realizados no consulta el catálogo y usa 6 meses", async () => {
    const { client, repo } = repository({});
    await expect(repo.getDischargeSuggestion("p1")).resolves.toEqual({
      months: 6,
      basedOn: null,
    });
    expect(client.select).toHaveBeenCalledTimes(1);
  });

  it("da de alta con el intervalo elegido y devuelve la fecha de revisión", async () => {
    const { client, repo } = repository(
      { patients: [patientRow] },
      { conflict: false, reviewDueDate: "2027-04-27" },
    );
    const result = await repo.dischargePatient("p1", {
      expectedVersion: 3,
      reviewMonths: 6,
      notes: "Fin de ortodoncia",
    });
    expect(client.rpc).toHaveBeenCalledWith("discharge_patient", {
      p_patient_id: "p1",
      p_expected_version: 3,
      p_review_months: 6,
      p_notes: "Fin de ortodoncia",
    });
    expect(result.reviewDueDate).toBe("2027-04-27");
    expect(result.patient).toMatchObject({
      dischargedAt: "2026-10-27T10:00:00Z",
      dischargeReviewMonths: 6,
      dischargeNotes: "Fin de ortodoncia",
    });
  });

  it("rechaza el alta si la ficha cambió", async () => {
    const { repo } = repository({}, { conflict: true });
    await expect(
      repo.dischargePatient("p1", { expectedVersion: 1, reviewMonths: 12 }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("reactiva el tratamiento", async () => {
    const { client, repo } = repository(
      { patients: [{ ...patientRow, discharged_at: null, discharge_review_months: null }] },
      { conflict: false },
    );
    const patient = await repo.readmitPatient("p1", { expectedVersion: 4 });
    expect(client.rpc).toHaveBeenCalledWith("readmit_patient", {
      p_patient_id: "p1",
      p_expected_version: 4,
    });
    expect(patient.dischargedAt).toBeNull();
  });
});
