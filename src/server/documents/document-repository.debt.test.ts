import { describe, expect, it, vi } from "vitest";
import type { SupabaseRestClient } from "../supabase/rest-client";
import type { StorageRepository } from "../storage/storage-repository";
import { DocumentRepository } from "./document-repository";

const clinicId = "clinic-1";
const patientId = "patient-1";
const staff = { id: "doctor-1", display_name: "Dra. Marta", role: "DENTIST", active: true };
const patient = { id: patientId, first_name: "Ana", last_name: "Sanz", dni: "12345678Z" };
const site = { id: "site-1", name: "Sede Centro", address: "Calle Mayor 1", city: "Zaragoza" };
const fiscal = { fiscal_legal_name: "Centro Dental Ejemplo SL", fiscal_tax_id: "B12345678" };

function repository(options: { dni?: string | null; site?: boolean } = {}) {
  const insert = vi.fn(async (_table: string, row: Record<string, unknown>) => ({
    ...row,
    id: "document-1", version: 1, version_series_id: "document-1",
    previous_version_id: null, file_name: null, mime_type: null,
    checksum: null, file_size_bytes: null, signer_name: null, signed_at: null,
    created_at: "2026-10-10T09:00:00Z",
  }));
  const select = vi.fn(async (table: string) => {
    const data: Record<string, unknown[]> = {
      patients: [{ ...patient, dni: options.dni === undefined ? patient.dni : options.dni }],
      sites: options.site === false ? [] : [site],
      staff_members: [staff],
      clinics: [{ name: "Centro Dental Ejemplo" }],
      document_templates: [{ id: "template-1", version: 1, body: "Reconocimiento" }],
      billing_settings: [fiscal],
      budgets: [{ id: "budget-1", code: "P-2026-10", status: "SIGNED",
        total_cents: 120000, title: "Prótesis" }],
      payments: [
        { id: "p1", amount_cents: 40000, status: "COMPLETED", budget_id: "budget-1" },
        { id: "p2", amount_cents: 20000, status: "PENDING", budget_id: "budget-1" },
      ],
      payment_allocations: [{ payment_id: "p1", amount_cents: 40000 }],
    };
    return data[table] ?? [];
  });
  const rest = { select, insert } as unknown as SupabaseRestClient;
  const storage = {} as StorageRepository;
  return { repo: new DocumentRepository(rest, storage, clinicId), insert, select };
}

describe("recognition of debt", () => {
  it("takes patient, tax issuer, doctor and site from Supabase and subtracts settled payments", async () => {
    const { repo, insert } = repository();
    const doc = await repo.createDebtAcknowledgement({
      patientId, siteId: "site-1", doctorId: "doctor-1", budgetId: "budget-1",
      concept: "Prótesis dental terminada", dueMode: "END_OF_TREATMENT",
    });
    expect(doc.type).toBe("DEBT_ACKNOWLEDGEMENT");
    expect(doc.data).toMatchObject({
      importe_deuda_centimos: 80000,
      acreedor: fiscal.fiscal_legal_name,
      nif_acreedor: fiscal.fiscal_tax_id,
      paciente: "Ana Sanz",
      dni: "12345678Z", doctor: "Dra. Marta", sede: "Sede Centro",
    });
    expect(insert).toHaveBeenCalledWith("documents", expect.objectContaining({
      clinic_id: clinicId, patient_id: patientId, type: "DEBT_ACKNOWLEDGEMENT",
      status: "DRAFT",
    }));
  });
  it("does not generate debt when patient identification or site is missing", async () => {
    const form = { patientId, siteId: "site-1", doctorId: "doctor-1",
      amountCents: 35000, concept: "Tratamiento dental finalizado", dueMode: "END_OF_TREATMENT" as const };
    const missingDni = repository({ dni: null });
    await expect(missingDni.repo.createDebtAcknowledgement(form)).rejects.toThrow("DNI/NIE");
    expect(missingDni.insert).not.toHaveBeenCalled();
    const missingSite = repository({ site: false });
    await expect(missingSite.repo.createDebtAcknowledgement(form)).rejects.toThrow("sede");
    expect(missingSite.insert).not.toHaveBeenCalled();
  });
  it("does not permit generic documents.create to forge a financial acknowledgement", async () => {
    const { repo, insert } = repository();
    await expect(repo.create({
      patientId, type: "DEBT_ACKNOWLEDGEMENT", title: "Deuda",
      data: { importe_deuda: "1.000.000" },
    })).rejects.toThrow("formulario");
    expect(insert).not.toHaveBeenCalled();
  });
});
