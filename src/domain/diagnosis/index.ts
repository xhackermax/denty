import { z } from "zod";
export const bruxismSigns = [
  "wear",
  "masseter_hypertrophy",
  "tmj_pain",
  "fractures",
  "linea_alba",
  "tongue_scalloping",
] as const;
const periodontalDetail = z
  .object({
    stage: z.enum(["I", "II", "III", "IV"]).optional(),
    grade: z.enum(["A", "B", "C"]).optional(),
    extent: z.enum(["localized", "generalized", "molar_incisor"]).optional(),
    gingivitisType: z.enum(["plaque_induced", "non_plaque"]).optional(),
    bopPct: z.number().min(0).max(100).optional(),
    sourceExamId: z.string().uuid().optional(),
  })
  .strict();
const common = {
  justification: z.string().trim().max(4000).default(""),
  encounterId: z.string().uuid().nullable().optional(),
};
export const diagnosisInputSchema = z
  .discriminatedUnion("category", [
    z
      .object({
        ...common,
        category: z.literal("periodontal"),
        value: z.enum(["healthy", "gingivitis", "periodontitis"]),
        detail: periodontalDetail.default({}),
      })
      .strict(),
    z
      .object({
        ...common,
        category: z.literal("bruxism"),
        value: z.enum(["bruxism", "no_bruxism"]),
        detail: z
          .object({
            type: z.enum(["awake", "sleep", "both"]).optional(),
            signs: z.array(z.enum(bruxismSigns)).default([]),
            certainty: z.enum(["possible", "probable", "definite"]).optional(),
          })
          .strict(),
      })
      .strict(),
  ])
  .superRefine((input, ctx) => {
    if (input.category === "periodontal") {
      if (input.value !== "healthy" && !input.justification)
        ctx.addIssue({
          code: "custom",
          path: ["justification"],
          message: "Escribe la justificación clínica.",
        });
      if (
        input.value !== "periodontitis" &&
        (input.detail.stage || input.detail.grade || input.detail.extent)
      )
        ctx.addIssue({
          code: "custom",
          path: ["detail"],
          message: "Estadio, grado y extensión solo corresponden a periodontitis.",
        });
      if (input.value !== "gingivitis" && input.detail.gingivitisType)
        ctx.addIssue({
          code: "custom",
          path: ["detail"],
          message: "Tipo de gingivitis no aplicable.",
        });
    } else if (input.value === "bruxism" && (!input.detail.type || !input.detail.certainty))
      ctx.addIssue({
        code: "custom",
        path: ["detail"],
        message: "Indica tipo y certeza del bruxismo.",
      });
  });
export type DiagnosisInput = z.infer<typeof diagnosisInputSchema>;
export function validateDiagnosis(input: unknown): DiagnosisInput {
  return diagnosisInputSchema.parse(input);
}
export { suggestPeriodontalDiagnosis } from "./classification-2017";
