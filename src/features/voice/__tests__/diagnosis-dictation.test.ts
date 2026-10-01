import { expect, test } from "vitest";
import { planLocalVoiceCommand } from "../local-nlu";
import { parseDiagnosisDictation } from "../diagnosis-dictation";
test.each([
  ["diagnóstico encía sana", "healthy"],
  ["diagnóstico gingivitis, nota: sangrado sin pérdida de inserción", "gingivitis"],
  ["periodontitis estadio tres grado B generalizada, nota: pérdida de inserción", "periodontitis"],
  ["bruxismo del sueño con desgaste y dolor articular", "bruxism"],
])("interprets %s through the clinical validation contract", (text, value) => {
  const parsed = parseDiagnosisDictation(text);
  expect(parsed).toMatchObject({ input: { value } });
  const plan = planLocalVoiceCommand(text, { patientId: "p" });
  expect(plan.actions).toContainEqual(
    expect.objectContaining({
      type: "clinical.diagnosis",
      diagnosis: expect.objectContaining({ value }),
    }),
  );
  expect(plan.requiresConfirmation).toBe(true);
});
test("missing justification requests clarification without clinical writes", () => {
  expect(parseDiagnosisDictation("diagnóstico gingivitis")).toMatchObject({
    error: expect.any(String),
  });
  const plan = planLocalVoiceCommand("diagnóstico gingivitis", { patientId: "p" });
  expect(plan.actions).toEqual([]);
  expect(plan.ambiguities.length).toBeGreaterThan(0);
  expect(parseDiagnosisDictation("sondaje 36 MV tres")).toBeNull();
});

test("clinical note wording does not change the selected diagnosis", () => {
  expect(
    parseDiagnosisDictation("diagnóstico gingivitis, nota: descartar periodontitis"),
  ).toMatchObject({ input: { value: "gingivitis" } });
});
test.each([
  [
    "diagnóstico bruxismo en vigilia posible con hipertrofia maseterina, fracturas, línea alba y lengua festoneada",
    "awake",
    "possible",
  ],
  ["bruxismo en vigilia y sueño definitivo", "both", "definite"],
  ["diagnóstico sin bruxismo", "sleep", "probable"],
])("captures bruxism evidence: %s", (text, type, certainty) => {
  expect(parseDiagnosisDictation(text)).toMatchObject({ input: { detail: { type, certainty } } });
});
test("captures extent and requests an explicit periodontal diagnosis", () => {
  expect(
    parseDiagnosisDictation(
      "periodontitis estadio cuatro grado C localizada, nota: pérdida dental",
    ),
  ).toMatchObject({ input: { detail: { stage: "IV", grade: "C", extent: "localized" } } });
  expect(
    parseDiagnosisDictation("periodontitis estadio dos molar incisivo, nota: CAL"),
  ).toMatchObject({ input: { detail: { stage: "II", extent: "molar_incisor" } } });
  expect(parseDiagnosisDictation("diagnóstico desconocido")).toMatchObject({
    error: expect.any(String),
  });
});
