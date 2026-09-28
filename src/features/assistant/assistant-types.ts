export type AssistantStatus =
  | "OFF"
  | "ARMED"
  | "WAKE_DETECTED"
  | "CONNECTING"
  | "LISTENING"
  | "THINKING"
  | "EXECUTING"
  | "CONFIRMING"
  | "PAUSED_HIDDEN"
  | "ERROR";

export type AssistantRisk = "GREEN" | "YELLOW" | "RED";
export type AssistantSource = "LOCAL_NLU" | "REALTIME" | "PROACTIVE";

export interface AssistantContext {
  pathname: string;
  patientId?: string;
  patientName?: string;
  selectedTooth?: string;
  selectedAppointmentId?: string;
  activeBudgetId?: string;
  activePlanVersion?: number;
  lastTool?: string;
  lastEntities?: string[];
}

export interface AssistantToolCall<TArgs = unknown> {
  id: string;
  name: string;
  args: TArgs;
  source: AssistantSource;
}

export interface AssistantAuditEvent {
  id: string;
  at: string;
  actorId?: string;
  toolName: string;
  source: AssistantSource;
  risk: AssistantRisk;
  outcome: "EXECUTED" | "BLOCKED" | "CONFIRMED" | "FAILED";
}

export interface AssistantState {
  enabled: boolean;
  visible: boolean;
  status: AssistantStatus;
  pendingConfirmationId?: string;
  error?: string;
}

export type AssistantEvent =
  | { type: "ENABLE" }
  | { type: "DISABLE" }
  | { type: "VISIBILITY"; visible: boolean }
  | { type: "WAKE" }
  | { type: "CONNECTING" }
  | { type: "CONNECTED" }
  | { type: "THINK" }
  | { type: "EXECUTE" }
  | { type: "LISTEN" }
  | { type: "REQUEST_CONFIRMATION"; callId: string }
  | { type: "CONFIRMATION_FINISHED" }
  | { type: "FAIL"; message: string };
