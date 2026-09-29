import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildDentalLexicon } from "../../../../scripts/nlu/build-dental-lexicon.mjs";
import generated from "../dental-lexicon.generated.json";
import { canonicalizeDentalSpeech } from "../dental-normalizer";
import { planLocalVoiceCommand, type LocalVoiceAction } from "../local-nlu";

function actions(utterance: string) {
  return planLocalVoiceCommand(utterance, { patientId: "p1" }).actions.map((action) => {
    const { patientRef: _patientRef, ...rest } = action as LocalVoiceAction & {
      patientRef?: string;
    };
    return rest;
  });
}

describe("dental lexicon", () => {
  it("is generated from the current dictionary", () => {
    const dictionary = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "docs/nlu/denty-nlu-diccionario-dental.v2.json"),
        "utf8",
      ),
    );
    expect(generated).toEqual(buildDentalLexicon(dictionary));
  });
});

describe("canonicalizeDentalSpeech", () => {
  it("normalizes teeth, regional words and surfaces", () => {
    expect(canonicalizeDentalSpeech("Eh, calza en el dos seis por fuera")).toBe(
      "obturacion en el 26 vestibular",
    );
    expect(canonicalizeDentalSpeech("funda en el treinta y seis")).toBe("corona en el 36");
    expect(canonicalizeDentalSpeech("matar el nervio del 1.6")).toBe("endodoncia del 16");
    expect(canonicalizeDentalSpeech("el ocho de arriba a la derecha")).toBe("el 18");
  });

  it("keeps times and prices as numbers", () => {
    expect(canonicalizeDentalSpeech("a las dos seis")).toBe("a las dos seis");
    expect(canonicalizeDentalSpeech("cobra 26 euros")).toBe("cobra 26 euros");
  });
});

describe("real dental speech (dictionary edge cases)", () => {
  it("understands chairside phrasing", () => {
    expect(actions("el 26 tiene caries por distal")).toEqual([
      { type: "odontogram.set_state", tooth: "26", status: "CARIES", surfaces: ["D"] },
    ]);
    expect(actions("caries en 26 distal, no perdón, mesial")).toEqual([
      { type: "odontogram.set_state", tooth: "26", status: "CARIES", surfaces: ["M"] },
    ]);
    expect(actions("sácame el ocho de arriba a la derecha")).toEqual([
      {
        type: "clinical.add_item",
        tooth: "18",
        treatmentCode: "extraction",
        label: "Extracción 18",
        surfaces: [],
      },
    ]);
    expect(actions("la muela de abajo a la izquierda que es la seis tiene caries")).toEqual([
      { type: "odontogram.set_state", tooth: "36", status: "CARIES", surfaces: [] },
    ]);
    expect(actions("el paciente no tiene el 18")).toEqual([
      { type: "odontogram.set_state", tooth: "18", status: "MISSING" },
    ]);
    expect(actions("anota que el paciente refiere dolor al frío en el 36")).toEqual([
      { type: "clinical.note", text: "El paciente refiere dolor al frío en el 36" },
    ]);
  });

  it("does not invent teeth, caries or patients", () => {
    expect(actions("cobra 26 euros con tarjeta").some((a) => a.type.startsWith("odontogram"))).toBe(
      false,
    );
    expect(actions("quita la caries del 26")).toEqual([]);
    expect(
      actions("marca caries distal en 26, planifica una resina y pásalo al presupuesto").some(
        (action) => action.type === "patient.resolve",
      ),
    ).toBe(false);
    expect(actions("busca a Laura Gómez")).toContainEqual({
      type: "patient.resolve",
      query: "Laura Gómez",
    });
  });
});
