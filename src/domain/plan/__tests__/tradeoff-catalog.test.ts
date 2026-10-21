import { describe, expect, it } from "vitest";

import { ARGUMENT_BANK } from "../tradeoff-catalog/argument-bank";
import { COMPARISON_SCENARIOS } from "../tradeoff-catalog/comparison-scenarios";
import {
  CLINICAL_GUARDS,
  DEFERRAL_CONSEQUENCES,
  NO_TREATMENT_OPTIONS,
} from "../tradeoff-catalog/continuity";
import { TRADEOFF_SPECIALTIES, TREATMENT_MATRIX } from "../tradeoff-catalog/treatment-matrix";
import { TRADEOFF_ENTRIES, tradeoffEntry } from "../treatment-tradeoffs";

// Counts from the source document, so a lost row shows up here and not in front of a patient.
describe("tradeoff catalog", () => {
  it("holds every row of the master matrix v1.0", () => {
    expect(TRADEOFF_SPECIALTIES).toHaveLength(12);
    expect(TREATMENT_MATRIX).toHaveLength(179);
    expect(ARGUMENT_BANK).toHaveLength(52);
    expect(COMPARISON_SCENARIOS).toHaveLength(30);
    expect(DEFERRAL_CONSEQUENCES).toHaveLength(10);
    expect(CLINICAL_GUARDS).toHaveLength(10);
  });

  it("gives every row and phrase a unique id and real text", () => {
    const entryIds = TRADEOFF_ENTRIES.map((entry) => entry.id);
    expect(new Set(entryIds).size).toBe(entryIds.length);
    const phrases = TRADEOFF_ENTRIES.flatMap((entry) => [
      ...entry.advantages,
      ...entry.disadvantages,
    ]);
    expect(new Set(phrases.map((phrase) => phrase.id)).size).toBe(phrases.length);
    for (const entry of TRADEOFF_ENTRIES) {
      expect(entry.advantages.length, entry.id).toBeGreaterThan(0);
      expect(entry.disadvantages.length, entry.id).toBeGreaterThan(0);
    }
    for (const phrase of phrases) expect(phrase.text, phrase.id).toMatch(/^\p{Lu}.{2,}/u);
  });

  it("only references rows that exist", () => {
    const referenced = [
      ...COMPARISON_SCENARIOS.flatMap((scenario) =>
        scenario.options.flatMap((option) => option.entryIds),
      ),
      ...DEFERRAL_CONSEQUENCES.flatMap((item) => item.trigger.entryIds ?? []),
      ...CLINICAL_GUARDS.flatMap((guard) =>
        guard.trigger === "always" ? [] : (guard.trigger.entryIds ?? []),
      ),
      ...NO_TREATMENT_OPTIONS.flatMap((option) => [
        option.entryId,
        ...(option.trigger.entryIds ?? []),
      ]),
    ];
    expect(referenced.filter((id) => !tradeoffEntry(id))).toEqual([]);
  });

  it("keeps the source wording", () => {
    expect(
      tradeoffEntry("m.reconstruccion-con-poste-y-munon")?.disadvantages.map((p) => p.text),
    ).toEqual([
      "Requiere conducto tratado",
      "No refuerza la raíz",
      "Puede complicar retratamiento",
    ]);
    expect(tradeoffEntry("b.brackets")?.disadvantages.map((p) => p.text)).toEqual([
      "Visibles y dificultan la higiene.",
      "Molestias y citas.",
    ]);
  });
});
