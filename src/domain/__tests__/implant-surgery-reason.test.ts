import { describe, expect, it } from "vitest";
import { isImplantSurgeryReason } from "../implant-surgery-reminder";

describe("implant surgery vs implant-supported prosthetics", () => {
  it.each([
    ["Colocación de implante 36", true],
    ["Cirugía de implantes", true],
    ["Implante dental inmediato", true],
    ["All-on-4 cirugía", true],
    ["Revisión de implante 36", false],
    ["Control de implante osteointegrado", false],
    ["Colocación de corona sobre implante 36", false],
    ["Cementación de corona de implante", false],
    ["Pilar protésico sobre implante", false],
    ["Escaneado para prótesis sobre implantes", false],
  ])("classifies %s safely", (reason, surgical) => {
    expect(isImplantSurgeryReason(reason)).toBe(surgical);
  });
});
