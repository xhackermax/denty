import { describe, expect, it } from "vitest";

import type { RecallTemplate } from "@/shared/api/schemas/recalls";

import {
  draftFromTemplate,
  emptyRecallDraft,
  firstInvalidStep,
  parseOffsets,
  stepIssues,
  withSuggestedCode,
} from "../recall-template-draft";

const template: RecallTemplate = {
  ...emptyRecallDraft(),
  id: "t1",
  code: "HIGIENE_SEMESTRAL_PARA_PACIENTES_PERIODONTALES_X",
  name: "Higiene semestral",
  archivedAt: null,
  version: 3,
  createdAt: "2026-10-27T08:00:00Z",
  updatedAt: "2026-10-27T08:00:00Z",
  openCount: 4,
  overdueCount: 1,
};

describe("recall template draft", () => {
  it("starts with the blueprint defaults and messaging off", () => {
    expect(emptyRecallDraft()).toMatchObject({
      intervalValue: 6,
      intervalUnit: "MESES",
      leadDays: 14,
      maxAttempts: 3,
      autoRecurrence: true,
      messagingEnabled: false,
      anchorType: "FECHA_MANUAL",
    });
  });

  it("suggests the code from the name until the user edits it", () => {
    const draft = withSuggestedCode(emptyRecallDraft(), "Revisión ortodoncia", false);
    expect(draft.code).toBe("REVISION_ORTODONCIA");
    expect(withSuggestedCode({ ...draft, code: "MIO" }, "Otra", true).code).toBe("MIO");
  });

  it("duplicates with a new code within 48 characters", () => {
    const copy = draftFromTemplate(template, true);
    expect(copy.code.endsWith("_COPIA")).toBe(true);
    expect(copy.code.length).toBeLessThanOrEqual(48);
    expect(copy.name).toBe("Higiene semestral (copia)");
    expect(draftFromTemplate(template).code).toBe(template.code);
  });

  it("reports issues only for the fields of each step, in Spanish", () => {
    const draft = { ...emptyRecallDraft(), name: "ab", code: "", intervalValue: 0 };
    expect(stepIssues(draft, "identity")).toEqual({
      code: "Usa mayúsculas, números y guion bajo (máximo 48).",
      name: "Entre 3 y 100 caracteres.",
    });
    expect(stepIssues(draft, "scheduling")).toEqual({
      intervalValue: "Un número entero entre 1 y 120.",
    });
    expect(firstInvalidStep(draft)).toBe("identity");
  });

  it("asks for channels only when messaging is on", () => {
    const draft = { ...emptyRecallDraft(), code: "X", name: "Revisión", messagingEnabled: true };
    expect(stepIssues(draft, "communications")).toEqual({ channels: "Elige al menos un canal." });
    expect(firstInvalidStep({ ...draft, channels: ["SMS"] })).toBeNull();
  });

  it("parses reminder days typed as a list", () => {
    expect(parseOffsets("14, 2 ; -7 x 3.5")).toEqual([14, 2, -7]);
  });
});
