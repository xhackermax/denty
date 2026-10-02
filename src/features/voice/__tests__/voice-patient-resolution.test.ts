import { describe, expect, it } from "vitest";

import { decidePatient } from "../voice-patient-resolution";
import { previewVoiceCommand } from "../voice-router";

const ANA_LOPEZ = { id: "a1", firstName: "Ana", lastName: "López", recordNumber: "120" };
const ANA_MARTIN = { id: "a2", firstName: "Ana", lastName: "Martín", recordNumber: "77" };
const LUIS = { id: "l1", firstName: "Luis", lastName: "Pérez", recordNumber: "16" };
const ALL = [ANA_LOPEZ, ANA_MARTIN, LUIS];

describe("decidePatient", () => {
  it("leaves orders without a patient name untouched", () => {
    const base = previewVoiceCommand("abre la agenda");
    expect(decidePatient(base, ALL, { search: false })).toEqual({ kind: "preview", preview: base });
  });

  it("opens a chart only for one exact match", () => {
    const outcome = decidePatient(previewVoiceCommand("abre la ficha de Ana López"), ALL, {
      search: false,
    });
    expect(outcome).toMatchObject({
      kind: "preview",
      preview: { plan: { contextPatientId: "a1" } },
    });
  });

  it("resolves a record number", () => {
    const outcome = decidePatient(previewVoiceCommand("abre la ficha 16"), ALL, { search: false });
    expect(outcome).toMatchObject({
      kind: "preview",
      preview: { plan: { contextPatientId: "l1" } },
    });
  });

  it("lets the person choose when the name fits several patients", () => {
    const outcome = decidePatient(previewVoiceCommand("abre la ficha de Ana"), ALL, {
      search: false,
    });
    expect(outcome.kind).toBe("choose");
    if (outcome.kind === "choose") {
      expect(outcome.options.map((option) => option.id).sort()).toEqual(["a1", "a2"]);
      expect(outcome.navigate).toBe(true);
    }
  });

  it("always lists matches for an explicit search, even a single one", () => {
    const outcome = decidePatient(previewVoiceCommand("busca a Luis Pérez"), ALL, { search: true });
    expect(outcome).toMatchObject({ kind: "choose", options: [{ id: "l1" }] });
  });

  it("reports when nobody matches", () => {
    expect(
      decidePatient(previewVoiceCommand("abre la ficha de Zoe"), ALL, { search: false }),
    ).toEqual({
      kind: "not_found",
      query: "Zoe",
    });
  });

  it("asks which patient before a clinical change with an ambiguous name", () => {
    const base = previewVoiceCommand("marca caries en el 16");
    const named = {
      ...base,
      plan: {
        ...base.plan,
        actions: [{ type: "patient.resolve" as const, query: "Ana" }, ...base.plan.actions],
      },
    };
    const outcome = decidePatient(named, ALL, { search: false });
    expect(outcome).toMatchObject({ kind: "choose", navigate: false });
    if (outcome.kind === "choose") expect(outcome.options).toHaveLength(2);
  });

  it("assigns a clinical change to a single strong match", () => {
    const base = previewVoiceCommand("marca caries en el 16");
    const named = {
      ...base,
      plan: {
        ...base.plan,
        actions: [{ type: "patient.resolve" as const, query: "Luis Pérez" }, ...base.plan.actions],
      },
    };
    expect(decidePatient(named, ALL, { search: false })).toMatchObject({
      kind: "preview",
      preview: { plan: { contextPatientId: "l1" } },
    });
  });

  it("does not switch away from the open chart on a weak match", () => {
    const base = previewVoiceCommand("marca caries en el 16", { patientId: "open" });
    expect(decidePatient(base, ALL, { search: false })).toEqual({ kind: "preview", preview: base });
  });
});
