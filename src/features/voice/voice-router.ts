import {
  planLocalVoiceCommand,
  voiceReadback,
  type LocalVoiceAction,
  type LocalVoiceContext,
  type LocalVoicePlan,
} from "./local-nlu";
import { localVoicePlanToToolCalls } from "@/features/assistant/tools/local-voice-adapter";

export interface VoicePreview {
  planToken: string;
  plan: LocalVoicePlan;
  unsupportedActions: LocalVoiceAction["type"][];
}

const DESTINATIONS: Readonly<Record<string, string>> = {
  home: "/app",
  patients: "/app/patients",
  agenda: "/app/agenda",
  laboratory: "/app/laboratory",
  finance: "/app/finance",
  tasks: "/app/tasks",
  settings: "/app/settings",
  admin: "/app/admin",
};

export function patientIdFromPathname(pathname?: string): string | undefined {
  if (!pathname) return undefined;
  const match = pathname.match(/^\/app\/patients\/([^/]+)(?:\/|$)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

// The assistant tools decide what can run. The patient may still be unresolved here, so the
// probe assumes one: argument problems that need the real patient are re-checked at execution.
function unsupportedActionTypes(plan: LocalVoicePlan): LocalVoiceAction["type"][] {
  const probe = { ...plan, contextPatientId: plan.contextPatientId ?? "pending-patient" };
  return localVoicePlanToToolCalls(probe).unsupported as LocalVoiceAction["type"][];
}

export function previewVoiceCommand(input: string, context: LocalVoiceContext = {}): VoicePreview {
  const patientId = context.patientId ?? patientIdFromPathname(context.pathname);
  const plan = planLocalVoiceCommand(input, {
    ...context,
    ...(patientId ? { patientId } : {}),
  });
  return {
    planToken: crypto.randomUUID(),
    plan,
    unsupportedActions: unsupportedActionTypes(plan),
  };
}

/**
 * Preview built from Claude's interpretation (see /api/voice/interpret). The
 * actions go through the same confirmation and executor as the local ones.
 */
export function previewFromClaude(
  input: string,
  interpretation: { actions: readonly LocalVoiceAction[]; ambiguities: readonly string[] },
  context: LocalVoiceContext = {},
): VoicePreview {
  const patientId = context.patientId ?? patientIdFromPathname(context.pathname);
  const actions = [...interpretation.actions];
  const ambiguities = [...interpretation.ambiguities];
  const needsPatient = actions.some(
    (action) => !action.type.startsWith("navigation.") && action.type !== "patient.create",
  );
  if (needsPatient && !patientId) ambiguities.push("abrir antes la ficha del paciente");
  const plan: LocalVoicePlan = {
    raw: input,
    actions,
    ambiguities,
    requiresConfirmation: true,
    readback: voiceReadback(actions, ambiguities),
    confidence: ambiguities.length ? 0.7 : 0.95,
    ...(patientId ? { contextPatientId: patientId } : {}),
    source: "claude",
  };
  return {
    planToken: crypto.randomUUID(),
    plan,
    unsupportedActions: unsupportedActionTypes(plan),
  };
}

export function hrefForVoiceAction(
  action: LocalVoiceAction,
  contextPatientId?: string,
): string | undefined {
  if (action.type === "navigation.open" && action.destination === "odontogram") {
    return contextPatientId
      ? `/app/patients/${encodeURIComponent(contextPatientId)}/odontogram`
      : "/app/patients";
  }
  if (action.type === "navigation.open") return DESTINATIONS[action.destination];
  if (action.type === "navigation.patient") {
    return contextPatientId
      ? `/app/patients/${encodeURIComponent(contextPatientId)}`
      : "/app/patients";
  }
  if (action.type.startsWith("appointment.")) return "/app/agenda";

  const clinicalAction =
    action.type.startsWith("odontogram.") ||
    action.type.startsWith("periodontal.") ||
    action.type.startsWith("clinical.") ||
    action.type === "budget.sync";

  if (clinicalAction) {
    if (!contextPatientId) return "/app/patients";
    const patientBase = `/app/patients/${encodeURIComponent(contextPatientId)}`;
    if (
      action.type.startsWith("odontogram.") ||
      action.type.startsWith("periodontal.") ||
      action.type === "clinical.add_item" ||
      action.type === "clinical.complete_item" ||
      action.type === "clinical.mark_unsatisfactory"
    ) {
      return `${patientBase}/odontogram`;
    }
    return patientBase;
  }

  if (action.type === "payment.record") return "/app/finance";
  if (action.type === "lab.transition") return "/app/laboratory";
  if (action.type === "patient.create") return "/app/patients";
  if (action.type === "patient.resolve") return undefined;
  return undefined;
}

export function primaryHrefForVoicePlan(plan: LocalVoicePlan): string | undefined {
  return plan.actions
    .map((action) => hrefForVoiceAction(action, plan.contextPatientId))
    .find(Boolean);
}

export function canExecuteVoicePreview(preview: VoicePreview): boolean {
  return (
    preview.plan.actions.length > 0 &&
    preview.plan.ambiguities.length === 0 &&
    preview.unsupportedActions.length === 0
  );
}

const SPOKEN_AUTORUN_ACTIONS = new Set<LocalVoiceAction["type"]>([
  "odontogram.set_state",
  "odontogram.bridge",
  "odontogram.removable",
  "periodontal.update",
  "clinical.add_item",
  "clinical.complete_item",
  "clinical.mark_unsatisfactory",
  "clinical.plan_item",
  "clinical.note",
]);

/**
 * True when the local rules understood nothing and only kept the raw speech as a
 * note. That isn't an interpretation: Claude gets a chance first and a human confirms.
 */
export function isLiteralNoteFallback(preview: VoicePreview): boolean {
  return preview.plan.actions.some(
    (action) => action.type === "clinical.note" && action.literalFallback === true,
  );
}

export function shouldAutoExecuteSpokenPreview(preview: VoicePreview): boolean {
  if (!canExecuteVoicePreview(preview)) return false;
  if (isLiteralNoteFallback(preview)) return false;
  if (!preview.plan.contextPatientId) return false;
  const actionable = preview.plan.actions.filter((action) => action.type !== "patient.resolve");
  return (
    actionable.length > 0 && actionable.every((action) => SPOKEN_AUTORUN_ACTIONS.has(action.type))
  );
}
