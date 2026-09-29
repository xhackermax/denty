import { describe, expect, it } from "vitest";

import { evaluateClinicalBatch, type ClinicalAction, type DentalEntity } from "../index";

const entity = (id: string, overrides: Partial<DentalEntity>): DentalEntity => ({
  id,
  tooth: "16",
  entityType: "IMPLANT_COMPONENT",
  status: "component",
  active: true,
  ...overrides,
});
const action = (value: DentalEntity): ClinicalAction => ({ type: "UPSERT_ENTITY", entity: value });

describe("clinical batch validation", () => {
  it.each([
    [
      "forward",
      [
        action(entity("implant", { entityType: "IMPLANT", status: "implant_pending" })),
        action(entity("tibase", { status: "tibase" })),
        action(
          entity("crown", {
            entityType: "CROWN",
            status: "crown_pending",
            parentId: "tibase",
            attributes: { implantSupported: true },
          }),
        ),
      ],
    ],
    [
      "reverse",
      [
        action(
          entity("crown", {
            entityType: "CROWN",
            status: "crown_pending",
            parentId: "tibase",
            attributes: { implantSupported: true },
          }),
        ),
        action(entity("tibase", { status: "tibase" })),
        action(entity("implant", { entityType: "IMPLANT", status: "implant_pending" })),
      ],
    ],
  ] as const)(
    "evaluates implant + TiBase + crown independently of %s insertion order",
    (_label, actions) => {
      const result = evaluateClinicalBatch(actions, []);
      expect(result.outcome).toBe("ALLOW");
      expect(result.ruleIds).not.toContain("R022");
      expect(result.ruleIds).not.toContain("R028");
    },
  );

  it("detects conflicts against the aggregate proposed state", () => {
    const result = evaluateClinicalBatch(
      [action(entity("locator", { status: "locator" })), action(entity("bar", { status: "bar" }))],
      [entity("implant", { entityType: "IMPLANT", status: "implant_pending" })],
    );
    expect(result.outcome).toBe("BLOCK");
    expect(result.ruleIds).toContain("R023");
  });
});
