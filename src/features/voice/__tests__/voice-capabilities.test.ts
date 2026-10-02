import { describe, expect, it } from "vitest";

import { localVoicePlanToToolCalls } from "@/features/assistant/tools/local-voice-adapter";

import { planLocalVoiceCommand } from "../local-nlu";
import { VOICE_CAPABILITY_GROUPS } from "../voice-capabilities";

describe("voice capability guide", () => {
  it("only advertises examples understood and wired to executable assistant tools", () => {
    for (const group of VOICE_CAPABILITY_GROUPS) {
      for (const capability of group.capabilities) {
        const plan = planLocalVoiceCommand(capability.example, { patientId: "patient-1" });
        expect(
          plan.actions.some((action) => action.type === capability.actionType),
          `${capability.example} should produce ${capability.actionType}`,
        ).toBe(true);
        if (capability.safety === "confirm") {
          expect(plan.requiresConfirmation, capability.example).toBe(true);
        }
        const adapted = localVoicePlanToToolCalls({ ...plan, contextPatientId: "patient-1" });
        expect(
          adapted.unsupported,
          `${capability.example} should not be an unsupported voice action`,
        ).not.toContain(capability.actionType);
      }
    }
  });
});
