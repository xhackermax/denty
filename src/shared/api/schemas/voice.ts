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

export const voiceInterpretSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  pathname: z.string().max(300).optional(),
  selectedTooth: z
    .string()
    .regex(/^[1-8][1-8]$/)
    .optional(),
});

/** Actions are validated server-side against Denty's tools; the client re-checks executability. */
export const voiceInterpretResultSchema = z.object({
  source: z.literal("claude"),
  actions: z.array(z.object({ type: z.string().min(1) }).passthrough()),
  ambiguities: z.array(z.string()),
});

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
