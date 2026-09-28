import type { AssistantEvent, AssistantState } from "./assistant-types";

export const initialAssistantState: AssistantState = {
  enabled: false,
  visible: true,
  status: "OFF",
};

export function reduceAssistantState(
  state: AssistantState,
  event: AssistantEvent,
): AssistantState {
  if (event.type === "DISABLE") {
    return { enabled: false, visible: state.visible, status: "OFF" };
  }

  if (event.type === "VISIBILITY") {
    if (!event.visible) {
      return {
        enabled: state.enabled,
        visible: false,
        status: state.enabled ? "PAUSED_HIDDEN" : "OFF",
      };
    }
    return {
      enabled: state.enabled,
      visible: true,
      status: state.enabled ? "ARMED" : "OFF",
    };
  }

  if (event.type === "ENABLE") {
    return {
      enabled: true,
      visible: state.visible,
      status: state.visible ? "ARMED" : "PAUSED_HIDDEN",
    };
  }

  if (!state.enabled) return state;
  if (!state.visible) return { ...state, status: "PAUSED_HIDDEN" };

  switch (event.type) {
    case "WAKE":
      return { ...state, status: "WAKE_DETECTED" };
    case "CONNECTING":
      return { ...state, status: "CONNECTING" };
    case "CONNECTED":
    case "LISTEN":
      return { ...state, status: "LISTENING" };
    case "THINK":
      return { ...state, status: "THINKING" };
    case "EXECUTE":
      return { ...state, status: "EXECUTING" };
    case "REQUEST_CONFIRMATION":
      return {
        ...state,
        status: "CONFIRMING",
        pendingConfirmationId: event.callId,
      };
    case "CONFIRMATION_FINISHED": {
      const { pendingConfirmationId: _pending, ...rest } = state;
      return { ...rest, status: "LISTENING" };
    }
    case "FAIL":
      return { ...state, status: "ERROR", error: event.message };
  }
}
