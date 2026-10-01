import { expect, test } from "vitest";
import { parsePerioDictation } from "../perio-dictation";
test.each([
  ["tres dos tres", { type: "triplet", values: [3, 2, 3] }],
  ["sangra", { type: "bleeding" }],
  ["sangra mesial", { type: "bleeding", sites: ["mesial"] }],
  ["placa", { type: "plaque" }],
  ["supura", { type: "suppuration" }],
  ["margen menos uno cero menos uno", { type: "margin", values: [-1, 0, -1] }],
  ["movilidad dos", { type: "mobility", value: 2 }],
  ["furca uno", { type: "furcation", value: 1 }],
  ["ausente", { type: "missing" }],
  ["implante", { type: "implant" }],
  ["atrás", { type: "back" }],
  ["corrige", { type: "undo" }],
  ["ir al treinta y seis", { type: "goTo", tooth: "36" }],
  ["cara palatina", { type: "face", face: "palatal" }],
])("parses %s deterministically", (text, command) =>
  expect(parsePerioDictation(text)).toEqual({ command }),
);
test.each([
  "dieciséis dos tres",
  "tres dos",
  "margen menos veinte cero uno",
  "movilidad cuatro",
  "furca cinco",
  "ruido sin comando",
])("rejects incomplete or invalid input: %s", (text) =>
  expect(parsePerioDictation(text)).toMatchObject({ error: expect.any(String) }),
);
