import type { AssistantContext, AssistantRisk, AssistantToolCall } from "../assistant-types";
import { getAssistantToolDefinition } from "./assistant-tool-registry";

export const INTERNAL_VOICE_ROLES = ["ADMIN", "DENTIST", "ASSISTANT", "RECEPTION"] as const;

export type AssistantRole = (typeof INTERNAL_VOICE_ROLES)[number] | "PATIENT" | string;

export function isInternalVoiceRole(role: string | null | undefined): boolean {
  return INTERNAL_VOICE_ROLES.includes(role as (typeof INTERNAL_VOICE_ROLES)[number]);
}

export function classifyAssistantTool(name: string): AssistantRisk {
  return getAssistantToolDefinition(name)?.risk ?? "RED";
}

export function assistantToolNeedsConfirmation(call: AssistantToolCall): boolean {
  return classifyAssistantTool(call.name) === "RED";
}

export type AssistantPolicyDecision = "ALLOW" | "CONFIRM" | "BLOCK";
export interface AssistantPolicyResult {
  decision: AssistantPolicyDecision;
  reason?: string;
  risk: AssistantRisk;
}
export function evaluateAssistantCall(
  call: AssistantToolCall,
  context: Pick<AssistantContext, "patientId"> & {
    role?: AssistantRole | null;
    permissions?: readonly string[];
  },
): AssistantPolicyResult {
  const definition = getAssistantToolDefinition(call.name);
  if (!definition) return { decision: "BLOCK", reason: "UNKNOWN_TOOL", risk: "RED" };
  const roles = definition.roles ?? INTERNAL_VOICE_ROLES;
  if (!context.role || !roles.includes(context.role)) {
    return { decision: "BLOCK", reason: "ROLE_NOT_ALLOWED", risk: definition.risk };
  }
  if (definition.requiresPatient && !context.patientId)
    return { decision: "BLOCK", reason: "PATIENT_REQUIRED", risk: definition.risk };
  if (definition.risk === "RED")
    return { decision: "CONFIRM", reason: "CONSEQUENTIAL_ACTION", risk: definition.risk };
  return { decision: "ALLOW", risk: definition.risk };
}
