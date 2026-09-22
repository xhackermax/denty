import { describe, expect, it } from "vitest";

import { createImplantStack } from "../odontogram";
import {
  createBoundedHistory,
  createOdontogramEntityState,
  executeOdontogramCommand,
  redoHistory,
  undoHistory,
} from "../odontogram/state";

describe("odontogram entity reducer", () => {
  it("lets UI and voice apply the same immutable entity command", () => {
    const initial = createOdontogramEntityState();
    const [implant, abutment, crown] = createImplantStack("36");
    if (!implant || !abutment || !crown) throw new Error("Plantilla de implante incompleta");

    const next = executeOdontogramCommand(createBoundedHistory(initial), {
      type: "UPSERT_ENTITIES",
      entities: [implant, abutment, crown],
    });

    expect(Object.keys(next.present.entitiesById)).toHaveLength(3);
    expect(next.present.entitiesById[abutment.id]?.parentId).toBe(implant.id);
    expect(next.present.entitiesById[crown.id]?.parentId).toBe(abutment.id);
    expect(next.present.revision).toBe(3);
  });

  it("keeps only the latest 30 undo checkpoints", () => {
    let history = createBoundedHistory(createOdontogramEntityState(), 30);

    for (let index = 1; index <= 35; index += 1) {
      history = executeOdontogramCommand(history, {
        type: "UPSERT_ENTITY",
        entity: {
          id: `entity-${index}`,
          tooth: "11",
          entityType: "RESTORATION",
          status: "filling_pending",
          active: true,
        },
      });
    }

    expect(history.past).toHaveLength(30);
    for (let index = 0; index < 30; index += 1) history = undoHistory(history);
    expect(history.present.revision).toBe(5);
  });

  it("clears redo after a new command", () => {
    const initial = createBoundedHistory(createOdontogramEntityState());
    const one = executeOdontogramCommand(initial, {
      type: "UPSERT_ENTITY",
      entity: {
        id: "endo-21",
        tooth: "21",
        entityType: "ENDO",
        status: "endo_indicated",
        active: true,
      },
    });
    const undone = undoHistory(one);
    const redone = redoHistory(undone);
    expect(redone.present.entitiesById["endo-21"]).toBeDefined();

    const fork = executeOdontogramCommand(undone, {
      type: "UPSERT_ENTITY",
      entity: {
        id: "crown-21",
        tooth: "21",
        entityType: "CROWN",
        status: "crown_pending",
        active: true,
      },
    });
    expect(fork.future).toHaveLength(0);
  });

  it("blocks active caries and an implant on the same tooth", () => {
    const initial = createOdontogramEntityState([
      {
        id: "caries-46",
        tooth: "46",
        entityType: "TOOTH_STATE",
        status: "caries",
        active: true,
      },
    ]);
    const [implant] = createImplantStack("46");
    if (!implant) throw new Error("Implante no generado");

    expect(() =>
      executeOdontogramCommand(createBoundedHistory(initial), {
        type: "UPSERT_ENTITY",
        entity: implant,
      }),
    ).toThrow(/incompatibles/);
  });
});
