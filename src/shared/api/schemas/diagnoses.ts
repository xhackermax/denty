import { z } from "zod";
import { diagnosisInputSchema } from "@/domain/diagnosis";
export { diagnosisInputSchema };
export const diagnosisSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  clinicId: z.string().min(1),
  category: z.enum(["periodontal", "bruxism"]),
  value: z.string(),
  detail: z.record(z.string(), z.unknown()),
  justification: z.string(),
  status: z.enum(["active", "resolved"]),
  createdAt: z.string(),
  createdBy: z.string().nullable(),
  encounterId: z.string().nullable(),
  version: z.number().int().positive(),
});
export type ClinicalDiagnosis = z.infer<typeof diagnosisSchema>;
export const diagnosesSchema = z.object({
  current: z.array(diagnosisSchema),
  history: z.array(diagnosisSchema),
});
export const resolveDiagnosisSchema = z.object({ expectedVersion: z.number().int().positive() });
export const diagnosisPlanInputSchema = z.object({
  selections: z
    .array(
      z.object({
        id: z.string().min(1),
        quadrants: z.array(z.number().int().min(1).max(4)).max(4).optional(),
      }),
    )
    .min(1)
    .max(12),
  residualPocketDepth: z.number().int().min(0).max(15).optional(),
});
