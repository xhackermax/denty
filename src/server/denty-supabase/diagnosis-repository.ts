import { validateDiagnosis, type DiagnosisInput } from "@/domain/diagnosis";
import { treatmentSuggestions } from "@/domain/diagnosis/treatment-suggestions";
import { diagnosisPlanInputSchema, type ClinicalDiagnosis } from "@/shared/api/schemas/diagnoses";
import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";
import type { z } from "zod";
interface DiagnosisRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  encounter_id: string | null;
  category: "periodontal" | "bruxism";
  value: string;
  detail: Record<string, unknown>;
  justification: string;
  status: "active" | "resolved";
  created_by: string | null;
  created_at: string;
  version: number;
}
const map = (r: DiagnosisRow): ClinicalDiagnosis => ({
  id: r.id,
  clinicId: r.clinic_id,
  patientId: r.patient_id,
  encounterId: r.encounter_id,
  category: r.category,
  value: r.value,
  detail: r.detail,
  justification: r.justification,
  status: r.status,
  createdBy: r.created_by,
  createdAt: r.created_at,
  version: r.version,
});
export class DiagnosisRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}
  private async assertPatient(patientId: string) {
    const rows = await this.client.select<{ id: string }>("patients", {
      select: "id",
      id: `eq.${patientId}`,
      clinic_id: `eq.${this.clinicId}`,
      limit: 1,
    });
    if (!rows[0]) throw new SupabaseRestError("Paciente no encontrado.", 404, {});
  }
  async list(patientId: string) {
    await this.assertPatient(patientId);
    const rows = await this.client.select<DiagnosisRow>("clinical_diagnoses", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      patient_id: `eq.${patientId}`,
      order: "created_at.desc,id.desc",
    });
    const current = new Map<string, ClinicalDiagnosis>();
    for (const row of rows)
      if (row.status === "active" && !current.has(row.category))
        current.set(row.category, map(row));
    return { current: [...current.values()], history: rows.map(map) };
  }
  async create(patientId: string, input: DiagnosisInput) {
    const valid = validateDiagnosis(input);
    await this.assertPatient(patientId);
    return map(
      await this.client.rpc<DiagnosisRow>("create_clinical_diagnosis", {
        p_patient_id: patientId,
        p_input: valid,
      }),
    );
  }
  async resolve(patientId: string, id: string, expectedVersion: number) {
    await this.assertPatient(patientId);
    return map(
      await this.client.rpc<DiagnosisRow>("resolve_clinical_diagnosis", {
        p_patient_id: patientId,
        p_id: id,
        p_expected_version: expectedVersion,
      }),
    );
  }
  async addToPlan(patientId: string, id: string, input: z.infer<typeof diagnosisPlanInputSchema>) {
    await this.assertPatient(patientId);
    const rows = await this.client.select<DiagnosisRow>("clinical_diagnoses", {
      select: "*",
      id: `eq.${id}`,
      clinic_id: `eq.${this.clinicId}`,
      patient_id: `eq.${patientId}`,
      status: "eq.active",
      limit: 1,
    });
    const diagnosis = rows[0];
    if (!diagnosis) throw new SupabaseRestError("Diagnóstico activo no encontrado.", 404, {});
    const available = treatmentSuggestions(
      diagnosis.value,
      input.residualPocketDepth === undefined
        ? {}
        : { residualPocketDepth: input.residualPocketDepth },
    );
    const items = input.selections.flatMap<{ code: string; quadrant: number | null }>(
      (selection) => {
        const option = available.find((s) => s.id === selection.id);
        if (!option) throw new SupabaseRestError("Tratamiento sugerido no válido.", 422, {});
        if (option.scope === "quadrant") {
          const quadrants = [...new Set(selection.quadrants ?? [])];
          if (!quadrants.length)
            throw new SupabaseRestError("Selecciona al menos un cuadrante.", 422, {});
          return quadrants.map((quadrant) => ({ code: option.code, quadrant }));
        }
        return [{ code: option.code, quadrant: null }];
      },
    );
    return this.client.rpc<{ added: number }>("add_diagnosis_plan_items", {
      p_patient_id: patientId,
      p_diagnosis_id: id,
      p_items: items,
      p_residual_pd: input.residualPocketDepth ?? null,
    });
  }
}
