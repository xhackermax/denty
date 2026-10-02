import { describe, expect, it } from "vitest";

import type { VoicePreview } from "../voice-router";
import { buildVoicePreviewView } from "../voice-preview-view";

function preview(overrides: Partial<VoicePreview["plan"]>, unsupported: string[] = []) {
  return {
    planToken: "token",
    plan: {
      raw: "x",
      actions: [],
      ambiguities: [],
      readback: "Voy a hacerlo.",
      confidence: 0.9,
      source: "rules",
      ...overrides,
    },
    unsupportedActions: unsupported,
  } as unknown as VoicePreview;
}

describe("buildVoicePreviewView", () => {
  it("names the target patient, the tooth, the surface and the clinical state", () => {
    const view = buildVoicePreviewView(
      preview({
        contextPatientId: "p1",
        readback: "Voy a apuntar caries en el 16 (O).",
        actions: [
          {
            type: "odontogram.set_state",
            patientRef: "",
            tooth: "16",
            status: "CARIES",
            surfaces: ["O"],
          },
        ],
      }),
      (id) => (id === "p1" ? "Ana López · ficha 120" : undefined),
    );
    expect(view.patientLabel).toBe("Ana López · ficha 120");
    expect(view.actions[0]?.details).toEqual([
      { label: "Diente", value: "16" },
      { label: "Superficie", value: "oclusal" },
      { label: "Estado", value: "Caries (hallazgo)" },
    ]);
    expect(view.canConfirm).toBe(true);
    expect(view.source).toBe("rules");
  });

  it("separates performed treatments from planned ones", () => {
    const view = buildVoicePreviewView(
      preview({
        contextPatientId: "p1",
        actions: [
          {
            type: "clinical.complete_item",
            patientRef: "",
            tooth: "36",
            treatmentCode: "ENDO",
            label: "Endodoncia",
            surfaces: [],
          },
        ],
      }),
      () => undefined,
    );
    expect(view.actions[0]?.details).toContainEqual({ label: "Estado", value: "Realizado" });
  });

  it("asks for the patient when none is resolved", () => {
    const view = buildVoicePreviewView(
      preview({
        actions: [{ type: "odontogram.set_state", patientRef: "", tooth: "16", status: "CARIES" }],
      }),
      () => undefined,
    );
    expect(view.patientLabel).toBeUndefined();
    expect(view.canConfirm).toBe(false);
    expect(view.blockers).toContain("Abre la ficha del paciente o di su nombre.");
  });

  it("blocks actions that are not connected yet", () => {
    const view = buildVoicePreviewView(
      preview(
        {
          contextPatientId: "p1",
          ambiguities: ["método de pago"],
          actions: [{ type: "payment.record", patientRef: "", amountCents: 5000 }],
        },
        ["payment.record"],
      ),
      () => "Ana",
    );
    expect(view.canConfirm).toBe(false);
    expect(view.ambiguities).toEqual(["método de pago"]);
    expect(view.blockers[0]).toMatch(/todavía no se puede ejecutar/);
    const amount = view.actions[0]?.details.find((detail) => detail.label === "Importe");
    expect(amount?.value.replace(/\s/g, " ")).toBe("50,00 €");
  });

  it("does not require a patient for navigation", () => {
    const view = buildVoicePreviewView(
      preview({ actions: [{ type: "navigation.open", destination: "agenda" }] }),
      () => undefined,
    );
    expect(view.canConfirm).toBe(true);
    expect(view.blockers).toEqual([]);
  });

  it("hides the internal patient lookup step", () => {
    const view = buildVoicePreviewView(
      preview({
        contextPatientId: "p1",
        actions: [
          { type: "patient.resolve", query: "Ana" },
          { type: "navigation.patient", patientRef: "Ana" },
        ],
      }),
      () => "Ana López",
    );
    expect(view.actions).toHaveLength(1);
  });

  it("marks interpretations that came from the AI model", () => {
    const view = buildVoicePreviewView(preview({ source: "claude" }), () => undefined);
    expect(view.source).toBe("claude");
  });
});
