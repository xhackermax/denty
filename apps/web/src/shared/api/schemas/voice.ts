import { z } from "zod";

export const voiceCapabilitiesSchema = z.object({
  asrConfigured: z.boolean(),
  llmConfigured: z.boolean(),
  localNlu: z.boolean(),
});

export const transcribeVoiceSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
});

export const transcriptionSchema = z
  .object({
    text: z.string().min(1),
  })
  .passthrough();

export const voicePreviewSchema = z.object({
  text: z.string().min(1),
  context: z.record(z.string(), z.unknown()).default({}),
});

export const voicePreviewResultSchema = z
  .object({
    planToken: z.string().min(1),
    plan: z.unknown(),
  })
  .passthrough();

export const voiceExecuteSchema = z.object({
  planToken: z.string().min(1),
  confirmed: z.boolean(),
});

export const voiceExecuteResultSchema = z.object({}).passthrough();
