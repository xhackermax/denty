import Anthropic from "@anthropic-ai/sdk";

import {
  CLAUDE_VOICE_SYSTEM,
  CLAUDE_VOICE_TOOLS,
  actionsFromToolCalls,
  type ClaudeVoiceInterpretation,
} from "./claude-voice-tools";

export class ClaudeVoiceUnavailableError extends Error {}

export interface ClaudeVoiceRequest {
  apiKey: string;
  model: string;
  transcript: string;
  /** Where the user is (e.g. the odontogram of a patient), to resolve "este diente". */
  screen: string;
  selectedTooth?: string | undefined;
}

/**
 * Asks Claude which Denty tools the spoken order maps to. Nothing is executed
 * here: the tool calls are returned as actions for the user to confirm.
 */
export async function interpretWithClaude(
  request: ClaudeVoiceRequest,
): Promise<ClaudeVoiceInterpretation> {
  const client = new Anthropic({ apiKey: request.apiKey, timeout: 25_000, maxRetries: 1 });
  const context = [
    `Pantalla actual: ${request.screen}.`,
    request.selectedTooth ? `Diente seleccionado: ${request.selectedTooth}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const response = await client.beta.messages.create({
    model: request.model,
    max_tokens: 4096,
    // Voice needs a quick answer; the mapping is simple.
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    cache_control: { type: "ephemeral" },
    system: CLAUDE_VOICE_SYSTEM,
    tools: CLAUDE_VOICE_TOOLS,
    messages: [
      {
        role: "user",
        content: `${context}\nOrden dictada: «${request.transcript}»`,
      },
    ],
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
