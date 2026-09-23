import { z } from "zod";

import type { ApiClient } from "../client";
import {
  alternativeClassificationSchema,
  alternativeContextSchema,
  alternativeSetInputSchema,
  budgetFromPlanSchema,
  budgetSyncResultSchema,
  clinicalEncounterInputSchema,
  clinicalEncounterSchema,
  clinicalPlanItemSchema,
  clinicalPlanSchema,
  clinicalProblemInputSchema,
  clinicalReworkSchema,
  clinicalSyncStateSchema,
  clinicalWorkflowSchema,
  clinicalWorkflowRecordSchema,
  createOdontogramSnapshotSchema,
  createPlanItemSchema,
  endodonticAssessmentInputSchema,
  endodonticAssessmentSchema,
  endodonticPlanInputSchema,
  endodonticPlanResultSchema,
  missingToothAlternativeSchema,
  odontogramBatchResultSchema,
  odontogramBatchSchema,
  odontogramSchema,
  odontogramSnapshotSchema,
  periodontalExamInputSchema,
  periodontalExamSchema,
  periodontalMeasurementSchema,
  persistedPeriodontalMeasurementSchema,
  planDependencySchema,
  planItemStatusSchema,
  planSyncResultSchema,
  priorityOverrideSchema,
  recordPreferenceSchema,
  saveDentalEntityResultSchema,
  saveDentalEntitySchema,
  snapshotsSchema,
} from "../schemas/clinical";
import { encodeId, withQuery } from "./shared";

const looseEntitySchema = z.object({ id: z.string().min(1) }).passthrough();
const looseResultSchema = z.object({}).passthrough();

