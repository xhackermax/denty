import { z } from "zod";
import { DENTAL_ENTITY_TYPES } from "@/domain/odontogram";

import { idSchema, versionSchema } from "../contracts";

export const createPlanItemSchema = z.object({
  tooth: z.string().optional(),
  treatmentCatalogId: idSchema.optional(),
  treatmentCode: z.string().min(1),
  label: z.string().min(1),
  patientLabel: z.string().optional(),
  clinicalReason: z.string().optional(),
  phase: z.number().int().min(1).max(5).optional(),
  priority: z.number().int().default(0),
  durationMin: z.number().int().positive().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  dependsOnIds: z.array(idSchema).default([]),
  adHoc: z.boolean().default(false),
});

export const clinicalPlanItemSchema = z
  .object({
    id: idSchema,
    tooth: z.string().nullable().optional(),
    treatmentCatalogId: idSchema.nullable().optional(),
    treatmentCode: z.string().min(1),
    label: z.string().min(1),
    patientLabel: z.string().nullable().optional(),
    clinicalReason: z.string().nullable().optional(),
    diagnosisId: idSchema.nullable().optional(),
    phase: z.number().int().min(1).max(5),
    priority: z.number().int(),
    status: z.string().min(1),
    priceCents: z.number().int().nonnegative().nullable().optional(),
    costCents: z.number().int().nonnegative().nullable().optional(),
    adHoc: z.boolean().optional(),
    version: versionSchema.optional(),
  })
  .passthrough();

export const clinicalPlanDependencyRecordSchema = z
  .object({
    id: idSchema.optional(),
    itemId: idSchema,
    dependsOnId: idSchema,
    reason: z.string().nullable().optional(),
  })
  .passthrough();

export const clinicalBudgetItemSchema = z
  .object({
    id: idSchema,
    clinicalPlanItemId: idSchema.nullable().optional(),
    description: z.string().min(1),
    tooth: z.string().nullable().optional(),
    unitPriceCents: z.number().int(),
    totalCents: z.number().int(),
  })
  .passthrough();

export const clinicalBudgetSchema = z
  .object({
    id: idSchema,
    code: z.string().min(1),
    status: z.string().min(1),
    totalCents: z.number().int(),
    version: versionSchema.optional(),
    signedFingerprint: z.string().nullable().optional(),
    currentPlanFingerprint: z.string().nullable().optional(),
    items: z.array(clinicalBudgetItemSchema).default([]),
  })
  .passthrough();

export const clinicalPlanSchema = z
  .object({
    id: idSchema,
    patientId: idSchema,
    status: z.string().optional(),
    version: versionSchema.optional(),
    items: z.array(clinicalPlanItemSchema).default([]),
    dependencies: z.array(clinicalPlanDependencyRecordSchema).default([]),
    route: z.array(clinicalPlanItemSchema).default([]),
    budgets: z.array(clinicalBudgetSchema).default([]),
  })
  .passthrough();

export const planItemStatusSchema = z.object({
  status: z.string().min(1),
});

export const priorityOverrideSchema = z.object({
  priority: z.number().int(),
  phase: z.number().int().min(1).max(5).optional(),
  reason: z.string().min(1),
});

export const clinicalReworkSchema = z.object({
  reason: z.string().min(1),
  expectedCostCents: z.number().int().nonnegative().optional(),
});

export const alternativeSetInputSchema = z.object({
  kind: z.string().min(1),
  toothOrZone: z.string().min(1),
  availableData: z.array(z.string()).default([]),
  missingTeeth: z.array(z.string()).default([]),
});

export const missingToothAlternativeSchema = z.object({
  toothOrZone: z.string().min(1),
  availableData: z.array(z.string()).default([]),
});

export const recordPreferenceSchema = z.object({
  optionId: idSchema,
  preference: z.enum(["INTERESTED", "PREFERRED", "NOT_INTERESTED", "DISCUSS"]),
  note: z.string().max(1000).optional(),
});

export const planDependencySchema = z.object({
  itemId: idSchema,
  dependsOnId: idSchema,
  reason: z.string().optional(),
});

export const alternativeContextSchema = z.object({
  availableData: z.array(z.string()).default([]),
});

export const alternativeClassificationSchema = z.object({
  classification: z.string().min(1),
});

export const budgetFromPlanSchema = z.object({
  clinicalPlanItemIds: z.array(idSchema).optional(),
});

// FDI notation: permanent 11–48 and primary 51–85, written exactly as two digits.
const fdiToothSchema = z.string().regex(/^(?:[1-4][1-8]|[5-8][1-5])$/, "Diente FDI no válido");
// Statuses are an open clinical vocabulary (each panel adds its own), so only their shape is
// checked here: rejecting an unknown word would make a chart holding it impossible to save.
const clinicalStatusSchema = z
  .string()
  .max(80)
  .regex(/^[a-z][a-z0-9_]*$/, "Estado clínico no válido");

