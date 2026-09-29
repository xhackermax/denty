import { z } from "zod";

import type { ApiClient } from "../client";
import {
  transcribeVoiceSchema,
  transcriptionSchema,
  voiceCapabilitiesSchema,
  voiceExecuteResultSchema,
  voiceExecuteSchema,
  voiceInterpretResultSchema,
  voiceInterpretSchema,
  voicePreviewResultSchema,
  voicePreviewSchema,
} from "../schemas/voice";

export function createVoiceResource(client: ApiClient) {
  return {
    capabilities: () => client.request("/api/voice/capabilities", voiceCapabilitiesSchema),
    transcribe: (payload: z.input<typeof transcribeVoiceSchema>) =>
      client.mutation(
        "/api/voice/transcribe",
        transcriptionSchema,
        transcribeVoiceSchema.parse(payload),
      ),
    interpret: (payload: z.input<typeof voiceInterpretSchema>) =>
      client.mutation(
        "/api/voice/interpret",
        voiceInterpretResultSchema,
        voiceInterpretSchema.parse(payload),
      ),
    preview: (payload: z.input<typeof voicePreviewSchema>) =>
      client.mutation(
        "/api/voice/preview",
        voicePreviewResultSchema,
        voicePreviewSchema.parse(payload),
      ),
    execute: (payload: z.input<typeof voiceExecuteSchema>) =>
      client.mutation(
        "/api/voice/execute",
        voiceExecuteResultSchema,
        voiceExecuteSchema.parse(payload),
      ),
  } as const;
}
