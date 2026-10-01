import Anthropic from "@anthropic-ai/sdk";

import { canonicalizeDentalSpeech } from "@/features/voice/dental-normalizer";

import {
  CLAUDE_VOICE_SYSTEM,
  CLAUDE_VOICE_TOOLS,
  actionsFromToolCalls,
  type ClaudeVoiceInterpretation,
} from "./claude-voice-tools";

export class ClaudeVoiceUnavailableError extends Error {}

export function isHaiku45(model: string): boolean {
  return model.startsWith("claude-haiku-4-5") || model.endsWith("/claude-haiku-4.5");
}

export interface ClaudeVoiceRequest {
  apiKey: string;
  model: string;
  transcript: string;
  /** Where the user is (e.g. the odontogram of a patient), to resolve "este diente". */
  screen: string;
  selectedTooth?: string | undefined;
  baseURL?: string | undefined;
}

/**
 * Asks Claude which Denty tools the spoken order maps to. Nothing is executed
 * here: the tool calls are returned as actions for the user to confirm.
 */
export async function interpretWithClaude(
  request: ClaudeVoiceRequest,
): Promise<ClaudeVoiceInterpretation> {
  const client = new Anthropic({
    apiKey: request.apiKey,
    ...(request.baseURL ? { baseURL: request.baseURL } : {}),
    timeout: 25_000,
    maxRetries: 1,
  });
  const context = [
    `Pantalla actual: ${request.screen}.`,
    request.selectedTooth ? `Diente seleccionado: ${request.selectedTooth}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        context,
        `Orden dictada: «${request.transcript}»`,
        `Normalizada: «${canonicalizeDentalSpeech(request.transcript)}»`,
      ].join("\n"),
    },
  ];

  // Haiku 4.5 (the default: cheapest, and enough to map a sentence to a tool)
  // takes neither effort nor server-side fallbacks, and our ~2K-token prefix is
  // below its 4096-token caching minimum. Newer models get the full options.
  const response = isHaiku45(request.model)
    ? await client.messages.create({
        model: request.model,
        max_tokens: 1024,
        system: CLAUDE_VOICE_SYSTEM,
        tools: CLAUDE_VOICE_TOOLS,
        messages,
      })
    : await client.beta.messages.create({
        model: request.model,
        max_tokens: 4096,
        output_config: { effort: "low" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        cache_control: { type: "ephemeral" },
        system: CLAUDE_VOICE_SYSTEM,
        tools: CLAUDE_VOICE_TOOLS,
        messages,
      });

  if (response.stop_reason === "refusal") {
    throw new ClaudeVoiceUnavailableError("Claude no ha podido procesar esta orden.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new ClaudeVoiceUnavailableError(
      "La orden es demasiado larga para procesarla de una vez.",
    );
  }
  const calls = response.content.flatMap((block) =>
    block.type === "tool_use" ? [{ name: block.name, input: block.input }] : [],
  );
  const interpretation = actionsFromToolCalls(calls);
  if (!interpretation.actions.length && !interpretation.ambiguities.length) {
    interpretation.ambiguities.push("una orden más concreta");
  }
  return interpretation;
}
