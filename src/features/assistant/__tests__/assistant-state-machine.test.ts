import { describe, expect, it } from "vitest";
import { initialAssistantState, reduceAssistantState } from "../assistant-state-machine";

describe("assistant state machine", () => {
  it("arms only when enabled and visible", () => {
    const enabled = reduceAssistantState(initialAssistantState, { type: "ENABLE" });
    expect(enabled.status).toBe("ARMED");
    const hidden = reduceAssistantState(enabled, { type: "VISIBILITY", visible: false });
    expect(hidden.status).toBe("PAUSED_HIDDEN");
  });

  it("requires explicit confirmation state for red actions", () => {
    const armed = reduceAssistantState(initialAssistantState, { type: "ENABLE" });
    const confirming = reduceAssistantState(armed, { type: "REQUEST_CONFIRMATION", callId: "call-1" });
    expect(confirming.status).toBe("CONFIRMING");
    expect(confirming.pendingConfirmationId).toBe("call-1");
  });
});
