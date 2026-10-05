import { describe, expect, it } from "vitest";
import { nextVisitText, pendingTeeth, pendingTreatments } from "../next-visit";

const items = [
  { id: "a", tooth: "16", label: "Endodoncia", status: "PLANNED" },
  { id: "b", tooth: "26", label: "Corona", status: "COMPLETED" },
  { id: "c", tooth: null, label: "Higiene", status: "PLANNED" },
  { id: "d", tooth: "36", label: "Obturación", status: "approved" },
];

describe("next visit", () => {
  it("keeps only open items bound to a tooth", () => {
    expect(pendingTreatments(items).map((i) => i.id)).toEqual(["a", "d"]);
  });

  it("lists pending teeth", () => {
    expect([...pendingTeeth(pendingTreatments(items))]).toEqual(["16", "36"]);
  });

  it("builds text only for picked teeth", () => {
    const pending = pendingTreatments(items);
    expect(nextVisitText(pending, new Set(["36"]))).toBe("Pieza 36: Obturación");
    expect(nextVisitText(pending, new Set())).toBe("");
    expect(nextVisitText(pending, new Set(["16", "36"]))).toBe(
      "Pieza 16: Endodoncia; Pieza 36: Obturación",
    );
  });
});
