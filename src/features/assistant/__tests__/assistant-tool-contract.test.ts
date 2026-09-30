import { describe, expect, it } from "vitest";

import { planLocalVoiceCommand, type LocalVoiceAction } from "@/features/voice/local-nlu";

import {
  hasAssistantToolHandler,
  listAssistantToolHandlerNames,
} from "../tools/assistant-tool-executor";
import { evaluateAssistantCall } from "../tools/assistant-policy";
import { localVoicePlanToToolCalls } from "../tools/local-voice-adapter";
import { assistantToolRegistry } from "../tools/assistant-tool-registry";

describe("assistant tool contract", () => {
  it("every registered tool has an executor implementation, except declared pending ones", () => {
    const pending = new Set(["documents.export", "recall.create"]);
    const missing = [...assistantToolRegistry.keys()].filter(
      (name) => !pending.has(name) && !hasAssistantToolHandler(name),
    );
    expect(missing).toEqual([]);
  });

  it("every executor handler is registered", () => {
    const unknown = listAssistantToolHandlerNames().filter(
      (name) => !assistantToolRegistry.has(name),
    );
    expect(unknown).toEqual([]);
  });

  it("consequential appointment actions require confirmation", () => {
    for (const name of [
      "appointment.arrive",
      "appointment.schedule",
      "appointment.reschedule",
      "appointment.mark_no_show",
    ]) {
      const result = evaluateAssistantCall(
        { id: "1", name, args: {}, source: "LOCAL_NLU" },
        { patientId: "p1", role: "RECEPTION" },
      );
      expect(result.decision, name).toBe("CONFIRM");
    }
  });

  it("every action the NLU emits is adapted except declared unsupported ones", () => {
    const nluActions: LocalVoiceAction[] = [
      { type: "appointment.arrive", patientRef: "x" },
      { type: "appointment.no_show", patientRef: "x" },
      { type: "appointment.schedule", patientRef: "x", dateText: "hoy", timeText: "10:00" },
      { type: "appointment.reschedule", patientRef: "x", dateText: "hoy" },
      { type: "lab.transition", patientRef: "x", status: "RECEIVED" },
      {
        type: "clinical.add_dependency",
        patientRef: "x",
        tooth: "14",
        beforeCode: "endodontics",
        afterCode: "crown",
      },
      { type: "clinical.prosthesis_options", patientRef: "x", teeth: ["14", "16"] },
      { type: "clinical.alert", patientRef: "x", text: "Alergia a penicilina", severity: "HIGH" },
    ];
    const plan = {
      ...planLocalVoiceCommand("hola", {}),
      contextPatientId: "p1",
      actions: nluActions,
    };
    const result = localVoicePlanToToolCalls(plan);
    expect(result.unsupported).toEqual(["clinical.alert"]);
    for (const call of result.calls) {
      expect(assistantToolRegistry.has(call.name), call.name).toBe(true);
      expect(hasAssistantToolHandler(call.name), call.name).toBe(true);
    }
  });
});
