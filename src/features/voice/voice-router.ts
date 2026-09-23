import {
  planLocalVoiceCommand,
  type LocalVoiceAction,
  type LocalVoiceContext,
  type LocalVoicePlan,
} from "./local-nlu";

export interface VoicePreview {
  planToken: string;
  plan: LocalVoicePlan;
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

export function previewVoiceCommand(input: string, context: LocalVoiceContext = {}): VoicePreview {
  const patientId = context.patientId ?? patientIdFromPathname(context.pathname);
  return {
    planToken: crypto.randomUUID(),
    plan: planLocalVoiceCommand(input, {
      ...context,
      ...(patientId ? { patientId } : {}),
    }),
  };
}

export function hrefForVoiceAction(
  action: LocalVoiceAction,
  contextPatientId?: string,
): string | undefined {
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
  return preview.plan.actions.length > 0 && preview.plan.ambiguities.length === 0;
}
