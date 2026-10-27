import type { z } from "zod";

import type { ApiClient } from "../client";
import {
  recallActionRequestSchema,
  recallAssignResultSchema,
  recallAssignSchema,
  recallBulkResultSchema,
  recallBulkSchema,
  recallCandidateFiltersSchema,
  recallCandidatesSchema,
  recallHistorySchema,
  recallItemSchema,
  recallListFiltersSchema,
  recallListSchema,
  recallTemplateArchiveSchema,
  recallTemplateInputSchema,
  recallTemplateSchema,
  recallTemplatesSchema,
  recallTemplateUpdateSchema,
  type RecallListFilters,
} from "../schemas/recalls";
import { encodeId, withQuery } from "./shared";

/** Recall centre: recall types (templates) and the recalls assigned to patients. */
export function createRecallsResource(client: ApiClient) {
  return {
    list: (filters: RecallListFilters = {}) => {
      const parsed = recallListFiltersSchema.parse(filters);
      return client.request(
        withQuery("/api/recalls", { ...parsed, includeClosed: parsed.includeClosed || undefined }),
        recallListSchema,
      );
    },
    history: (recallId: string) =>
      client.request(`/api/recalls/${encodeId(recallId)}/history`, recallHistorySchema),
    act: (recallId: string, input: z.input<typeof recallActionRequestSchema>) =>
      client.mutation(
        `/api/recalls/${encodeId(recallId)}/actions`,
        recallItemSchema,
        recallActionRequestSchema.parse(input),
      ),
    bulk: (input: z.input<typeof recallBulkSchema>) =>
      client.mutation("/api/recalls/bulk", recallBulkResultSchema, recallBulkSchema.parse(input)),
    templates: (includeArchived = false) =>
      client.request(
        withQuery("/api/recalls/templates", { includeArchived: includeArchived || undefined }),
        recallTemplatesSchema,
      ),
    createTemplate: (input: z.input<typeof recallTemplateInputSchema>) =>
      client.mutation(
        "/api/recalls/templates",
        recallTemplateSchema,
        recallTemplateInputSchema.parse(input),
      ),
    updateTemplate: (templateId: string, input: z.input<typeof recallTemplateUpdateSchema>) =>
      client.mutation(
        `/api/recalls/templates/${encodeId(templateId)}`,
        recallTemplateSchema,
        recallTemplateUpdateSchema.parse(input),
        { method: "PUT" },
      ),
    archiveTemplate: (templateId: string, input: z.input<typeof recallTemplateArchiveSchema>) =>
      client.mutation(
        `/api/recalls/templates/${encodeId(templateId)}/archive`,
        recallTemplateSchema,
        recallTemplateArchiveSchema.parse(input),
      ),
    candidates: (filters: z.input<typeof recallCandidateFiltersSchema>) =>
      client.mutation(
        "/api/recalls/candidates",
        recallCandidatesSchema,
        recallCandidateFiltersSchema.parse(filters),
      ),
    assign: (templateId: string, input: z.input<typeof recallAssignSchema>) =>
      client.mutation(
        `/api/recalls/templates/${encodeId(templateId)}/assign`,
        recallAssignResultSchema,
        recallAssignSchema.parse(input),
      ),
  };
}
