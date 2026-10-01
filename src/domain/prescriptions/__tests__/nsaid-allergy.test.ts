import { expect, test } from "vitest";
import { hasNsaidAllergy, isNsaidMedication, prescriptionAllergyConflicts } from "../nsaid-allergy";
import { PRESCRIPTION_PROTOCOLS } from "../dental-vademecum";

test.each(["AINEs", "antiinflamatorios", "Ibuprofeno", "alergia a aspirina"])(
  "recognizes allergy %s",
  (allergy) => {
    expect(hasNsaidAllergy({ allergies: [allergy] })).toBe(true);
  },
);
test.each([
  "Ibuprofeno 600 mg",
  "Dexketoprofeno",
  "Naproxeno",
  "Diclofenaco",
  "ácido acetilsalicílico",
  "Enantyum",
  "Celecoxib",
  "Ibuprofeno / codeína",
])("identifies NSAID %s", (name) => {
  expect(isNsaidMedication(name)).toBe(true);
});
test.each(["Paracetamol", "Tramadol / paracetamol", "Amoxicilina", "", "Metamizol"])(
  "does not label %s an NSAID",
  (name) => {
    expect(isNsaidMedication(name)).toBe(false);
  },
);
test("checks free text and tolerates absent profiles", () => {
  expect(
    prescriptionAllergyConflicts({ allergies: ["AINEs"] }, ["Paracetamol", "Naproxeno"]),
  ).toEqual(["Naproxeno"]);
  expect(prescriptionAllergyConflicts(undefined, ["Ibuprofeno"])).toEqual([]);
  expect(hasNsaidAllergy({ allergies: ["Penicilina"] })).toBe(false);
});
test("five NSAID allergy protocols contain no NSAID or default metamizole", () => {
  const safe = PRESCRIPTION_PROTOCOLS.filter((p) => p.label.includes("AINEs"));
  expect(safe).toHaveLength(5);
  for (const p of safe) {
    expect(p.medications.some(isNsaidMedication)).toBe(false);
    expect(p.medications).not.toContain("Metamizol");
    expect(
      p.medications.includes("Paracetamol") && p.medications.includes("Tramadol / paracetamol"),
    ).toBe(false);
  }
});
