import type { AssistantRisk, AssistantToolCall } from "../assistant-types";
import { getAssistantToolDefinition } from "./assistant-tool-registry";

export function classifyAssistantTool(name: string): AssistantRisk {
  return getAssistantToolDefinition(name)?.risk ?? "RED";
}

export function assistantToolNeedsConfirmation(call: AssistantToolCall): boolean {
  return classifyAssistantTool(call.name) === "RED";
}