export const dentalEntitySchema = z.object({
  id: idSchema.optional(),
  tooth: fdiToothSchema.optional(),
  arch: z.enum(["upper", "lower"]).optional(),
  entityType: z.enum(DENTAL_ENTITY_TYPES),
  status: clinicalStatusSchema,
  surfaces: z.array(z.enum(["V", "M", "O", "I", "D", "P", "L"])).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  parentId: idSchema.optional(),
  active: z.boolean().default(true),
});

export const implantPlanComponentSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  quantity: z.number().int().positive(),
  tooth: z.string().optional(),
  billable: z.boolean(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const plannedImplantSchema = z.object({
  id: idSchema,
  tooth: z.string().min(1),
  design: z.enum([
    "UNIT_TIBASE",
    "MULTIUNIT_FIXED",
    "DIRECT_SCREWED",
    "BAR_OVERDENTURE",
    "LOCATOR_OVERDENTURE",
    "HYBRID_ALL_ON_X",
    "CUSTOM",
  ]),
  implant: dentalEntitySchema,
  components: z.array(implantPlanComponentSchema),
});

export const persistedDentalEntitySchema = z
  .object({
    id: idSchema,
    tooth: z.string().nullable().optional(),
    arch: z.string().nullable().optional(),
    entityType: z.string().min(1),
    status: z.string().min(1),
    surfacesJson: z.array(z.string()).nullable().optional(),
    attributesJson: z.record(z.string(), z.unknown()).nullable().optional(),
    parentId: idSchema.nullable().optional(),
    active: z.boolean(),
    version: versionSchema,
  })
  .passthrough();

export const saveDentalEntitySchema = z.object({
  expectedVersion: versionSchema,
  entity: dentalEntitySchema,
});

export const saveDentalEntityResultSchema = z.object({
  entity: persistedDentalEntitySchema,
  version: versionSchema,
});

export const odontogramBatchSchema = z.object({
  expectedVersion: versionSchema,
  // The batch replaces the whole chart, so an empty list is how the last finding is removed.
  entities: z.array(dentalEntitySchema).superRefine((entities, context) => {
    const seen = new Set<string>();
    for (const [index, entity] of entities.entries()) {
      if (entity.id === undefined) continue;
      if (seen.has(entity.id)) {
        context.addIssue({ code: "custom", path: [index, "id"], message: "Id repetido" });
      }
      seen.add(entity.id);
    }
  }),
});

export const odontogramBatchResultSchema = z.object({
  entities: z.array(persistedDentalEntitySchema),
  version: versionSchema,
});

// The same limits validatePeriodontalReading enforces in the chart (program contract, in mm).
const probingDepthSchema = z.number().int().min(0).max(15);
const recessionSchema = z.number().int().min(-5).max(15);
const gradeSchema = z.number().int().min(0).max(3);

export const periodontalMeasurementSchema = z
  .object({
    tooth: z.string().min(1),
    site: z.string().min(1),
    probingDepth: probingDepthSchema.optional(),
    recession: recessionSchema.optional(),
    bleeding: z.boolean().optional(),
    plaque: z.boolean().optional(),
    suppuration: z.boolean().optional(),
    mobility: gradeSchema.optional(),
    furcation: gradeSchema.optional(),
  })
  .passthrough();

export const persistedPeriodontalMeasurementSchema = periodontalMeasurementSchema
  .extend({
    id: idSchema,
    measuredAt: z.coerce.string(),
  })
  .passthrough();

const odontogramSnapshotRecordSchema = z
  .object({
    id: idSchema,
    label: z.string().nullable().optional(),
    payloadJson: z.unknown(),
    createdAt: z.coerce.string(),
    version: versionSchema.default(0),
    entities: z.array(persistedDentalEntitySchema).default([]),
    periodontal: z.array(persistedPeriodontalMeasurementSchema).default([]),
  })
  .passthrough();

export const odontogramSnapshotSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  const payload = record.payloadJson;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return value;
  const payloadRecord = payload as Record<string, unknown>;
  return {
    ...record,
    version: record.version ?? payloadRecord.version ?? 0,
    entities: record.entities ?? payloadRecord.entities ?? [],
    periodontal: record.periodontal ?? payloadRecord.periodontal ?? [],
  };
}, odontogramSnapshotRecordSchema);

export const createOdontogramSnapshotSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
});

export const odontogramSchema = z
  .object({
    id: idSchema,
    patientId: idSchema,
    version: versionSchema,
    entities: z.array(persistedDentalEntitySchema).default([]),
    periodontal: z.array(persistedPeriodontalMeasurementSchema).default([]),
    snapshots: z.array(odontogramSnapshotSchema).default([]),
  })
  .passthrough();

