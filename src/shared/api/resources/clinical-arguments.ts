import { z } from "zod";

import type { ApiClient } from "../client";
import {
  argumentOverrideHistorySchema,
  argumentOverridesSchema,
  restoreArgumentOverridesSchema,
  saveArgumentOverridesSchema,
  saveTreatmentComparisonSchema,
  treatmentComparisonSchema,
  treatmentComparisonsSchema,
} from "../schemas/clinical-arguments";
import { encodeId, withQuery } from "./shared";

const countSchema = z.object({ count: z.number().int().nonnegative() });

/** The clinic's phrase library and the patient comparisons built from it. */
export function createClinicalArgumentsResource(client: ApiClient) {
  return {
    overrides: () => client.request("/api/admin/clinical-arguments", argumentOverridesSchema),
    save: (input: z.input<typeof saveArgumentOverridesSchema>) =>
      client.mutation(
        "/api/admin/clinical-arguments",
        countSchema,
        saveArgumentOverridesSchema.parse(input),
        {
          method: "PUT",
        },
      ),
    restore: (input: z.input<typeof restoreArgumentOverridesSchema>) =>
      client.mutation(
        "/api/admin/clinical-arguments/restore",
        countSchema,
        restoreArgumentOverridesSchema.parse(input),
      ),
    history: (entryId: string) =>
      client.request(
        withQuery("/api/admin/clinical-arguments/history", { entryId }),
        argumentOverrideHistorySchema,
      ),
    comparisons: (patientId: string) =>
      client.request(
        `/api/patients/${encodeId(patientId)}/treatment-comparisons`,
        treatmentComparisonsSchema,
      ),
    saveComparison: (patientId: string, input: z.input<typeof saveTreatmentComparisonSchema>) =>
      client.mutation(
        `/api/patients/${encodeId(patientId)}/treatment-comparisons`,
        treatmentComparisonSchema,
        saveTreatmentComparisonSchema.parse(input),
      ),
  };
}
