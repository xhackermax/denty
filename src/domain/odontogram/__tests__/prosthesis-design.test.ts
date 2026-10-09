import { describe, expect, it } from "vitest";
import {
  PROSTHESIS_ON_IMPLANTS,
  PROSTHESIS_ON_TEETH,
  IMPLANT_ATTACHMENT_TYPES,
  createProsthesisPlan,
} from "../prosthesis-design";

describe("prosthesis design catalogs", () => {
  it("covers requested restorations on natural teeth", () => {
    expect(PROSTHESIS_ON_TEETH.map((item) => item.value)).toEqual([
      "fixed_bridge", "fixed_attachments", "removable_cast_clasps",
      "removable_wrought_clasps", "removable_flexible", "complete_denture",
      "telescopic_complete", "provisional", "immediate",
    ]);
  });
  it("covers implant-supported prostheses and all attachment types", () => {
    expect(PROSTHESIS_ON_IMPLANTS.map((item) => item.value)).toEqual([
      "fixed_blender_bar", "fixed_hybrid", "fixed_attachments",
      "fixed_implants", "removable_locator", "removable_bar", "single_implant",
    ]);
    expect(IMPLANT_ATTACHMENT_TYPES.map((item) => item.value)).toEqual([
      "TI_BASE", "MULTIUNIT", "LOCATOR", "BAR", "FIXED_BRIDGE_ATTACHMENTS",
    ]);
  });
  it("persists support, counts, attachment type and lifecycle in a tooth-anchored entity", () => {
    const plan = createProsthesisPlan({
      selectedTooth: "16", arch: "upper", support: "implants",
      prosthesisType: "fixed_hybrid", lifecycle: "PLANIFICADO",
      teethToRestore: 12, implantCount: 6, attachmentCount: 6, attachmentType: "MULTIUNIT",
    });
    expect(plan).toMatchObject({
      tooth: "16", arch: "upper", entityType: "PROSTHESIS", status: "prosthesis_pending",
      attributes: {
        label: "Prótesis fija híbrida",
        support: "implants", teethToRestore: 12, implantCount: 6,
        attachmentCount: 6, attachmentType: "MULTIUNIT", lifecycle: "PLANIFICADO",
      },
    });
  });
  it("distinguishes a natural-tooth removable from an implant-supported removable", () => {
    const teeth = createProsthesisPlan({
      selectedTooth: "26", arch: "upper", support: "teeth",
      prosthesisType: "removable_cast_clasps", lifecycle: "REALIZADO", teethToRestore: 5,
    });
    const implants = createProsthesisPlan({
      selectedTooth: "26", arch: "upper", support: "implants",
      prosthesisType: "removable_locator", lifecycle: "REALIZADO", teethToRestore: 14,
      implantCount: 4, attachmentCount: 4, attachmentType: "LOCATOR",
    });
    expect(teeth.status).toBe("removable");
    expect(teeth.attributes?.implantCount).toBeUndefined();
    expect(implants.entityType).toBe("REMOVABLE");
    expect(implants.attributes?.support).toBe("implants");
    expect(implants.id).not.toBe(teeth.id);
  });
  it("rejects invalid counts and mismatched dental arch", () => {
    const base = {
      selectedTooth: "16", arch: "upper" as const, support: "implants" as const,
      prosthesisType: "fixed_implants", lifecycle: "PLANIFICADO" as const,
      teethToRestore: 6, implantCount: 4, attachmentCount: 4,
      attachmentType: "MULTIUNIT" as const,
    };
    expect(() => createProsthesisPlan({ ...base, teethToRestore: 0 })).toThrow();
    expect(() => createProsthesisPlan({ ...base, implantCount: 0 })).toThrow();
    expect(() => createProsthesisPlan({ ...base, attachmentCount: 5 })).toThrow();
    expect(() => createProsthesisPlan({ ...base, selectedTooth: "46" })).toThrow();
    expect(() => createProsthesisPlan({ ...base, prosthesisType: "complete_denture" })).toThrow();
  });
});
