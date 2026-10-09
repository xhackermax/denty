import { describe, expect, it } from "vitest";

import { canAssignTaskTo, taskAssignmentChoices } from "../task-delegation";

const staff = [
  { id: "admin", name: "Administrador", role: "ADMIN" },
  { id: "dentist", name: "Doctor", role: "DENTIST" },
  { id: "dentist-2", name: "Otra doctora", role: "DENTIST" },
  { id: "reception", name: "Secretaria", role: "RECEPTION" },
  { id: "assistant", name: "Auxiliar / higienista", role: "ASSISTANT" },
] as const;

describe("task delegation rules", () => {
  it("administration can assign to every active staff role", () => {
    expect(taskAssignmentChoices("ADMIN", "admin", staff)).toHaveLength(5);
  });

  it("dentists may delegate only to reception, assistants/hygienists and themselves", () => {
    expect(taskAssignmentChoices("DENTIST", "dentist", staff).map((s) => s.id)).toEqual([
      "dentist", "reception", "assistant",
    ]);
    expect(canAssignTaskTo("DENTIST", "dentist", staff[0])).toBe(false);
    expect(canAssignTaskTo("DENTIST", "dentist", staff[2])).toBe(false);
  });

  it("reception and assistants may only assign to their own staff record", () => {
    expect(taskAssignmentChoices("RECEPTION", "reception", staff).map((s) => s.id))
      .toEqual(["reception"]);
    expect(taskAssignmentChoices("ASSISTANT", "assistant", staff).map((s) => s.id))
      .toEqual(["assistant"]);
  });

  it("without a linked staff identity non-admin users cannot self-assign to another role", () => {
    expect(taskAssignmentChoices("RECEPTION", null, staff)).toEqual([]);
    expect(taskAssignmentChoices("PATIENT", "dentist", staff)).toEqual([]);
    expect(taskAssignmentChoices("DENTIST", null, staff).map((s) => s.id))
      .toEqual(["reception", "assistant"]);
  });
});