export const snapshotsSchema = z.object({
  items: z.array(odontogramSnapshotSchema),
  currentVersion: versionSchema,
});

export const consentRequirementSchema = z
  .object({
    id: idSchema,
    clinicalPlanItemId: idSchema.nullable().optional(),
    consentCode: z.string().min(1),
    status: z.string().min(1),
    requiredBefore: z.string().min(1),
    templateId: idSchema.nullable().optional(),
    satisfiedByDocumentId: idSchema.nullable().optional(),
    ruleVersion: z.number().int().positive(),
  })
  .passthrough();

export const consentRequirementsSchema = z.object({
  items: z.array(consentRequirementSchema),
});

export const clinicalSyncStateSchema = z.object({
  patientId: idSchema,
  odontogram: z.object({
    version: versionSchema,
    updatedAt: z.coerce.string(),
    historyCount: z.number().int().nonnegative(),
    suggestionCount: z.number().int().nonnegative(),
  }),
  plan: z.object({
    version: versionSchema,
    sourceOdontogramVersion: versionSchema.nullable(),
    outdated: z.boolean(),
    itemCount: z.number().int().nonnegative(),
  }),
  budget: z
    .object({
      id: idSchema,
      code: z.string().min(1),
      status: z.string().min(1),
      totalCents: z.number().int(),
      sourcePlanVersion: versionSchema.nullable(),
      version: versionSchema.optional(),
      outdated: z.boolean(),
    })
    .nullable(),
  nextAction: z.enum(["SYNC_PLAN", "SYNC_BUDGET", "READY"]),
});

export const planItemPriceSchema = z.object({ priceCents: z.number().int().nonnegative() });

export const planSyncResultSchema = z.object({
  plan: z
    .object({
      id: idSchema,
      version: versionSchema.optional(),
      items: z.array(clinicalPlanItemSchema).default([]),
    })
    .nullable(),
  summary: z.object({
    updated: z.number().int().nonnegative(),
    added: z.number().int().nonnegative(),
    superseded: z.number().int().nonnegative(),
    coveredByExisting: z.number().int().nonnegative(),
    /** Items added by hand that were matched to an odontogram finding. */
    linked: z.number().int().nonnegative().default(0),
    /** Items whose treatment is now marked as done on the odontogram. */
    completed: z.number().int().nonnegative().default(0),
  }),
  sync: clinicalSyncStateSchema,
});

export const budgetSyncResultSchema = z.object({
  budget: clinicalBudgetSchema,
  sync: clinicalSyncStateSchema,
});

export const clinicalProblemSchema = z
  .object({
    id: idSchema,
    tooth: z.string().nullable().optional(),
    title: z.string().min(1),
    status: z.string().min(1),
  })
  .passthrough();

export const endodonticAssessmentSchema = z
  .object({
    id: idSchema,
    tooth: z.string().min(1),
    pulpalDiagnosis: z.string().nullable().optional(),
    apicalDiagnosis: z.string().nullable().optional(),
    diagnosticSystem: z.string().nullable().optional(),
    diagnosticVersion: z.string().nullable().optional(),
    confidence: z.string().nullable().optional(),
    createdAt: z.coerce.string().optional(),
  })
  .passthrough();

