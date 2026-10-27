import type { z } from "zod";

import type {
  RecallCandidateFilters,
  RecallTemplateInput,
  recallActionSchema,
  recallAssignSchema,
  recallBulkSchema,
  recallListFiltersSchema,
} from "@/shared/api/schemas/recalls";

import type { SupabaseRestClient } from "../supabase/rest-client";

type ListFilters = z.output<typeof recallListFiltersSchema>;

/** Recall centre RPCs. Permissions, idempotency and audit live in the database functions. */
export class RecallRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}

  list({ page, pageSize, ...filters }: ListFilters) {
    return this.client.rpc<unknown>("recall_list", {
      p_clinic_id: this.clinicId,
      p_filters: filters,
      p_page: page,
      p_page_size: pageSize,
    });
  }

  history(recallId: string) {
    return this.client.rpc<unknown>("recall_history", {
      p_clinic_id: this.clinicId,
      p_recall_id: recallId,
    });
  }

  apply(
    recallId: string,
    input: z.output<typeof recallActionSchema>,
    expectedVersion: number | null,
  ) {
    return this.client.rpc<unknown>("recall_update", {
      p_clinic_id: this.clinicId,
      p_recall_id: recallId,
      p_action: input.action,
      p_payload: input.payload,
      p_expected_version: expectedVersion,
    });
  }

  bulk(input: z.output<typeof recallBulkSchema>) {
    return this.client.rpc<unknown>("recall_bulk_update", {
      p_clinic_id: this.clinicId,
      p_recall_ids: input.ids,
      p_action: input.action,
      p_payload: input.payload,
    });
  }

  templates(includeArchived: boolean) {
    return this.client.rpc<unknown>("recall_templates_list", {
      p_clinic_id: this.clinicId,
      p_include_archived: includeArchived,
    });
  }

  createTemplate(template: RecallTemplateInput) {
    return this.client.rpc<unknown>("recall_template_save", {
      p_clinic_id: this.clinicId,
      p_template_id: null,
      p_payload: template,
    });
  }

  updateTemplate(
    templateId: string,
    template: RecallTemplateInput,
    expectedVersion: number,
    recomputePending: boolean,
  ) {
    return this.client.rpc<unknown>("recall_template_save", {
      p_clinic_id: this.clinicId,
      p_template_id: templateId,
      p_payload: { ...template, recomputePending },
      p_expected_version: expectedVersion,
    });
  }

  archiveTemplate(templateId: string, archive: boolean, reason: string | null) {
    return this.client.rpc<unknown>("recall_template_archive", {
      p_clinic_id: this.clinicId,
      p_template_id: templateId,
      p_archive: archive,
      p_reason: reason,
    });
  }

  candidates(filters: RecallCandidateFilters) {
    return this.client.rpc<unknown>("recall_candidates", {
      p_clinic_id: this.clinicId,
      p_filters: filters,
    });
  }

  assign(templateId: string, input: z.output<typeof recallAssignSchema>) {
    return this.client.rpc<unknown>("recall_assign_patients", {
      p_clinic_id: this.clinicId,
      p_template_id: templateId,
      p_patient_ids: input.patientIds,
      p_anchor_date: input.anchorDate,
      p_due_overrides: input.dueOverrides,
      p_idempotency_key: input.idempotencyKey,
      p_dry_run: input.dryRun,
    });
  }
}
