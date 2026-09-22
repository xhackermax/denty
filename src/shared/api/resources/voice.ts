import { z } from "zod";

import type { ApiClient } from "../client";
import {
  transcribeVoiceSchema,
  transcriptionSchema,
  voiceCapabilitiesSchema,
  voiceExecuteResultSchema,
  voiceExecuteSchema,
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
