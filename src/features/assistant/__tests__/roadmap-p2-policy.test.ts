import { describe, expect, it } from "vitest";
import { evaluateAssistantCall } from "../tools/assistant-policy";

describe("roadmap P2 assistant safety", () => {
  it("blocks patient-scoped writes without an active patient", () => {
    expect(
      evaluateAssistantCall(
        { id: "1", name: "appointment.reschedule", args: {}, source: "LOCAL_NLU" },
        {},
      ).decision,
    ).toBe("BLOCK");
  });
  it("requires confirmation for consequential scheduling and export actions", () => {
    expect(
      evaluateAssistantCall(
        { id: "1", name: "appointment.reschedule", args: {}, source: "REALTIME" },
        { patientId: "p1" },
      ).decision,
    ).toBe("CONFIRM");
    expect(
      evaluateAssistantCall(
        { id: "2", name: "documents.export", args: {}, source: "LOCAL_NLU" },
        { patientId: "p1" },
      ).decision,
    ).toBe("CONFIRM");
  });
  it("allows green navigation without confirmation", () => {
    expect(
      evaluateAssistantCall({ id: "1", name: "navigation.open", args: {}, source: "LOCAL_NLU" }, {})
        .decision,
    ).toBe("ALLOW");
  });
});
