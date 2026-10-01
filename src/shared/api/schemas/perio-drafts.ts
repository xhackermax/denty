import { z } from "zod";
const tooth = z
  .string()
  .regex(/^[1-8][1-8]$/)
  .refine((t) => Number(t[0]) < 5 || Number(t[1]) <= 5);
const site = z.object({
  pd: z.number().int().min(0).max(15).nullable(),
  gm: z.number().int().min(-15).max(5).nullable(),
  bop: z.boolean(),
  plaque: z.boolean(),
  suppuration: z.boolean(),
});
const grade = z.number().int().min(0).max(3);
export const perioExamDataSchema = z.object({
  teeth: z.record(
    tooth,
    z.object({
      missing: z.boolean(),
      implant: z.boolean(),
      mobility: grade.nullable(),
      furcation: z
        .object({
          b: grade.optional(),
          l: grade.optional(),
          m: grade.optional(),
          d: grade.optional(),
        })
        .transform(
          (value) =>
            Object.fromEntries(Object.entries(value).filter(([, n]) => n !== undefined)) as Partial<
              Record<"b" | "l" | "m" | "d", number>
            >,
        ),
      sites: z.object({ MV: site, V: site, DV: site, MP: site, "P/L": site, DP: site }),
    }),
  ),
});
export const perioCursorSchema = z.object({
  tooth: z.string(),
  face: z.enum(["vestibular", "palatal", "lingual"]),
  field: z.enum(["pd", "gm"]),
  finished: z.boolean(),
});
export const perioDraftDataSchema = z.object({
  order: z.enum(["clinical", "vestibular_first"]).default("clinical"),
  exam: perioExamDataSchema,
  cursor: perioCursorSchema,
  lastTriplet: perioCursorSchema.nullable(),
});
export const perioDraftInputSchema = z.object({
  expectedDraftId: z.uuid().nullable().default(null),
  expectedVersion: z.number().int().nonnegative(),
  data: perioDraftDataSchema,
});
export const perioDraftSchema = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
  data: perioDraftDataSchema,
  updatedAt: z.string(),
});
export const finishPerioDraftSchema = z.object({
  draftId: z.uuid(),
  expectedVersion: z.number().int().positive(),
});
export type PerioDraftData = z.infer<typeof perioDraftDataSchema>;

export type PerioDraft = z.infer<typeof perioDraftSchema>;