export const periodontalExamSchema = z
  .object({
    metadata: z.record(z.string(), z.unknown()).optional(),
    id: idSchema,
    title: z.string().min(1),
    measuredAt: z.coerce.string(),
    summaryJson: z.record(z.string(), z.unknown()),
    diagnosis: z.string().nullable().optional(),
    stage: z.string().nullable().optional(),
    grade: z.string().nullable().optional(),
    extent: z.string().nullable().optional(),
    version: versionSchema.optional(),
    sites: z
      .array(
        z
          .object({
            tooth: z.string().min(1),
            site: z.string().min(1),
            probingDepth: z.number().int().nonnegative().optional(),
            recession: z.number().int().optional(),
            mobility: z.number().int().nonnegative().optional(),
            furcation: z.number().int().nonnegative().optional(),
            bleeding: z.boolean().optional(),
            plaque: z.boolean().optional(),
            suppuration: z.boolean().optional(),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

export const clinicalEncounterSchema = z
  .object({
    id: idSchema,
    narrativeNote: z.string().min(1),
    signedAt: z.coerce.string().nullable().optional(),
    createdAt: z.coerce.string().optional(),
  })
  .passthrough();

export const clinicalWorkflowSchema = z.object({
  problems: z.array(clinicalProblemSchema).default([]),
  endodonticAssessments: z.array(endodonticAssessmentSchema).default([]),
  periodontalExams: z.array(periodontalExamSchema).default([]),
  encounters: z.array(clinicalEncounterSchema).default([]),
});

export const clinicalProblemInputSchema = z.object({
  tooth: z.string().optional(),
  zone: z.string().optional(),
  category: z.string().optional(),
  title: z.string().optional(),
  status: z.string().optional(),
  diagnosisSystem: z.string().optional(),
  diagnosisVersion: z.string().optional(),
  pulpalDiagnosis: z.string().optional(),
  apicalDiagnosis: z.string().optional(),
  periodontalDiagnosis: z.string().optional(),
  diagnosisDetail: z.record(z.string(), z.unknown()).optional(),
  prognosis: z.record(z.string(), z.unknown()).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  confirm: z.boolean().optional(),
});

export const endodonticAssessmentInputSchema = z.object({
  tooth: z.string().min(1),
  problemId: idSchema.optional(),
  chiefComplaint: z.string().optional(),
  symptoms: z.record(z.string(), z.unknown()).optional(),
  hardTissue: z.record(z.string(), z.unknown()).optional(),
  periodontalScreen: z.record(z.string(), z.unknown()).optional(),
  sensibilityTests: z.record(z.string(), z.unknown()).optional(),
  apicalTests: z.record(z.string(), z.unknown()).optional(),
  radiology: z.record(z.string(), z.unknown()).optional(),
  differential: z.array(z.unknown()).optional(),
  pulpalDiagnosis: z.string().optional(),
  apicalDiagnosis: z.string().optional(),
  diagnosticSystem: z.string().optional(),
  diagnosticVersion: z.string().optional(),
  confidence: z.string().optional(),
  complexity: z.record(z.string(), z.unknown()).optional(),
  prognosis: z.record(z.string(), z.unknown()).optional(),
  confirm: z.boolean().optional(),
});

export const periodontalExamSiteSchema = z.object({
  tooth: z.string().min(1),
  site: z.string().min(1),
  probingDepth: probingDepthSchema.optional(),
  recession: recessionSchema.optional(),
  mobility: gradeSchema.optional(),
  furcation: gradeSchema.optional(),
  bleeding: z.boolean().optional(),
  plaque: z.boolean().optional(),
  suppuration: z.boolean().optional(),
});

export const periodontalExamInputSchema = z.object({
  title: z.string().optional(),
  measuredAt: z.string().datetime({ offset: true }).optional(),
  sites: z.array(periodontalExamSiteSchema).min(1),
  diagnosis: z.string().optional(),
  stage: z.string().optional(),
  grade: z.string().optional(),
  extent: z.string().optional(),
  risk: z.record(z.string(), z.unknown()).optional(),
});

export const clinicalEncounterInputSchema = z.object({
  appointmentId: idSchema.optional(),
  reason: z.string().optional(),
  subjective: z.record(z.string(), z.unknown()).optional(),
  objective: z.record(z.string(), z.unknown()).optional(),
  diagnoses: z.array(z.unknown()).optional(),
  procedures: z.array(z.unknown()).optional(),
  technical: z.record(z.string(), z.unknown()).optional(),
  incidents: z.record(z.string(), z.unknown()).optional(),
  incidentText: z.string().optional(),
  instructions: z.string().optional(),
  nextVisit: z.string().optional(),
  narrativeNote: z.string().optional(),
  problemIds: z.array(idSchema).optional(),
  sign: z.boolean().optional(),
});

export const endodonticPlanInputSchema = z.object({
  tooth: z.string().min(1),
  reason: z.string().optional(),
  assessmentId: idSchema.optional(),
  includeCrown: z.boolean().optional(),
});

export const clinicalWorkflowRecordSchema = z.object({ id: idSchema }).passthrough();
export const endodonticPlanResultSchema = z.object({
  items: z.array(clinicalPlanItemSchema),
});

export type PersistedDentalEntity = z.infer<typeof persistedDentalEntitySchema>;
export type PersistedPeriodontalMeasurement = z.infer<typeof persistedPeriodontalMeasurementSchema>;
export type OdontogramSnapshot = z.infer<typeof odontogramSnapshotSchema>;
export type CreateOdontogramSnapshot = z.input<typeof createOdontogramSnapshotSchema>;
export type PeriodontalMeasurementInput = z.input<typeof periodontalMeasurementSchema>;
export type OdontogramRecord = z.infer<typeof odontogramSchema>;
export type ClinicalPlan = z.infer<typeof clinicalPlanSchema>;
export type ClinicalSyncState = z.infer<typeof clinicalSyncStateSchema>;
export type ClinicalWorkflow = z.infer<typeof clinicalWorkflowSchema>;
export type ClinicalProblemInput = z.input<typeof clinicalProblemInputSchema>;
export type ClinicalEncounterInput = z.input<typeof clinicalEncounterInputSchema>;
export type EndodonticAssessmentInput = z.input<typeof endodonticAssessmentInputSchema>;
export type PeriodontalExamInput = z.input<typeof periodontalExamInputSchema>;
export type EndodonticPlanInput = z.input<typeof endodonticPlanInputSchema>;