export function createClinicalResource(client: ApiClient) {
  return {
    plan: {
      get: (patientId: string) =>
        client.request(`/api/patients/${encodeId(patientId)}/clinical-plan`, clinicalPlanSchema),
      addItem: (patientId: string, payload: z.input<typeof createPlanItemSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/clinical-plan/items`,
          clinicalPlanItemSchema,
          createPlanItemSchema.parse(payload),
        ),
      setItemStatus: (itemId: string, payload: z.input<typeof planItemStatusSchema>) =>
        client.mutation(
          `/api/clinical-plan/items/${encodeId(itemId)}/status`,
          clinicalPlanItemSchema,
          planItemStatusSchema.parse(payload),
        ),
      overridePriority: (itemId: string, payload: z.input<typeof priorityOverrideSchema>) =>
        client.mutation(
          `/api/clinical-plan/items/${encodeId(itemId)}/priority-override`,
          clinicalPlanItemSchema,
          priorityOverrideSchema.parse(payload),
        ),
      rework: (itemId: string, payload: z.input<typeof clinicalReworkSchema>) =>
        client.mutation(
          `/api/clinical-plan/items/${encodeId(itemId)}/rework`,
          clinicalPlanItemSchema,
          clinicalReworkSchema.parse(payload),
        ),
      createMissingToothAlternatives: (
        patientId: string,
        payload: z.input<typeof missingToothAlternativeSchema>,
      ) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/clinical-plan/alternatives/missing-tooth`,
          looseEntitySchema,
          missingToothAlternativeSchema.parse(payload),
        ),
      createAlternatives: (patientId: string, payload: z.input<typeof alternativeSetInputSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/clinical-plan/alternatives`,
          looseEntitySchema,
          alternativeSetInputSchema.parse(payload),
        ),
      recordPreference: (patientId: string, payload: z.input<typeof recordPreferenceSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/clinical-plan/preferences`,
          looseEntitySchema,
          recordPreferenceSchema.parse(payload),
        ),
      approveAlternative: (optionId: string) =>
        client.mutation(
          `/api/clinical-plan/alternatives/${encodeId(optionId)}/approve`,
          looseResultSchema,
          {},
        ),
      addDependency: (planId: string, payload: z.input<typeof planDependencySchema>) =>
        client.mutation(
          `/api/clinical-plans/${encodeId(planId)}/dependencies`,
          looseEntitySchema,
          planDependencySchema.parse(payload),
        ),
      removeDependency: (planId: string, payload: z.input<typeof planDependencySchema>) =>
        client.mutation(
          withQuery(`/api/clinical-plans/${encodeId(planId)}/dependencies`, {
            itemId: payload.itemId,
            dependsOnId: payload.dependsOnId,
            reason: payload.reason,
          }),
          looseResultSchema,
          {},
          { method: "DELETE" },
        ),
      updateAlternativeContext: (
        setId: string,
        payload: z.input<typeof alternativeContextSchema>,
      ) =>
        client.mutation(
          `/api/clinical-plan/alternative-sets/${encodeId(setId)}/context`,
          looseEntitySchema,
          alternativeContextSchema.parse(payload),
          { method: "PATCH" },
        ),
      confirmClassification: (
        setId: string,
        payload: z.input<typeof alternativeClassificationSchema>,
      ) =>
        client.mutation(
          `/api/clinical-plan/alternative-sets/${encodeId(setId)}/classification`,
          looseEntitySchema,
          alternativeClassificationSchema.parse(payload),
        ),
      syncBudget: (patientId: string, payload: z.input<typeof budgetFromPlanSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/clinical-plan/budget`,
          looseEntitySchema,
          budgetFromPlanSchema.parse(payload),
        ),
    },
    odontogram: {
      get: (patientId: string) =>
        client.request(`/api/patients/${encodeId(patientId)}/odontogram`, odontogramSchema),
      entities: (patientId: string, payload: z.input<typeof saveDentalEntitySchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/odontogram/entities`,
          saveDentalEntityResultSchema,
          saveDentalEntitySchema.parse(payload),
        ),
      batch: (patientId: string, payload: z.input<typeof odontogramBatchSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/odontogram/batch`,
          odontogramBatchResultSchema,
          odontogramBatchSchema.parse(payload),
        ),
      periodontal: (patientId: string, measurement: z.input<typeof periodontalMeasurementSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/odontogram/periodontal`,
          persistedPeriodontalMeasurementSchema,
          periodontalMeasurementSchema.parse(measurement),
        ),
      snapshots: {
        list: (patientId: string) =>
          client.request(
            `/api/patients/${encodeId(patientId)}/odontogram/snapshots`,
            snapshotsSchema,
          ),
        create: (patientId: string, payload: z.input<typeof createOdontogramSnapshotSchema>) =>
          client.mutation(
            `/api/patients/${encodeId(patientId)}/odontogram/snapshots`,
            odontogramSnapshotSchema,
            createOdontogramSnapshotSchema.parse(payload),
          ),
      },
    },
    sync: {
      get: (patientId: string) =>
        client.request(
          `/api/patients/${encodeId(patientId)}/clinical-sync`,
          clinicalSyncStateSchema,
        ),
      plan: (patientId: string) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/clinical-sync/plan`,
          planSyncResultSchema,
          {},
        ),
      budget: (patientId: string) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/clinical-sync/budget`,
          budgetSyncResultSchema,
          {},
        ),
    },
    workflow: {
      get: (patientId: string) =>
        client.request(
          `/api/patients/${encodeId(patientId)}/clinical-workflow`,
          clinicalWorkflowSchema,
        ),
      createProblem: (patientId: string, payload: z.input<typeof clinicalProblemInputSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/clinical-workflow/problems`,
          clinicalWorkflowRecordSchema,
          clinicalProblemInputSchema.parse(payload),
        ),
      createEndodonticAssessment: (
        patientId: string,
        payload: z.input<typeof endodonticAssessmentInputSchema>,
      ) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/clinical-workflow/endodontics`,
          endodonticAssessmentSchema,
          endodonticAssessmentInputSchema.parse(payload),
        ),
      createPeriodontalExam: (
        patientId: string,
        payload: z.input<typeof periodontalExamInputSchema>,
      ) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/clinical-workflow/periodontal-exams`,
          periodontalExamSchema,
          periodontalExamInputSchema.parse(payload),
        ),
      createEncounter: (patientId: string, payload: z.input<typeof clinicalEncounterInputSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/clinical-workflow/encounters`,
          clinicalEncounterSchema,
          clinicalEncounterInputSchema.parse(payload),
        ),
      createEndodonticPlan: (
        patientId: string,
        payload: z.input<typeof endodonticPlanInputSchema>,
      ) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/clinical-workflow/endodontic-plan`,
          endodonticPlanResultSchema,
          endodonticPlanInputSchema.parse(payload),
        ),
    },
  } as const;
}
