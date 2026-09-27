import type { AssistantContext, AssistantRisk, AssistantToolCall } from "../assistant-types";
import { getAssistantToolDefinition } from "./assistant-tool-registry";

export function classifyAssistantTool(name: string): AssistantRisk {
  return getAssistantToolDefinition(name)?.risk ?? "RED";
}

export function assistantToolNeedsConfirmation(call: AssistantToolCall): boolean {
  return classifyAssistantTool(call.name) === "RED";
}

export type AssistantPolicyDecision = "ALLOW" | "CONFIRM" | "BLOCK";
export interface AssistantPolicyResult { decision: AssistantPolicyDecision; reason?: string; risk: AssistantRisk }
export function evaluateAssistantCall(call: AssistantToolCall, context: Pick<AssistantContext, "patientId">): AssistantPolicyResult {
  const definition = getAssistantToolDefinition(call.name);
  if (!definition) return { decision: "BLOCK", reason: "UNKNOWN_TOOL", risk: "RED" };
  if (definition.requiresPatient && !context.patientId) return { decision: "BLOCK", reason: "PATIENT_REQUIRED", risk: definition.risk };
  if (definition.risk === "RED") return { decision: "CONFIRM", reason: "CONSEQUENTIAL_ACTION", risk: definition.risk };
  return { decision: "ALLOW", risk: definition.risk };
}
