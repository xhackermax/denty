import { describe, expect, it } from "vitest";

import type { LocalVoiceAction, LocalVoicePlan } from "../local-nlu";
import {
  canExecuteVoicePreview,
  patientIdFromPathname,
  previewVoiceCommand,
  primaryHrefForVoicePlan,
  shouldAutoExecuteSpokenPreview,
  type VoicePreview,
} from "../voice-router";

describe("voice router", () => {
  it("extracts the active patient from staff patient routes", () => {
    expect(patientIdFromPathname("/app/patients/patient-42/odontogram")).toBe("patient-42");
    expect(patientIdFromPathname("/app/agenda")).toBeUndefined();
  });

  it("keeps clinical navigation on the active patient", () => {
    const preview = previewVoiceCommand("endodoncia realizada en 22", {
      pathname: "/app/patients/patient-42/odontogram",
    });

    expect(preview.plan.contextPatientId).toBe("patient-42");
    expect(primaryHrefForVoicePlan(preview.plan)).toBe("/app/patients/patient-42/odontogram");
  });

  it("does not fall back to a hardcoded patient", () => {
    const preview = previewVoiceCommand("hay que hacer endodoncia 22", {
      pathname: "/app/agenda",
    });

    expect(primaryHrefForVoicePlan(preview.plan)).toBe("/app/patients");
  });
  it("opens the resolved patient profile instead of the generic patient list", () => {
    const preview = previewVoiceCommand("Oye Denty abre el paciente María García");
    const resolved = {
      ...preview.plan,
      contextPatientId: "patient-1",
    };
    expect(primaryHrefForVoicePlan(resolved)).toBe("/app/patients/patient-1");
  });
});

function makePlan(
  actions: LocalVoiceAction[],
  overrides: Partial<LocalVoicePlan> = {},
): LocalVoicePlan {
  return {
    raw: "test",
    actions,
    ambiguities: [],
    requiresConfirmation: false,
    readback: "",
    confidence: 1,
    source: "rules",
    ...overrides,
  };
}

function makePreview(
  actions: LocalVoiceAction[],
  planOverrides: Partial<LocalVoicePlan> = {},
): VoicePreview {
  return {
    planToken: "test-token",
    plan: makePlan(actions, planOverrides),
    unsupportedActions: [],
  };
}

describe("canExecuteVoicePreview", () => {
  it("returns true when actions exist, no ambiguities, no unsupported", () => {
    const preview = makePreview(
      [
        {
          type: "odontogram.set_state",
          patientRef: "",
          tooth: "14",
          status: "CARIES",
          surfaces: ["D"],
        },
      ],
      { contextPatientId: "p1" },
    );
    expect(canExecuteVoicePreview(preview)).toBe(true);
  });

  it("returns false when there are ambiguities", () => {
    const preview = makePreview(
      [
        {
          type: "odontogram.set_state",
          patientRef: "",
          tooth: "14",
          status: "CARIES",
          surfaces: ["D"],
        },
      ],
      { ambiguities: ["paciente no encontrado"] },
    );
    expect(canExecuteVoicePreview(preview)).toBe(false);
  });

  it("returns false when there are unsupported actions", () => {
    const preview: VoicePreview = {
      planToken: "test",
      plan: makePlan([
        { type: "clinical.alert", patientRef: "", text: "alerta", severity: "HIGH" },
      ]),
      unsupportedActions: ["clinical.alert"],
    };
    expect(canExecuteVoicePreview(preview)).toBe(false);
  });

  it("returns false when no actions exist", () => {
    const preview = makePreview([]);
    expect(canExecuteVoicePreview(preview)).toBe(false);
  });
});

