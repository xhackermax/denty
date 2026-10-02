export interface SubmitKeyEvent {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode?: number;
}

// Android keyboards report keyCode 229 while a word is still being composed,
// even when isComposing is false; submitting then would cut the last word.
const IME_PROCESS_KEY_CODE = 229;

export function shouldSubmitOnKey(event: SubmitKeyEvent): boolean {
  if (event.key !== "Enter" || event.shiftKey) return false;
  return !event.isComposing && event.keyCode !== IME_PROCESS_KEY_CODE;
}

const WAKE_PHRASE =
  /^\s*(?:(?:oye|oi|hoye|hey|ey|ei|ok|okay|okey|hola)[\s.,;:!?-]+)?(?:denty|denti|dentis|dentys|dente|denthi)(?:[\s.,;:!?-]+|$)/i;

export function stripWakePhrase(transcript: string): string {
  return transcript.replace(WAKE_PHRASE, "").trim();
}

export function appendDictation(existing: string, dictated: string): string {
  const addition = dictated.trim();
  if (!addition) return existing;
  const base = existing.trimEnd();
  return base ? `${base} ${addition}` : addition;
}

export function isAndroidUserAgent(userAgent: string): boolean {
  return /\bAndroid\b/i.test(userAgent);
}

const SURFACE_NAMES: Readonly<Record<string, string>> = {
  O: "oclusal",
  I: "incisal",
  M: "mesial",
  D: "distal",
  V: "vestibular",
  B: "vestibular",
  L: "lingual",
  P: "palatino",
};

export function describeSurfaces(surfaces: readonly string[]): string {
  return surfaces.map((surface) => SURFACE_NAMES[surface.toUpperCase()] ?? surface).join(", ");
}

export type CaptureStatus =
  "idle" | "requesting_permission" | "connecting" | "listening" | "finalizing";

export type VoiceStatus =
  | "available"
  | Exclude<CaptureStatus, "idle">
  | "interpreting"
  | "awaiting_confirmation"
  | "executing"
  | "done"
  | "error";

export interface VoiceStatusInput {
  capture: CaptureStatus;
  interpreting: boolean;
  executing: boolean;
  awaitingConfirmation: boolean;
  done: boolean;
  error: boolean;
}

export function deriveVoiceStatus(input: VoiceStatusInput): VoiceStatus {
  if (input.capture !== "idle") return input.capture;
  if (input.executing) return "executing";
  if (input.interpreting) return "interpreting";
  if (input.awaitingConfirmation) return "awaiting_confirmation";
  if (input.error) return "error";
  if (input.done) return "done";
  return "available";
}

const STATUS_LABELS: Readonly<Record<VoiceStatus, string>> = {
  available: "Disponible",
  requesting_permission: "Solicitando permiso",
  connecting: "Conectando",
  listening: "Escuchando",
  finalizing: "Finalizando transcripción",
  interpreting: "Interpretando",
  awaiting_confirmation: "Pendiente de confirmación",
  executing: "Ejecutando",
  done: "Completado",
  error: "Error",
};

export function voiceStatusLabel(status: VoiceStatus): string {
  return STATUS_LABELS[status];
}
