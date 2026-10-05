import { describe, expect, it } from "vitest";

import {
  TREATMENT_GUIDES,
  buildTreatmentPlanDocument,
  treatmentFamily,
  type TreatmentFamily,
} from "../treatment-plan-document";

const item = (
  id: string,
  treatmentCode: string,
  label: string,
  tooth?: string,
  priceCents = 0,
) => ({
  id,
  treatmentCode,
  label,
  status: "PLANNED",
  priceCents,
  ...(tooth ? { tooth } : {}),
});

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

describe("treatmentFamily", () => {
  it.each<[string, string, TreatmentFamily]>([
    ["EXTRACTION", "Exodoncia", "extraction"],
    ["ENDODONTICS", "Endodoncia", "root_canal"],
    ["FILLING", "Obturación", "filling"],
    ["PERIODONTICS", "Raspado y alisado", "periodontal"],
    ["HYGIENE", "Limpieza", "hygiene"],
    ["SPLINT", "Férula de descarga", "splint"],
    ["IMPLANT", "Implante", "implant"],
    ["CROWN_ZIRCONIA", "Corona de zirconio", "crown"],
    ["PROSTHESIS", "Puente fijo", "bridge"],
    ["REMOVABLE", "Prótesis removible", "removable"],
    ["POST", "Perno", "post"],
    ["X", "Ortodoncia invisible", "orthodontics"],
    ["X", "Blanqueamiento", "whitening"],
    ["X", "Carilla", "veneer"],
    ["X", "Elevación de seno", "bone_graft"],
    ["X", "Revisión", "other"],
  ])("%s (%s) is %s", (code, label, family) => {
    expect(treatmentFamily({ treatmentCode: code, label })).toBe(family);
  });
});

describe("plain-language guides", () => {
  const families = Object.keys(TREATMENT_GUIDES) as TreatmentFamily[];

  it.each(families)(
    "%s explains purpose, benefits, drawbacks, alternatives and consequences",
    (family) => {
      const guide = TREATMENT_GUIDES[family];
      expect(guide.name.length).toBeGreaterThan(2);
      expect(guide.what.length).toBeGreaterThan(20);
      expect(guide.why.length).toBeGreaterThan(20);
      expect(guide.benefits.length).toBeGreaterThan(0);
      expect(guide.drawbacks.length).toBeGreaterThan(0);
      expect(guide.alternatives.length).toBeGreaterThan(10);
      expect(guide.ifNotDone.length).toBeGreaterThan(10);
    },
  );

  it.each(families)("%s is written in short sentences anyone can follow", (family) => {
    const guide = TREATMENT_GUIDES[family];
    const text = [
      guide.what,
      guide.why,
      ...guide.benefits,
      ...guide.drawbacks,
      guide.alternatives,
      guide.ifNotDone,
    ].join(" ");
    for (const sentence of sentences(text)) {
      expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(25);
    }
    const all = sentences(text);
    const average =
      all.reduce((sum, sentence) => sum + sentence.split(/\s+/).length, 0) / all.length;
    expect(average).toBeLessThanOrEqual(16);
  });
});

describe("buildTreatmentPlanDocument", () => {
  const plan = [
    item("1", "IMPLANT", "Implante", "36", 90000),
    item("2", "FILLING", "Obturación", "46", 6000),
    item("3", "FILLING", "Obturación", "47", 6000),
    item("4", "EXTRACTION", "Exodoncia", "36", 5000),
    item("5", "ENDODONTICS", "Endodoncia", "25", 20000),
    { ...item("6", "FILLING", "Obturación", "11"), status: "CANCELLED" },
  ];

  it("groups the plan into phase 1 then phase 2, each in clinical order", () => {
    const document = buildTreatmentPlanDocument(plan, { patientName: "Lucía Martín" });
    expect(document.phases.map((phase) => phase.phase)).toEqual(["primary", "secondary"]);
    expect(document.phases[0]!.steps.map((step) => step.family)).toEqual([
      "extraction",
      "root_canal",
      "filling",
    ]);
    expect(document.phases[1]!.steps.map((step) => step.family)).toEqual(["implant"]);
  });

  it("merges the same treatment on several teeth into one explained step", () => {
    const document = buildTreatmentPlanDocument(plan, { patientName: "Lucía Martín" });
    const fillings = document.phases[0]!.steps.find((step) => step.family === "filling")!;
    expect(fillings.teeth).toEqual(["46", "47"]);
    expect(fillings.priceCents).toBe(12000);
    expect(fillings.order).toBe(3);
  });

  it("leaves out cancelled or finished work and totals each phase", () => {
    const document = buildTreatmentPlanDocument(plan, { patientName: "Lucía Martín" });
    expect(document.phases[0]!.totalCents).toBe(37000);
    expect(document.phases[1]!.totalCents).toBe(90000);
    expect(document.totalCents).toBe(127000);
  });

  it("explains why each step comes where it does", () => {
    const document = buildTreatmentPlanDocument(plan, { patientName: "Lucía Martín" });
    for (const phase of document.phases)
      for (const step of phase.steps) expect(step.orderReason.length).toBeGreaterThan(20);
    expect(document.orderSummary.length).toBeGreaterThanOrEqual(3);
  });

  it("greets the patient by name and gives a short overview", () => {
    const document = buildTreatmentPlanDocument(plan, { patientName: "Lucía Martín" });
    expect(document.intro).toContain("Lucía");
    expect(document.intro).toMatch(/dos fases/);
  });

  it("handles an empty plan without inventing treatments", () => {
    const document = buildTreatmentPlanDocument([], { patientName: "Lucía" });
    expect(document.phases).toEqual([]);
    expect(document.totalCents).toBe(0);
  });
});
