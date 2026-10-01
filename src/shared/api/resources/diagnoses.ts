import { z } from "zod";
import type { ApiClient } from "../client";
import {
  diagnosisInputSchema,
  diagnosisSchema,
  diagnosesSchema,
  resolveDiagnosisSchema,
  diagnosisPlanInputSchema,
} from "../schemas/diagnoses";
import { encodeId } from "./shared";
export function createDiagnosesResource(client: ApiClient) {
  return {
    list: (patientId: string) =>
      client.request(`/api/patients/${encodeId(patientId)}/diagnoses`, diagnosesSchema),
    create: (patientId: string, input: z.input<typeof diagnosisInputSchema>) =>
      client.mutation(
        `/api/patients/${encodeId(patientId)}/diagnoses`,
        diagnosisSchema,
        diagnosisInputSchema.parse(input),
      ),
    resolve: (patientId: string, id: string, expectedVersion: number) =>
      client.mutation(
        `/api/patients/${encodeId(patientId)}/diagnoses/${encodeId(id)}/resolve`,
        diagnosisSchema,
        resolveDiagnosisSchema.parse({ expectedVersion }),
      ),
    addToPlan: (patientId: string, id: string, input: z.input<typeof diagnosisPlanInputSchema>) =>
      client.mutation(
        `/api/patients/${encodeId(patientId)}/diagnoses/${encodeId(id)}/plan`,
        z.object({ added: z.number().int().nonnegative() }),
        diagnosisPlanInputSchema.parse(input),
      ),
  };
}
