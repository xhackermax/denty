import { z } from "zod";
import type { ApiClient } from "../client";
import { encodeId } from "./shared";
import {
  perioDraftSchema,
  perioDraftInputSchema,
  finishPerioDraftSchema,
  type PerioDraftData,
} from "../schemas/perio-drafts";
export function createPerioDraftsResource(client: ApiClient) {
  return {
    get: (id: string) =>
      client.request(`/api/patients/${encodeId(id)}/perio-draft`, perioDraftSchema.nullable()),
    save: (
      id: string,
      data: PerioDraftData,
      expectedVersion: number,
      expectedDraftId: string | null = null,
    ) =>
      client.mutation(
        `/api/patients/${encodeId(id)}/perio-draft`,
        perioDraftSchema,
        perioDraftInputSchema.parse({ data, expectedVersion, expectedDraftId }),
      ),
    finish: (id: string, expectedVersion: number, draftId: string) =>
      client.mutation(
        `/api/patients/${encodeId(id)}/perio-draft/finish`,
        z.object({ examId: z.string() }),
        finishPerioDraftSchema.parse({ expectedVersion, draftId }),
      ),
  };
}
