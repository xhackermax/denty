import { expect, test } from "vitest";
import { validateDiagnosis, suggestPeriodontalDiagnosis } from "../index";
import { suggestedQuadrants, treatmentSuggestions } from "../treatment-suggestions";
import type { PeriodontalReading } from "@/domain/periodontal";
test("requires justification and limits staging to periodontitis", () => {
  expect(() =>
    validateDiagnosis({
      category: "periodontal",
      value: "gingivitis",
      detail: {},
      justification: "",
    }),
  ).toThrow();
  expect(() =>
    validateDiagnosis({
      category: "periodontal",
      value: "gingivitis",
      detail: { stage: "III" },
      justification: "Sangrado",
    }),
  ).toThrow();
  expect(
    validateDiagnosis({ category: "periodontal", value: "healthy", detail: {}, justification: "" })
      .value,
  ).toBe("healthy");
});
test("bruxism requires type and certainty; rejects unknown signs", () => {
  expect(() =>
    validateDiagnosis({
      category: "bruxism",
      value: "bruxism",
      detail: { signs: ["unknown"] },
      justification: "",
    }),
  ).toThrow();
  expect(
    validateDiagnosis({
      category: "bruxism",
      value: "bruxism",
      detail: { type: "sleep", certainty: "probable", signs: ["wear"] },
      justification: "",
    }).category,
  ).toBe("bruxism");
});
const readings = (cal: number, pd: number = 3): PeriodontalReading[] =>
  ["16", "26"].map((tooth) => ({
    tooth,
    site: "MV",
    probingDepth: pd,
    recession: cal - pd,
    bleeding: true,
  }));
test.each([
  [1, "I"],
  [3, "II"],
  [5, "III"],
] as const)("suggests stage %s from CAL after checking interproximal sites", (cal, stage) => {
  expect(suggestPeriodontalDiagnosis(readings(cal))).toMatchObject({
    value: "periodontitis",
    detail: { stage },
  });
});
test("stage IV requires complexity or documented periodontal tooth loss", () => {
  expect(suggestPeriodontalDiagnosis(readings(5), { periodontalToothLoss: 5 })).toMatchObject({
    detail: { stage: "IV" },
  });
  expect(suggestPeriodontalDiagnosis(readings(5), { functionalComplexity: true })).toMatchObject({
    detail: { stage: "IV" },
  });
});
test("distinguishes healthy, gingivitis and insufficient examination; does not invent grade", () => {
  expect(suggestPeriodontalDiagnosis([])).toBeNull();
  expect(
    suggestPeriodontalDiagnosis(readings(0).map((r) => ({ ...r, bleeding: false }))),
  ).toMatchObject({ value: "healthy" });
  expect(suggestPeriodontalDiagnosis(readings(0))).toMatchObject({ value: "gingivitis" });
  expect(suggestPeriodontalDiagnosis(readings(5))?.detail.grade).toBeUndefined();
});
test.each(["healthy", "gingivitis", "periodontitis", "bruxism"] as const)(
  "provides explicit clinician selectable suggestions for %s",
  (value) => {
    const suggestions = treatmentSuggestions(value);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((s) => s.code && s.label)).toBe(true);
  },
);
test("root planing has quadrant scope and periodontal consent; surgical option is conditional", () => {
  expect(
    treatmentSuggestions("periodontitis").find((s) => s.code === "ROOT_PLANING"),
  ).toMatchObject({ scope: "quadrant", consentCode: "CONSENT_PERIO" });
  expect(treatmentSuggestions("periodontitis").some((s) => s.code === "PERIO_SURGERY")).toBe(false);
  expect(
    treatmentSuggestions("periodontitis", { residualPocketDepth: 6 }).some(
      (s) => s.code === "PERIO_SURGERY",
    ),
  ).toBe(true);
  expect(treatmentSuggestions("no_bruxism")).toEqual([]);
});

test("uses grade evidence and only estimates extent for sufficiently complete charts", () => {
  expect(suggestPeriodontalDiagnosis(readings(5), { boneLossAgeRatio: 0.2 })?.detail.grade).toBe(
    "A",
  );
  expect(suggestPeriodontalDiagnosis(readings(5), { boneLossAgeRatio: 0.5 })?.detail.grade).toBe(
    "B",
  );
  expect(
    suggestPeriodontalDiagnosis(readings(5), { boneLossAgeRatio: 2, smokingPerDay: 2 })?.detail
      .grade,
  ).toBe("C");
  expect(suggestPeriodontalDiagnosis(readings(5), { smokingPerDay: 10 })?.detail.grade).toBe("C");
  expect(suggestPeriodontalDiagnosis(readings(5), { diabetesHbA1c: 6.5 })?.detail.grade).toBe("B");
  const full = [
    "18",
    "17",
    "16",
    "15",
    "14",
    "13",
    "12",
    "11",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "38",
    "37",
    "36",
    "35",
  ].map((tooth) => ({ tooth, site: "MV" as const, probingDepth: 5, recession: 0 }));
  expect(suggestPeriodontalDiagnosis(full)?.detail.extent).toBe("generalized");
  expect(suggestedQuadrants([...readings(5, 4), { tooth: "36", probingDepth: 2 }])).toEqual([1, 2]);
  expect(treatmentSuggestions("unknown")).toEqual([]);
});
test.each([
  ["11", "21"],
  ["31", "41"],
])("adjacent central incisors %s/%s do not satisfy nonadjacent attachment loss", (a, b) => {
  const readings: PeriodontalReading[] = [a, b].map((tooth) => ({
    tooth,
    site: "MV",
    probingDepth: 6,
    recession: 0,
  }));
  expect(suggestPeriodontalDiagnosis(readings)?.value).not.toBe("periodontitis");
});
