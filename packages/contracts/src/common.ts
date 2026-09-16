import { z } from "zod";

export const isoDateTimeSchema = z.string().datetime();

export const versionSchema = z.number().int().positive();

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    correlationId: z.string().min(1),
  }),
});

export function pageSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().min(0),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
}

export type ApiError = z.infer<typeof apiErrorSchema>;
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
