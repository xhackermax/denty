import { describe, expect, it } from "vitest";
import { createOdontogramEntityState, type PeriodontalReading } from "@/domain";
import {
  createInitialOdontogramViewState,
  toggleOdontogramLayer,
  toggleOdontogramSubfilter,
} from "./odontogram-view-state";
import {
  orthodonticMarkForTooth,
  periodontalMarksForTooth,
  pediatricReplacementForTooth,
} from "./odontogram-layer-projection";

describe("odontogram shared layer projection", () => {
  it("shows existing orthodontic marks only when their layer and matching filter are enabled", () => {
    const dentalState = createOdontogramEntityState([
      {
        id: "ortho",
        entityType: "ORTHODONTIC",
        status: "active",
        active: true,
        attributes: {
          toothMarks: { "11": "bracket", "12": "space", "13": "invented" },
        },
      },
    ]);
    expect(
      orthodonticMarkForTooth(dentalState, "11", createInitialOdontogramViewState()),
    ).toBeNull();
    const state = toggleOdontogramLayer(createInitialOdontogramViewState(), "ortho");

    expect(orthodonticMarkForTooth(dentalState, "11", state)).toBe("bracket");
    expect(orthodonticMarkForTooth(dentalState, "12", state)).toBe("space");
    expect(orthodonticMarkForTooth(dentalState, "13", state)).toBeNull();

    const withoutAppliances = toggleOdontogramSubfilter(state, "ortho", "aparatos");
    expect(orthodonticMarkForTooth(dentalState, "11", withoutAppliances)).toBeNull();
    expect(orthodonticMarkForTooth(dentalState, "12", withoutAppliances)).toBe("space");
  });

  it("projects pediatric replacement statuses only when their layer and filter are visible", () => {
    const dentalState = createOdontogramEntityState([
      {
        id: "pediatric",
        tooth: "55",
        entityType: "PEDIATRIC",
        status: "retained",
        active: true,
      },
    ]);
    const state = toggleOdontogramLayer(createInitialOdontogramViewState(), "replacement");

    expect(pediatricReplacementForTooth(dentalState, "55", state)).toEqual({
      status: "retained",
      label: "Temporal retenido",
    });
    expect(
      pediatricReplacementForTooth(
        dentalState,
        "55",
        toggleOdontogramSubfilter(state, "replacement", "temporales"),
      ),
    ).toBeNull();
    expect(pediatricReplacementForTooth(dentalState, "54", state)).toBeNull();
  });

  it("projects periodontal data without filling missing sites with invented measurements", () => {
    const reading: PeriodontalReading = {
      tooth: "16",
      site: "MV",
      probingDepth: 4,
      recession: 1,
      bleeding: true,
      plaque: true,
      suppuration: true,
      mobility: 2,
      furcation: 1,
    };
    expect(periodontalMarksForTooth([reading], "16", createInitialOdontogramViewState())).toEqual(
      [],
    );
    const state = toggleOdontogramLayer(createInitialOdontogramViewState(), "perio");

    expect(periodontalMarksForTooth([reading], "16", state)).toEqual([
      "PD 4·—·—·—·—·—",
      "GM 1·—·—·—·—·—",
      "Sangrado",
      "Supuración",
      "Placa",
      "Movilidad 2",
      "Furca 1",
    ]);
    expect(periodontalMarksForTooth([reading], "17", state)).toEqual([]);
    expect(
      periodontalMarksForTooth(
        [reading],
        "16",
        toggleOdontogramSubfilter(state, "perio", "sondaje"),
      ),
    ).not.toContain("PD 4·—·—·—·—·—");
  });
});
