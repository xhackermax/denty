import { describe, expect, it } from "vitest";

import { comparePlanAlternatives } from "../plan-alternatives-comparison";
import {
  clinicalGuards,
  deferralAdvice,
  matchingScenarios,
  planTradeoffContext,
  specialtyNotes,
} from "../tradeoff-context";
import { tradeoffEntriesFor, tradeoffEntry } from "../treatment-tradeoffs";
import type { TradeoffEntry } from "../tradeoff-catalog/types";

const rows = (...ids: string[]) => ids.map((id) => tradeoffEntry(id) as TradeoffEntry);

describe("matchingScenarios", () => {
  it("recognises implant against bridge in either plan order", () => {
    const implant = tradeoffEntriesFor({ treatmentCode: "IMPLANT", label: "Implante" });
    const bridge = tradeoffEntriesFor({ treatmentCode: "BRIDGE", label: "Puente 45-47" });
    expect(matchingScenarios([implant, bridge]).map((s) => s.id)).toContain("S03");
    expect(matchingScenarios([bridge, implant]).map((s) => s.id)).toContain("S03");
  });

  it("needs each option in a different plan", () => {
    const both = rows("b.implante-unitario", "b.puente-fijo-convencional");
    expect(matchingScenarios([both]).map((s) => s.id)).not.toContain("S03");
    expect(matchingScenarios([])).toEqual([]);
  });
});

describe("deferralAdvice", () => {
  it("explains leaving a gap after an extraction and offers not replacing the tooth", () => {
    const advice = deferralAdvice(rows("b.extraccion-sin-reposicion", "b.implante-unitario"));
    expect(advice.consequences.map((c) => c.id)).toEqual(
      expect.arrayContaining(["C02", "C03", "C10"]),
    );
    expect(advice.options.map((o) => o.id)).toContain("m.no-reponer-un-diente-ausente");
  });

  it("offers observation for orthodontics and nothing for no treatments", () => {
    expect(deferralAdvice(rows("b.alineadores")).options.map((o) => o.id)).toEqual([
      "b.observacion-no-tratar-ortodoncia",
    ]);
    expect(deferralAdvice([])).toEqual({ options: [], consequences: [] });
  });
});

describe("clinicalGuards", () => {
  it("warns against an automatic post and always reminds to confirm the diagnosis", () => {
    const guards = clinicalGuards(rows("b.poste-reconstruccion")).map((g) => g.id);
    expect(guards).toContain("G03");
    expect(guards.at(-1)).toBe("G10");
    expect(clinicalGuards([]).map((g) => g.id)).toEqual(["G10"]);
  });
});

describe("specialtyNotes", () => {
  it("returns the notes of the specialties involved only", () => {
    expect(specialtyNotes(rows("m.endodoncia-unirradicular")).map((s) => s.id)).toEqual([
      "endodoncia",
    ]);
    expect(specialtyNotes(rows("m.corona-de-zirconia"))).toEqual([]);
  });
});

describe("planTradeoffContext", () => {
  const comparison = comparePlanAlternatives(
    [
      { id: "p1", treatmentCode: "EXTRACTION", label: "Exodoncia", tooth: "36" },
      { id: "p2", treatmentCode: "IMPLANT", label: "Implante", tooth: "36" },
    ],
    [
      {
        id: "b1",
        title: "Puente",
        items: [
          { id: "i1", clinicalPlanItemId: "p1", description: "Exodoncia", tooth: "36" },
          { id: "i2", description: "Puente 35-37", tooth: "35" },
        ],
      },
    ],
  );

  it("finds the scenario from what differs and the deferral advice from every treatment", () => {
    const context = planTradeoffContext(comparison);
    expect(context.scenarios.map((s) => s.id)).toContain("S03");
    expect(context.deferral.consequences.map((c) => c.id)).toContain("C02");
    expect(context.deferral.options.map((o) => o.id)).toContain("m.no-reponer-un-diente-ausente");
    expect(context.guards.at(-1)?.id).toBe("G10");
  });

  it("is empty without treatments", () => {
    expect(planTradeoffContext(comparePlanAlternatives([], []))).toEqual({
      scenarios: [],
      deferral: { options: [], consequences: [] },
      guards: [],
      notes: [],
      criteria: [],
      sources: [],
    });
  });

  it("adds the worked comparison of part I when keeping a tooth is weighed against an implant", () => {
    const context = planTradeoffContext(
      comparePlanAlternatives(
        [{ id: "p1", treatmentCode: "ENDODONTICS", label: "Endodoncia", tooth: "36" }],
        [
          {
            id: "b1",
            title: "Implante",
            items: [
              { id: "i1", description: "Extracción", tooth: "36" },
              { id: "i2", description: "Implante", tooth: "36" },
            ],
          },
        ],
      ),
    );
    expect(context.criteria.map((item) => item.scenarioId)).toContain("S02");
    expect(context.criteria[0]?.criteria.length).toBeGreaterThan(3);
    expect(context.sources.map((source) => source.id)).toEqual(
      expect.arrayContaining(["R01", "R02"]),
    );
  });
});
