import { z } from "zod";

import {
  COMPARISON_DECISIONS,
  type ArgumentOverride,
  type TreatmentComparisonContent,
} from "@/domain/plan";

// Same shapes the migration checks, so a bad request fails here with a readable message
// instead of as a database constraint.
const entryIdSchema = z.string().regex(/^[a-z]\.[a-z0-9-]+$/);
const phraseIdSchema = z.string().regex(/^[a-z]\.[a-z0-9-]+\.[A-Z][A-Za-z0-9-]*$/);

export const argumentOverrideSchema = z
  .object({
    phraseId: phraseIdSchema,
    entryId: entryIdSchema,
    kind: z.enum(["advantage", "disadvantage"]),
    text: z.string().trim().min(1).max(300).nullable(),
    hidden: z.boolean(),
    position: z.number().int().min(0).max(999).nullable(),
    custom: z.boolean(),
  })
  .refine((item) => item.phraseId.startsWith(`${item.entryId}.`), {
    message: "La frase no pertenece a ese tratamiento.",
  })
  .refine((item) => !item.custom || item.text !== null, {
    message: "Una frase propia necesita texto.",
  }) satisfies z.ZodType<ArgumentOverride>;

export const argumentOverridesSchema = z.object({ items: z.array(argumentOverrideSchema) });

export const saveArgumentOverridesSchema = z.object({
  items: z.array(argumentOverrideSchema).min(1).max(200),
});

export const restoreArgumentOverridesSchema = z.object({
  phraseIds: z.array(phraseIdSchema).min(1).max(200),
});

export const argumentOverrideHistorySchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      phraseId: z.string(),
      entryId: z.string(),
      action: z.enum(["SAVE", "RESTORE"]),
      text: z.string().nullable(),
      hidden: z.boolean(),
      changedBy: z.string().nullable(),
      changedAt: z.string(),
    }),
  ),
});

const treatmentLineSchema = z.object({
  description: z.string().min(1).max(500),
  tooth: z.string().max(10).nullable(),
  totalCents: z.number().int(),
});

export const treatmentComparisonContentSchema = z.object({
  options: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        label: z.string().min(1).max(40),
        title: z.string().min(1).max(200),
        code: z.string().max(60).nullable(),
        totalCents: z.number().int(),
        treatments: z.array(treatmentLineSchema).max(200),
        advantages: z.array(z.string().min(1).max(500)).max(60),
        disadvantages: z.array(z.string().min(1).max(500)).max(60),
      }),
    )
    .min(2)
    .max(8),
  common: z.array(treatmentLineSchema).max(200),
  consequences: z
    .array(
      z.object({
        id: z.string().min(1).max(20),
        decision: z.string().min(1).max(300),
        consequence: z.string().min(1).max(300),
      }),
    )
    .max(20),
}) satisfies z.ZodType<TreatmentComparisonContent>;

export const saveTreatmentComparisonSchema = z
  .object({
    seriesId: z.string().uuid().nullable(),
    decision: z.enum(COMPARISON_DECISIONS),
    chosenOptionId: z.string().min(1).max(100).nullable(),
    decisionNote: z.string().max(2000),
    catalogVersion: z.string().min(1).max(20),
    professionalName: z.string().trim().min(1).max(200),
    content: treatmentComparisonContentSchema,
  })
  .refine(
    (input) =>
      input.decision === "ACCEPTED"
        ? input.content.options.some((option) => option.id === input.chosenOptionId)
        : input.chosenOptionId === null,
    { message: "La opción elegida no coincide con la decisión.", path: ["chosenOptionId"] },
  );

export const treatmentComparisonSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  seriesId: z.string().min(1),
  version: z.number().int().positive(),
  decision: z.enum(COMPARISON_DECISIONS),
  chosenOptionId: z.string().nullable(),
  decisionNote: z.string(),
  catalogVersion: z.string(),
  professionalName: z.string(),
  content: treatmentComparisonContentSchema,
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export const treatmentComparisonsSchema = z.object({ items: z.array(treatmentComparisonSchema) });

export type TreatmentComparisonRecord = z.infer<typeof treatmentComparisonSchema>;
export type SaveTreatmentComparisonInput = z.infer<typeof saveTreatmentComparisonSchema>;
