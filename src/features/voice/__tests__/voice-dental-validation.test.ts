import { describe, expect, it } from "vitest";

import { findInvalidToothMentions, isFdiTooth } from "../tooth-mentions";
import { previewVoiceCommand } from "../voice-router";

const PATIENT_PATH = "/app/patients/11111111-1111-4111-8111-111111111111";

function plan(text: string) {
  return previewVoiceCommand(text, { pathname: PATIENT_PATH }).plan;
}

describe("isFdiTooth", () => {
  it("accepts permanent and primary teeth in FDI notation", () => {
    for (const tooth of ["11", "18", "28", "38", "48", "51", "55", "65", "75", "85"]) {
      expect(isFdiTooth(tooth)).toBe(true);
    }
  });

  it("rejects numbers outside FDI", () => {
    for (const tooth of ["10", "19", "29", "49", "56", "59", "86", "90", "1", "100"]) {
      expect(isFdiTooth(tooth)).toBe(false);
    }
  });
});

describe("findInvalidToothMentions", () => {
  it("finds impossible pieces mentioned with a dental cue", () => {
    expect(findInvalidToothMentions("marca caries en el 19")).toEqual(["19"]);
    expect(findInvalidToothMentions("endodoncia en el 56")).toEqual(["56"]);
  });

  it("ignores numbers that are clearly not teeth", () => {
    expect(findInvalidToothMentions("cobra 90 euros")).toEqual([]);
    expect(findInvalidToothMentions("cita a las 19:30")).toEqual([]);
    expect(findInvalidToothMentions("abre la ficha 1234")).toEqual([]);
    expect(findInvalidToothMentions("dame cita el 19 de octubre")).toEqual([]);
    expect(findInvalidToothMentions("paciente de 29 años con caries")).toEqual([]);
  });
});

describe("dental interpretation by rules", () => {
  it("understands primary teeth", () => {
    expect(plan("marca caries en el 55").actions).toEqual([
      expect.objectContaining({ type: "odontogram.set_state", tooth: "55", status: "CARIES" }),
    ]);
    expect(plan("marca caries en el 85").actions).toEqual([
      expect.objectContaining({ tooth: "85" }),
    ]);
  });

  it("refuses impossible teeth instead of guessing", () => {
    const result = plan("marca caries en el 19");
    expect(result.actions).toEqual([]);
    expect(result.ambiguities).toEqual(["la pieza 19 no existe en la numeración FDI"]);
  });

  it("keeps only the corrected tooth after 'no'", () => {
    expect(plan("el 16 no, el 26 caries").actions).toEqual([
      expect.objectContaining({ type: "odontogram.set_state", tooth: "26", status: "CARIES" }),
    ]);
  });

  it("never records a finding the dentist said is absent", () => {
    for (const text of [
      "el 16 no tiene caries",
      "el 16 sin caries",
      "no hay caries en el 16",
      "el 16 no presenta caries",
    ]) {
      expect(plan(text).actions).not.toContainEqual(
        expect.objectContaining({ tooth: "16", status: "CARIES" }),
      );
    }
  });

  it("keeps the other tooth of a sentence when one is negated", () => {
    expect(plan("el 16 no tiene caries, el 26 sí tiene caries").actions).toEqual([
      expect.objectContaining({ tooth: "26", status: "CARIES" }),
    ]);
  });

  it("follows 'digo' and 'perdón' corrections", () => {
    expect(plan("caries en el 16, digo en el 26").actions).toEqual([
      expect.objectContaining({ tooth: "26", status: "CARIES" }),
    ]);
    expect(plan("el 16, perdón, el 26 caries").actions).toEqual([
      expect.objectContaining({ tooth: "26", status: "CARIES" }),
    ]);
  });

  it("plans a treatment the patient needs instead of marking it as done", () => {
    expect(plan("el 36 requiere endodoncia").actions).toEqual([
      expect.objectContaining({ type: "clinical.add_item", tooth: "36" }),
    ]);
  });

  it("reads 'ficha 16' as a record number, never as a tooth", () => {
    const actions = plan("abre la ficha 16").actions;
    expect(actions).toContainEqual({ type: "patient.resolve", query: "16" });
    expect(actions).toContainEqual({ type: "navigation.patient", patientRef: "16" });
  });

  it("reads a spoken calendar date instead of defaulting to today", () => {
    const result = plan("dame cita el 16 de octubre a las 10");
    const schedule = result.actions.find((action) => action.type === "appointment.schedule");
    expect(schedule).toMatchObject({ dateText: "16/10", timeText: "10:00", patientRef: "" });
    expect(result.actions.some((action) => action.type === "patient.resolve")).toBe(false);
  });
});
