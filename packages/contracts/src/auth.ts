import { z } from "zod";
export const loginRequestSchema=z.object({identifier:z.string().min(1),password:z.string().min(1),deviceLabel:z.string().max(120).optional()});
export const pinLoginRequestSchema=z.object({identifier:z.string().min(1),pin:z.string().regex(/^\d{6,}$/)});
export type LoginRequest=z.infer<typeof loginRequestSchema>;
