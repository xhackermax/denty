export type VoiceIntent =
  | "patient.search"
  | "appointment.create"
  | "odontogram.update"
  | "payment.record"
  | "lab.receive"
  | "navigation.open";

export interface VoiceCommand {
  intent: VoiceIntent;
  confidence: number;
  slots: Record<string, string | number | boolean>;
  requiresConfirmation: boolean;
}

export function parseLocalCommand(input: string): VoiceCommand {
  const text = input.trim().toLowerCase();

  if (text.includes("agenda") || text.includes("cita")) {
    return { intent: "appointment.create", confidence: 0.72, slots: { raw: input }, requiresConfirmation: true };
  }

  if (text.includes("cobrar") || text.includes("pago")) {
    return { intent: "payment.record", confidence: 0.7, slots: { raw: input }, requiresConfirmation: true };
  }

  if (text.includes("laboratorio")) {
    return { intent: "lab.receive", confidence: 0.7, slots: { raw: input }, requiresConfirmation: true };
  }

  return { intent: "patient.search", confidence: 0.55, slots: { raw: input }, requiresConfirmation: false };
}
