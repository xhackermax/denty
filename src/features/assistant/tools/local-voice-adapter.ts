import type { LocalVoiceAction, LocalVoicePlan } from "@/features/voice/local-nlu";

import type { AssistantToolCall } from "../assistant-types";
import { getAssistantToolDefinition } from "./assistant-tool-registry";

export interface LocalVoiceAdaptation {
  calls: AssistantToolCall[];
  unsupported: string[];
}

function callId(index: number, action: LocalVoiceAction): string {
  return `local-${index}-${action.type}`;
}

function patientIdFor(plan: LocalVoicePlan): string | undefined {
  return plan.contextPatientId;
}

function toArgs(action: LocalVoiceAction, plan: LocalVoicePlan): unknown | undefined {
  const patientId = patientIdFor(plan);

  switch (action.type) {
    case "navigation.open":
      return { destination: action.destination };
    case "navigation.patient":
      return patientId ? { patientId } : undefined;
    case "patient.create":
      return {
        firstName: action.firstName,
        lastName: action.lastName,
        ...(action.phone ? { phone: action.phone } : {}),
        ...(action.dni ? { dni: action.dni } : {}),
      };
    case "odontogram.set_state":
      return patientId
        ? {
            patientId,
            tooth: action.tooth,
            status: action.status,
            surfaces: action.surfaces ?? [],
          }
        : undefined;
    case "odontogram.bridge":
      return patientId ? { patientId, teeth: action.teeth, missingTeeth: action.missingTeeth, status: action.status } : undefined;
    case "odontogram.removable":
      return patientId ? { patientId, teeth: action.teeth, arch: action.arch } : undefined;
    case "periodontal.update":
      return patientId
        ? {
            patientId,
            tooth: action.tooth,
            site: action.site,
            ...(action.probingDepth !== undefined ? { probingDepth: action.probingDepth } : {}),
            ...(action.recession !== undefined ? { recession: action.recession } : {}),
            ...(action.mobility !== undefined ? { mobility: action.mobility } : {}),
            ...(action.bleeding !== undefined ? { bleeding: action.bleeding } : {}),
            ...(action.suppuration !== undefined ? { suppuration: action.suppuration } : {}),
            ...(action.plaque !== undefined ? { plaque: action.plaque } : {}),
          }
        : undefined;
    case "clinical.note":
      return patientId ? { patientId, text: action.text } : undefined;
    case "budget.sync":
      return patientId ? { patientId } : undefined;
    case "payment.record":
      return patientId && action.amountCents !== undefined && action.method
        ? { patientId, amountCents: action.amountCents, method: action.method }
        : undefined;
    default:
      return undefined;
  }
}

export function localVoicePlanToToolCalls(plan: LocalVoicePlan): LocalVoiceAdaptation {
  const calls: AssistantToolCall[] = [];
  const unsupported: string[] = [];

  plan.actions.forEach((action, index) => {
    if (action.type === "patient.resolve") return;
    const definition = getAssistantToolDefinition(action.type);
    const args = toArgs(action, plan);
    if (!definition || args === undefined) {
      unsupported.push(action.type);
      return;
    }
    calls.push({ id: callId(index, action), name: action.type, args, source: "LOCAL_NLU" });
  });

  return { calls, unsupported };
}
