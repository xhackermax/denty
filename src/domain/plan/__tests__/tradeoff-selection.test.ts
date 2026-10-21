import { describe, expect, it } from "vitest";

import { hasPhrase, togglePhrase, tradeoffEntriesForPlan } from "../tradeoff-selection";

describe("togglePhrase", () => {
  it("appends a bulleted line after what the dentist wrote", () => {
    expect(togglePhrase("", "Conserva el diente.")).toBe("• Conserva el diente.");
    expect(togglePhrase("Caso favorable.\n\n", "Conserva el diente.")).toBe(
      "Caso favorable.\n• Conserva el diente.",
    );
  });

  it("removes the phrase and keeps the rest untouched", () => {
    const text = "Caso favorable.\n• Conserva el diente.\n• Evita cirugía.";
    expect(togglePhrase(text, "Conserva el diente.")).toBe("Caso favorable.\n• Evita cirugía.");
  });

  it("recognises a phrase typed without the bullet", () => {
    expect(hasPhrase("  Conserva el diente.  ", "Conserva el diente.")).toBe(true);
    expect(hasPhrase("Conserva el diente natural.", "Conserva el diente.")).toBe(false);
  });
});

describe("tradeoffEntriesForPlan", () => {
  it("offers the best row of every treatment before the variants, once each", () => {
    const rows = tradeoffEntriesForPlan([
      { treatmentCode: "IMPLANT", label: "Implante" },
      { treatmentCode: "CROWN_ZIRCONIA", label: "Corona zirconio" },
      { treatmentCode: "IMPLANT", label: "Implante" },
    ]).map((entry) => entry.id);
    expect(rows.slice(0, 2)).toEqual(["b.implante-unitario", "m.corona-de-zirconia"]);
    expect(new Set(rows).size).toBe(rows.length);
    expect(rows.length).toBeLessThanOrEqual(8);
  });

  it("offers nothing for no treatments", () => {
    expect(tradeoffEntriesForPlan([])).toEqual([]);
  });
});
