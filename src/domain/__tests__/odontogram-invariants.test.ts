import { describe, expect, it } from "vitest";

import {
  createBoundedHistory,
  createOdontogramEntityState,
  evaluateClinicalAction,
  executeValidatedOdontogramBatch,
  executeValidatedOdontogramCommand,
  type DentalEntity,
} from "@/domain";
import { deriveMouthState, isProbeable, isSurgicalSite } from "@/domain/odontogram/mouth-state";

const entity = (
  entityType: DentalEntity["entityType"],
  status: string,
  extra: Partial<DentalEntity> = {},
): DentalEntity => ({
  id: `${entityType}-36`,
  tooth: "36",
  entityType,
  status,
  active: true,
  ...extra,
});

describe("implant and natural tooth on the same position", () => {
  it.each([
    ["the implant first", entity("IMPLANT", "implant"), entity("ENDO", "endo_indicated")],
    ["the root canal first", entity("ENDO", "endo_indicated"), entity("IMPLANT", "implant")],
  ])("is blocked whichever comes first (%s)", (_order, first, second) => {
    const history = createBoundedHistory(createOdontogramEntityState([first]));
    const result = executeValidatedOdontogramCommand(history, {
      type: "UPSERT_ENTITY",
      entity: second,
    });
    expect(result.evaluation.outcome).toBe("BLOCK");
    expect(result.history).toBe(history);
  });

  it("blocks caries and an implant arriving in the same batch, saving neither", () => {
    const history = createBoundedHistory(createOdontogramEntityState());
    const result = executeValidatedOdontogramBatch(history, [
      entity("CARIES", "caries"),
      entity("IMPLANT", "implant"),
    ]);
    expect(result.evaluation.outcome).toBe("BLOCK");
    expect(result.history).toBe(history);
  });

  it("still allows a crown on an implant", () => {
    expect(
      evaluateClinicalAction(entity("CROWN", "crown"), [entity("IMPLANT", "implant")]).outcome,
    ).not.toBe("BLOCK");
  });

  it("allows natural work once the implant is recorded as lost", () => {
    expect(
      evaluateClinicalAction(entity("CARIES", "caries"), [entity("IMPLANT", "implant_lost")])
        .outcome,
    ).not.toBe("BLOCK");
  });
});

describe("placed implant data", () => {
  it("is required in a batch exactly as in a single edit", () => {
    const placed = entity("IMPLANT", "implant", { attributes: { lifecycle: "REALIZADO" } });
    const history = createBoundedHistory(createOdontogramEntityState());
    const single = executeValidatedOdontogramCommand(history, {
      type: "UPSERT_ENTITY",
      entity: placed,
    });
    const batch = executeValidatedOdontogramBatch(history, [placed]);
    expect(single.evaluation.outcome).toBe("REQUIRE_CONTEXT");
    expect(batch.evaluation.outcome).toBe("REQUIRE_CONTEXT");
    expect(batch.history).toBe(history);
  });
});

describe("tooth presence", () => {
  it("treats a completed surgical extraction as an absent tooth", () => {
    const extraction = entity("SURGERY", "extraction_simple", {
      attributes: { lifecycle: "REALIZADO", procedure: "extraction_simple" },
    });
    expect(deriveMouthState([extraction]).teeth["36"]?.presence).toBe("missing");
    expect(evaluateClinicalAction(entity("ENDO", "endo_indicated"), [extraction]).outcome).toBe(
      "BLOCK",
    );
  });

  it("does not count a lost implant as present or probeable", () => {
    const mouth = deriveMouthState([
      entity("IMPLANT", "implant_lost", { attributes: { lifecycle: "REALIZADO" } }),
    ]);
    expect(mouth.teeth["36"]?.presence).toBe("missing");
    expect(isProbeable(mouth, "36")).toBe(false);
  });

  it("lets an impacted tooth be extracted surgically but not simply", () => {
    const mouth = deriveMouthState([entity("PEDIATRIC", "impacted")]);
    expect(isSurgicalSite(mouth, "36", "extraction_surgical")).toBe(true);
    expect(isSurgicalSite(mouth, "36", "extraction_simple")).toBe(false);
  });
});
