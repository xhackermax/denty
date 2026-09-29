import { describe, expect, it } from "vitest";

import {
  applyOdontogramCommand,
  createBoundedHistory,
  createOdontogramEntityState,
  executeValidatedOdontogramBatch,
  executeValidatedOdontogramCommand,
  undoHistory,
} from "../odontogram/state";
import type { DentalEntity } from "../odontogram";

const entity = (overrides: Partial<DentalEntity>): DentalEntity => ({
  id: "candidate",
  tooth: "16",
  entityType: "SURGERY",
  status: "observation",
  active: true,
  ...overrides,
});

describe("validated odontogram commands", () => {
  it("does not mutate state or history when a rule blocks", () => {
    const history = createBoundedHistory(
      createOdontogramEntityState([
        entity({ id: "natural", entityType: "HEALTHY", status: "healthy" }),
      ]),
    );
    const result = executeValidatedOdontogramCommand(history, {
      type: "UPSERT_ENTITY",
      entity: entity({ id: "implant", entityType: "IMPLANT", status: "implant_pending" }),
    });
    expect(result.evaluation.outcome).toBe("BLOCK");
    expect(result.history).toBe(history);
    expect(result.history.past).toHaveLength(0);
  });

  it("commits warnings and returns them for explicit UI confirmation", () => {
    const history = createBoundedHistory(createOdontogramEntityState());
    const result = executeValidatedOdontogramCommand(history, {
      type: "UPSERT_ENTITY",
      entity: entity({ id: "membrane", entityType: "MEMBRANE", status: "membrane" }),
    });
    expect(result.evaluation).toMatchObject({ outcome: "WARN", ruleIds: ["R031"] });
    expect(result.history.present.entitiesById.membrane).toBeDefined();
  });

  it("commits an accepted batch as one undo step", () => {
    const history = createBoundedHistory(createOdontogramEntityState());
    const result = executeValidatedOdontogramBatch(history, [
      entity({ id: "implant", entityType: "IMPLANT", status: "implant_pending" }),
      entity({ id: "tibase", entityType: "IMPLANT_COMPONENT", status: "tibase" }),
      entity({
        id: "crown",
        entityType: "CROWN",
        status: "crown_pending",
        parentId: "tibase",
        attributes: { implantSupported: true },
      }),
    ]);
    expect(result.evaluation.outcome).toBe("ALLOW");
    expect(result.history.past).toHaveLength(1);
    expect(Object.keys(result.history.present.entitiesById)).toHaveLength(3);
    expect(Object.keys(undoHistory(result.history).present.entitiesById)).toHaveLength(0);
  });

  it("keeps low-level replay free of duplicated clinical policy", () => {
    const state = createOdontogramEntityState([
      entity({ id: "caries", entityType: "TOOTH_STATE", status: "caries" }),
    ]);
    expect(() =>
      applyOdontogramCommand(state, {
        type: "UPSERT_ENTITY",
        entity: entity({ id: "implant", entityType: "IMPLANT", status: "implant_pending" }),
      }),
    ).not.toThrow();
  });
});
