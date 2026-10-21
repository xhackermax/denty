import type { ArgumentOverride } from "@/domain/plan";
import type {
  SaveTreatmentComparisonInput,
  TreatmentComparisonRecord,
} from "@/shared/api/schemas/clinical-arguments";

import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";

interface OverrideRow {
  phrase_id: string;
  entry_id: string;
  kind: ArgumentOverride["kind"];
  text: string | null;
  hidden: boolean;
  position: number | null;
  custom: boolean;
}

interface HistoryRow {
  id: string;
  phrase_id: string;
  entry_id: string;
  action: "SAVE" | "RESTORE";
  before: Partial<OverrideRow> | null;
  after: Partial<OverrideRow> | null;
  changed_by: string | null;
  changed_at: string;
}

interface ComparisonRow {
  id: string;
  patient_id: string;
  series_id: string;
  version: number;
  decision: TreatmentComparisonRecord["decision"];
  chosen_option_id: string | null;
  decision_note: string;
  catalog_version: string;
  professional_name: string;
  content: TreatmentComparisonRecord["content"];
  created_by: string | null;
  created_at: string;
}

const override = (row: OverrideRow): ArgumentOverride => ({
  phraseId: row.phrase_id,
  entryId: row.entry_id,
  kind: row.kind,
  text: row.text,
  hidden: row.hidden,
  position: row.position,
  custom: row.custom,
});

const comparison = (row: ComparisonRow): TreatmentComparisonRecord => ({
  id: row.id,
  patientId: row.patient_id,
  seriesId: row.series_id,
  version: row.version,
  decision: row.decision,
  chosenOptionId: row.chosen_option_id,
  decisionNote: row.decision_note,
  catalogVersion: row.catalog_version,
  professionalName: row.professional_name,
  content: row.content,
  createdBy: row.created_by,
  createdAt: row.created_at,
});

/**
 * Clinic phrase library and patient comparison snapshots. Writes go through RPCs that keep
 * RLS on (security invoker), so the clinic and role checks live in one place: the database.
 */
export class ClinicalArgumentsRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}

  async overrides() {
    const rows = await this.client.select<OverrideRow>("clinical_argument_overrides", {
      select: "phrase_id,entry_id,kind,text,hidden,position,custom",
      clinic_id: `eq.${this.clinicId}`,
      order: "entry_id.asc,phrase_id.asc",
    });
    return { items: rows.map(override) };
  }

  async save(items: readonly ArgumentOverride[]) {
    const count = await this.client.rpc<number>("save_argument_overrides", {
      p_clinic_id: this.clinicId,
      p_overrides: items,
    });
    return { count };
  }

  async restore(phraseIds: readonly string[]) {
    const count = await this.client.rpc<number>("restore_argument_overrides", {
      p_clinic_id: this.clinicId,
      p_phrase_ids: phraseIds,
    });
    return { count };
  }

  async history(entryId: string) {
    const rows = await this.client.select<HistoryRow>("clinical_argument_override_history", {
      select: "id,phrase_id,entry_id,action,before,after,changed_by,changed_at",
      clinic_id: `eq.${this.clinicId}`,
      entry_id: `eq.${entryId}`,
      order: "changed_at.desc",
      limit: 100,
    });
    return {
      items: rows.map((row) => {
        // A restore has no "after": show what was removed so the entry still reads clearly.
        const state = row.after ?? row.before ?? {};
        return {
          id: row.id,
          phraseId: row.phrase_id,
          entryId: row.entry_id,
          action: row.action,
          text: state.text ?? null,
          hidden: state.hidden ?? false,
          changedBy: row.changed_by,
          changedAt: row.changed_at,
        };
      }),
    };
  }

  private async assertPatient(patientId: string) {
    const rows = await this.client.select<{ id: string }>("patients", {
      select: "id",
      id: `eq.${patientId}`,
      clinic_id: `eq.${this.clinicId}`,
      limit: 1,
    });
    if (!rows[0]) throw new SupabaseRestError("Paciente no encontrado.", 404, {});
  }

  async comparisons(patientId: string) {
    await this.assertPatient(patientId);
    const rows = await this.client.select<ComparisonRow>("patient_treatment_comparisons", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      patient_id: `eq.${patientId}`,
      order: "created_at.desc,version.desc",
    });
    return { items: rows.map(comparison) };
  }

  async saveComparison(patientId: string, input: SaveTreatmentComparisonInput) {
    await this.assertPatient(patientId);
    const { seriesId, ...rest } = input;
    return comparison(
      await this.client.rpc<ComparisonRow>("save_treatment_comparison", {
        p_patient_id: patientId,
        p_series_id: seriesId,
        p_input: rest,
      }),
    );
  }
}
