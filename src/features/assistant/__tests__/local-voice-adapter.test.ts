import { expect, it } from "vitest";
import { localVoicePlanToToolCalls } from "../tools/local-voice-adapter";

it("maps odontogram actions without losing surfaces", () => {
  const result = localVoicePlanToToolCalls({
    raw: "caries OD 16",
    actions: [{ type: "odontogram.set_state", patientRef: "actual", tooth: "16", status: "CARIES", surfaces: ["O", "D"] }],
    ambiguities: [],
    requiresConfirmation: false,
    readback: "",
    confidence: 1,
    contextPatientId: "p1",
    source: "rules",
  });
  expect(result.calls[0]).toMatchObject({
    name: "odontogram.set_state",
    source: "LOCAL_NLU",
    args: { patientId: "p1", tooth: "16", status: "CARIES", surfaces: ["O", "D"] },
  });
});
