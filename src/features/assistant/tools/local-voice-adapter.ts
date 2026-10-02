import type { LocalVoiceAction, LocalVoicePlan } from "@/features/voice/local-nlu";
import { isOdontogramTreatmentCode } from "@/features/voice/voice-odontogram";

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
    case "clinical.alert":
      // Denty has no patient medical-alert endpoint; admin alerts are system-wide.
      return undefined;
    case "appointment.arrive":
      return patientId ? { patientId } : undefined;
    case "appointment.schedule":
      return patientId
        ? {
            patientId,
            dateText: action.dateText,
            ...(action.timeText !== undefined ? { timeText: action.timeText } : {}),
            ...(action.durationMin !== undefined ? { durationMin: action.durationMin } : {}),
            ...(action.staffRef !== undefined ? { staffRef: action.staffRef } : {}),
          }
        : undefined;
    case "lab.transition":
      return patientId ? { patientId, status: action.status } : undefined;
    case "clinical.add_dependency":
      return patientId && action.tooth
        ? {
            patientId,
            tooth: action.tooth,
            beforeCode: action.beforeCode,
            afterCode: action.afterCode,
          }
        : undefined;
    case "clinical.prosthesis_options":
      return patientId && action.teeth.length ? { patientId, teeth: action.teeth } : undefined;
    case "clinical.add_item":
    case "clinical.complete_item":
    case "clinical.mark_unsatisfactory":
      return patientId && action.tooth && isOdontogramTreatmentCode(action.treatmentCode)
        ? {
            patientId,
            tooth: action.tooth,
            treatmentCode: action.treatmentCode,
            surfaces: action.surfaces,
          }
        : undefined;
    case "clinical.plan_item":
      return patientId
        ? {
            patientId,
            ...(action.tooth ? { tooth: action.tooth } : {}),
            treatmentCode: action.treatmentCode,
            label: action.label,
            adHoc: action.adHoc,
          }
        : undefined;
    case "navigation.open":
      return {
        destination: action.destination,
        ...(patientId ? { patientId } : {}),
        ...(action.dateText ? { dateText: action.dateText } : {}),
      };
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
      return patientId
        ? {
            patientId,
            teeth: action.teeth,
            missingTeeth: action.missingTeeth,
            status: action.status,
          }
        : undefined;
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
    case "appointment.reschedule":
      return patientId
        ? {
            patientId,
            dateText: action.dateText,
            ...(action.timeText !== undefined ? { timeText: action.timeText } : {}),
            ...(action.durationMin !== undefined ? { durationMin: action.durationMin } : {}),
            ...(action.staffRef !== undefined ? { staffRef: action.staffRef } : {}),
          }
        : undefined;
    case "appointment.no_show":
      return patientId ? { patientId } : undefined;
    default:
      return undefined;
  }
}

export function localVoicePlanToToolCalls(plan: LocalVoicePlan): LocalVoiceAdaptation {
  const calls: AssistantToolCall[] = [];
  const unsupported: string[] = [];

  plan.actions.forEach((action, index) => {
    if (action.type === "patient.resolve") return;
    const name = action.type === "appointment.no_show" ? "appointment.mark_no_show" : action.type;
    const definition = getAssistantToolDefinition(name);
    const args = toArgs(action, plan);
    if (!definition || args === undefined) {
      unsupported.push(action.type);
      return;
    }
    calls.push({ id: callId(index, action), name, args, source: "LOCAL_NLU" });
  });

  return { calls, unsupported };
}
