import { describe, expect, it } from "vitest";
import { evaluateAssistantCall, isInternalVoiceRole } from "../tools/assistant-policy";

function call(name: string) {
  return { id: "1", name, args: {}, source: "LOCAL_NLU" as const };
}

describe("roadmap P2 assistant safety", () => {
  it("only allows internal roles to use voice tools", () => {
    expect(isInternalVoiceRole("PATIENT")).toBe(false);
    expect(isInternalVoiceRole("ADMIN")).toBe(true);
    expect(isInternalVoiceRole("DENTIST")).toBe(true);
    expect(evaluateAssistantCall(call("navigation.open"), { role: "PATIENT" }).decision).toBe(
      "BLOCK",
    );
  });

  it("blocks patient-scoped writes without an active patient", () => {
    expect(
      evaluateAssistantCall(
        { id: "1", name: "appointment.reschedule", args: {}, source: "LOCAL_NLU" },
        { role: "DENTIST" },
      ).decision,
    ).toBe("BLOCK");
  });
  it("requires confirmation for consequential scheduling and export actions", () => {
    expect(
      evaluateAssistantCall(
        { id: "1", name: "appointment.reschedule", args: {}, source: "REALTIME" },
        { role: "ADMIN", patientId: "p1" },
      ).decision,
    ).toBe("CONFIRM");
    expect(
      evaluateAssistantCall(
        { id: "2", name: "documents.export", args: {}, source: "LOCAL_NLU" },
        { role: "ADMIN", patientId: "p1" },
      ).decision,
    ).toBe("CONFIRM");
  });
  it("allows green navigation without confirmation", () => {
    expect(evaluateAssistantCall(call("navigation.open"), { role: "RECEPTION" }).decision).toBe(
      "ALLOW",
    );
  });

  it("allows clear clinical edits for internal clinicians", () => {
    expect(
      evaluateAssistantCall(call("odontogram.set_state"), { role: "DENTIST", patientId: "p1" })
        .decision,
    ).toBe("ALLOW");
    expect(
      evaluateAssistantCall(call("payment.record"), { role: "ADMIN", patientId: "p1" }),
    ).toMatchObject({ decision: "CONFIRM", reason: "CONSEQUENTIAL_ACTION" });
  });
});
