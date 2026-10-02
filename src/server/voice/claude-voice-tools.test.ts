import { describe, expect, it } from "vitest";

import {
  CLAUDE_VOICE_SYSTEM,
  CLAUDE_VOICE_TOOLS,
  actionsFromToolCalls,
} from "./claude-voice-tools";

describe("Claude voice tools", () => {
  it("declares strict schemas", () => {
    for (const tool of CLAUDE_VOICE_TOOLS) {
      expect(tool.strict).toBe(true);
      expect(tool.input_schema.additionalProperties).toBe(false);
      expect(Object.keys(tool.input_schema.properties ?? {}).sort()).toEqual(
        [...(tool.input_schema.required ?? [])].sort(),
      );
    }
  });

  it("maps findings, treatments, notes and periodontics to Denty actions", () => {
    const result = actionsFromToolCalls([
      { name: "marcar_hallazgo", input: { diente: "36", hallazgo: "caries", caras: ["D"] } },
      {
        name: "marcar_tratamiento",
        input: { diente: "36", tratamiento: "obturacion", estado: "pendiente", caras: ["D"] },
      },
      {
        name: "marcar_tratamiento",
        input: { diente: "11", tratamiento: "corona", estado: "realizado", caras: [] },
      },
      {
        name: "marcar_tratamiento",
        input: { diente: "46", tratamiento: "obturacion", estado: "defectuoso", caras: ["O"] },
      },
      { name: "anotar_nota", input: { texto: "Refiere dolor al frío en el 36." } },
      {
        name: "registrar_periodoncia",
        input: {
          diente: "16",
          sitio: "DV",
          profundidad_mm: 5,
          recesion_mm: null,
          movilidad: null,
          sangrado: true,
          supuracion: false,
          placa: false,
        },
      },
    ]);
    expect(result.ambiguities).toEqual([]);
    expect(result.actions).toEqual([
      {
        type: "odontogram.set_state",
        patientRef: "",
        tooth: "36",
        status: "CARIES",
        surfaces: ["D"],
      },
      {
        type: "clinical.add_item",
        patientRef: "",
        tooth: "36",
        treatmentCode: "restoration",
        label: "Obturación 36",
        surfaces: ["D"],
      },
      {
        type: "clinical.complete_item",
        patientRef: "",
        tooth: "11",
        treatmentCode: "crown",
        label: "Corona 11",
        surfaces: [],
      },
      {
        type: "clinical.mark_unsatisfactory",
        patientRef: "",
        tooth: "46",
        treatmentCode: "restoration",
        label: "Obturación 46",
        surfaces: ["O"],
      },
      { type: "clinical.note", patientRef: "", text: "Refiere dolor al frío en el 36." },
      {
        type: "periodontal.update",
        patientRef: "",
        tooth: "16",
        site: "DV",
        probingDepth: 5,
        bleeding: true,
      },
    ]);
  });

  it("turns invalid model output and clarification requests into ambiguities", () => {
    const result = actionsFromToolCalls([
      { name: "marcar_hallazgo", input: { diente: "99", hallazgo: "caries", caras: [] } },
      { name: "borrar_todo", input: {} },
      { name: "pedir_aclaracion", input: { pregunta: "el número de diente." } },
    ]);
    expect(result.actions).toEqual([]);
    expect(result.ambiguities).toEqual([
      "no he entendido bien parte de la orden",
      "no he entendido bien parte de la orden",
      "el número de diente",
    ]);
  });

  it("rejects teeth that do not exist in FDI and accepts primary teeth", () => {
    const invalid = actionsFromToolCalls([
      { name: "marcar_hallazgo", input: { diente: "19", hallazgo: "caries", caras: [] } },
    ]);
    expect(invalid.actions).toEqual([]);
    const primary = actionsFromToolCalls([
      { name: "marcar_hallazgo", input: { diente: "55", hallazgo: "caries", caras: [] } },
    ]);
    expect(primary.actions).toEqual([expect.objectContaining({ tooth: "55" })]);
  });
});

describe("CLAUDE_VOICE_SYSTEM scope", () => {
  it("tells Claude that agenda, payments and absences are not available and must be clarified", () => {
    expect(CLAUDE_VOICE_SYSTEM).toMatch(/citas/i);
    expect(CLAUDE_VOICE_SYSTEM).toMatch(/cobros/i);
    expect(CLAUDE_VOICE_SYSTEM).toMatch(/pedir_aclaracion/);
  });
});
