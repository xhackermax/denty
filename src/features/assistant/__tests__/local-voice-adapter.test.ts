import { expect, it } from "vitest";
import { localVoicePlanToToolCalls } from "../tools/local-voice-adapter";
import type { LocalVoiceAction, LocalVoicePlan } from "@/features/voice/local-nlu";

function plan(actions: LocalVoiceAction[], contextPatientId = "p1"): LocalVoicePlan {
  return {
    raw: "test",
    actions,
    ambiguities: [],
    requiresConfirmation: false,
    readback: "",
    confidence: 1,
    contextPatientId,
    source: "rules",
  };
}

it("maps odontogram actions without losing surfaces", () => {
  const result = localVoicePlanToToolCalls(
    plan([
      {
        type: "odontogram.set_state",
        patientRef: "actual",
        tooth: "16",
        status: "CARIES",
        surfaces: ["O", "D"],
      },
    ]),
  );
  expect(result.calls[0]).toMatchObject({
    name: "odontogram.set_state",
    source: "LOCAL_NLU",
    args: { patientId: "p1", tooth: "16", status: "CARIES", surfaces: ["O", "D"] },
  });
});

it("maps appointment reschedule and no-show to registered assistant tools", () => {
  const result = localVoicePlanToToolCalls(
    plan([
      {
        type: "appointment.reschedule",
        patientRef: "actual",
        dateText: "mañana",
        timeText: "10:30",
        durationMin: 45,
        staffRef: "Dra. Ruiz",
      },
      { type: "appointment.no_show", patientRef: "actual" },
    ]),
  );

  expect(result.unsupported).toEqual([]);
  expect(result.calls).toEqual([
    expect.objectContaining({
      name: "appointment.reschedule",
      args: {
        patientId: "p1",
        dateText: "mañana",
        timeText: "10:30",
        durationMin: 45,
        staffRef: "Dra. Ruiz",
      },
    }),
    expect.objectContaining({
      name: "appointment.mark_no_show",
      args: { patientId: "p1" },
    }),
  ]);
});

it("reports unsupported local actions explicitly instead of dropping them", () => {
  const result = localVoicePlanToToolCalls(
    plan([
      {
        type: "appointment.schedule",
        patientRef: "actual",
        dateText: "lunes",
        timeText: "12:00",
      },
      {
        type: "lab.transition",
        patientRef: "actual",
        status: "RECEIVED",
      },
      {
        type: "clinical.add_dependency",
        patientRef: "actual",
        tooth: "14",
        beforeCode: "endodontics",
        afterCode: "crown",
      },
    ]),
  );

  expect(result.calls).toEqual([]);
  expect(result.unsupported).toEqual([
    "appointment.schedule",
    "lab.transition",
    "clinical.add_dependency",
  ]);
});

const treatment = (
  type: "clinical.add_item" | "clinical.complete_item" | "clinical.mark_unsatisfactory",
  overrides: Partial<{ tooth: string; treatmentCode: string }> = {},
): LocalVoiceAction => ({
  type,
  patientRef: "actual",
  tooth: "27",
  treatmentCode: "extraction",
  label: "Extracción",
  surfaces: [],
  ...overrides,
});

it.each(["clinical.add_item", "clinical.complete_item", "clinical.mark_unsatisfactory"] as const)(
  "maps %s on the open patient to a registered tool",
  (type) => {
    const result = localVoicePlanToToolCalls(plan([treatment(type)]));

    expect(result.unsupported).toEqual([]);
    expect(result.calls[0]).toMatchObject({
      name: type,
      args: { patientId: "p1", tooth: "27", treatmentCode: "extraction", surfaces: [] },
    });
  },
);

it("keeps treatments unsupported without a tooth or a drawable treatment", () => {
  const noTooth: LocalVoiceAction = {
    type: "clinical.add_item",
    patientRef: "actual",
    treatmentCode: "extraction",
    label: "Extracción",
    surfaces: [],
  };
  const result = localVoicePlanToToolCalls(
    plan([noTooth, treatment("clinical.add_item", { treatmentCode: "prophylaxis" })]),
  );

  expect(result.calls).toEqual([]);
  expect(result.unsupported).toEqual(["clinical.add_item", "clinical.add_item"]);
});