describe("shouldAutoExecuteSpokenPreview", () => {
  it("auto-executes odontogram.set_state on a patient page", () => {
    const preview = makePreview(
      [
        {
          type: "odontogram.set_state",
          patientRef: "",
          tooth: "14",
          status: "CARIES",
          surfaces: ["D"],
        },
      ],
      { contextPatientId: "p1" },
    );
    expect(shouldAutoExecuteSpokenPreview(preview)).toBe(true);
  });

  it("auto-executes clinical.add_item on a patient page", () => {
    const preview = makePreview(
      [
        {
          type: "clinical.add_item",
          patientRef: "",
          tooth: "14",
          treatmentCode: "endodontics",
          label: "Endodoncia",
          surfaces: [],
        },
      ],
      { contextPatientId: "p1" },
    );
    expect(shouldAutoExecuteSpokenPreview(preview)).toBe(true);
  });

  it("auto-executes clinical.complete_item on a patient page", () => {
    const preview = makePreview(
      [
        {
          type: "clinical.complete_item",
          patientRef: "",
          tooth: "14",
          treatmentCode: "endodontics",
          label: "Endodoncia",
          surfaces: [],
        },
      ],
      { contextPatientId: "p1" },
    );
    expect(shouldAutoExecuteSpokenPreview(preview)).toBe(true);
  });

  it("auto-executes clinical.note on a patient page", () => {
    const preview = makePreview([{ type: "clinical.note", patientRef: "", text: "nota clínica" }], {
      contextPatientId: "p1",
    });
    expect(shouldAutoExecuteSpokenPreview(preview)).toBe(true);
  });

  it("does NOT auto-execute without a patient context", () => {
    const preview = makePreview([
      {
        type: "odontogram.set_state",
        patientRef: "",
        tooth: "14",
        status: "CARIES",
        surfaces: ["D"],
      },
    ]);
    expect(shouldAutoExecuteSpokenPreview(preview)).toBe(false);
  });

  it("does NOT auto-execute navigation actions", () => {
    const preview = makePreview([{ type: "navigation.open", destination: "agenda" }], {
      contextPatientId: "p1",
    });
    expect(shouldAutoExecuteSpokenPreview(preview)).toBe(false);
  });

  it("does NOT auto-execute when there are ambiguities", () => {
    const preview = makePreview(
      [
        {
          type: "odontogram.set_state",
          patientRef: "",
          tooth: "14",
          status: "CARIES",
          surfaces: ["D"],
        },
      ],
      { contextPatientId: "p1", ambiguities: ["no está claro"] },
    );
    expect(shouldAutoExecuteSpokenPreview(preview)).toBe(false);
  });

  it("does NOT auto-execute unsupported actions", () => {
    const preview: VoicePreview = {
      planToken: "test",
      plan: makePlan(
        [{ type: "clinical.alert", patientRef: "", text: "alerta", severity: "HIGH" }],
        { contextPatientId: "p1" },
      ),
      unsupportedActions: ["clinical.alert"],
    };
    expect(shouldAutoExecuteSpokenPreview(preview)).toBe(false);
  });

  it("ignores patient.resolve actions when checking auto-execute set", () => {
    const preview = makePreview(
      [
        { type: "patient.resolve", query: "García" },
        {
          type: "odontogram.set_state",
          patientRef: "",
          tooth: "14",
          status: "CARIES",
          surfaces: ["D"],
        },
      ],
      { contextPatientId: "p1" },
    );
    expect(shouldAutoExecuteSpokenPreview(preview)).toBe(true);
  });
});

describe("navigation voice commands", () => {
  it.each(["abrir odontograma", "abre el odontograma", "oye denty abre odontograma"])(
    "%s does not look for a patient named after the destination",
    (command) => {
      const preview = previewVoiceCommand(command, {
        pathname: "/app/patients/patient-42",
      });

      expect(preview.plan.actions.map((action) => action.type)).toEqual(["navigation.open"]);
      expect(preview.plan.ambiguities).toEqual([]);
      expect(primaryHrefForVoicePlan(preview.plan)).toBe("/app/patients/patient-42/odontogram");
    },
  );

  it("sends odontogram navigation to the patient list when no patient is open", () => {
    const preview = previewVoiceCommand("abrir odontograma", { pathname: "/app/agenda" });

    expect(primaryHrefForVoicePlan(preview.plan)).toBe("/app/patients");
  });

  it.each([
    ["abre agenda", "/app/agenda"],
    ["abre laboratorio", "/app/laboratory"],
    ["abre finanzas", "/app/finance"],
  ])("%s opens %s without a patient lookup", (command, href) => {
    const preview = previewVoiceCommand(command, { pathname: "/app" });

    expect(preview.plan.actions.map((action) => action.type)).toEqual(["navigation.open"]);
    expect(primaryHrefForVoicePlan(preview.plan)).toBe(href);
  });
});
