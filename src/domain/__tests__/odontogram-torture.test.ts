import { describe, expect, it } from "vitest";
import {
  archForTooth,
  normalizeSurfaceForTooth,
  createImplantStack,
  createRemovable,
  cycleClinicalState,
  type DentalEntity,
  type DentalEntityType,
  type ToothState,
} from "../odontogram";
import {
  createBoundedHistory,
  createOdontogramEntityState,
  executeOdontogramCommand,
  executeValidatedOdontogramBatch,
  executeValidatedOdontogramCommand,
  undoHistory,
  redoHistory,
} from "../odontogram/state";
import { evaluateClinicalAction } from "../odontogram/clinical-rules";
import {
  deriveMouthState,
  isProbeable,
  isSurgicalSite,
  isEndoCandidate,
} from "../odontogram/mouth-state";
import { dentalEntitySchema, odontogramBatchSchema, periodontalMeasurementSchema, createOdontogramSnapshotSchema } from "@/shared/api/schemas/clinical";
import { validatePeriodontalReading } from "@/domain/periodontal";
import {
  domainEntityToApiInput,
  persistedEntityToDomain,
} from "@/shared/odontogram/odontogram-wire";
import { mergeVoiceEntities } from "@/features/voice/voice-odontogram";

const entity = (
  entityType: DentalEntityType = "RESTORATION",
  status = "filling_pending",
  tooth = "36",
): DentalEntity => ({ id: `${entityType}-${tooth}`, entityType, status, tooth, active: true });
const emptyHistory = () => createBoundedHistory(createOdontogramEntityState());
function roundtrip(value: DentalEntity): DentalEntity {
  const wire = domainEntityToApiInput(value);
  return persistedEntityToDomain({
    id: wire.id,
    tooth: wire.tooth,
    arch: wire.arch,
    entityType: wire.entityType,
    status: wire.status,
    surfacesJson: wire.surfaces,
    attributesJson: wire.attributes,
    parentId: wire.parentId,
    active: wire.active,
    version: 1,
  });
}

describe("BOUNDARIES: odontogram torture", () => {
  it.each([1, 120])("BD snapshot label permitted length %i", (length) => {
    expect(createOdontogramSnapshotSchema.safeParse({ label: "a".repeat(length) }).success).toBe(true);
  });
  it.each(["", "   ", "a".repeat(121)])("BD snapshot label rejects empty/over-limit %j", (label) => {
    expect(createOdontogramSnapshotSchema.safeParse({ label }).success).toBe(false);
  });
  it.each([
    { probingDepth: 16 }, { probingDepth: 1_000_000_000 },
    { recession: -6 }, { recession: 16 }, { mobility: 4 }, { furcation: 4 },
  ])("BD API and domain both reject out-of-range periodontal measurement %j", (variation) => {
    const reading = { tooth: "36", site: "MV" as const, probingDepth: 3, recession: 0, bleeding: false, plaque: false, ...variation };
    expect(() => validatePeriodontalReading(reading)).toThrow(RangeError);
    expect(periodontalMeasurementSchema.safeParse(reading).success).toBe(false);
  });
  it.each([{ probingDepth: 0, recession: -5, mobility: 0, furcation: 0 }, { probingDepth: 15, recession: 15, mobility: 3, furcation: 3 }])(
    "BD valid periodontal minimum and maximum %j", (variation) => {
      const reading = { tooth: "36", site: "MV" as const, bleeding: false, plaque: false, ...variation };
      expect(() => validatePeriodontalReading(reading)).not.toThrow();
      expect(periodontalMeasurementSchema.safeParse(reading).success).toBe(true);
    },
  );
  it.each(["11", "18", "41", "48", "51", "55", "81", "85"])(
    "BD001 valid FDI boundary %s",
    (tooth) => {
      expect(["upper", "lower"]).toContain(archForTooth(tooth));
      expect(createImplantStack(tooth)[0]?.tooth).toBe(tooth);
      expect(dentalEntitySchema.safeParse(entity("HEALTHY", "healthy", tooth)).success).toBe(true);
    },
  );
  it.each(["99", "00", "10", "49", "56", "86", "", " 11 ", "１１", "🦷"])(
    "BD002 domain rejects invalid FDI %j",
    (tooth) => {
      expect(() => archForTooth(tooth)).toThrow(RangeError);
      expect(() => createImplantStack(tooth)).toThrow(RangeError);
    },
  );
  it.each(["99", "00", "56", "86", "", " 11 ", "🦷"])(
    "BD003 API rejects invalid FDI %j",
    (tooth) => {
      expect(dentalEntitySchema.safeParse(entity("HEALTHY", "healthy", tooth)).success).toBe(false);
    },
  );
  it.each(["X", "", "🦷", "MOD", " V M "])(
    "BD004 invalid surface %j rejected at domain and API",
    (surface) => {
      expect(() => normalizeSurfaceForTooth("36", surface)).toThrow(RangeError);
      expect(dentalEntitySchema.safeParse({ ...entity(), surfaces: [surface] }).success).toBe(
        false,
      );
    },
  );
  it.each([
    ["11", " o/i ", "I"],
    ["36", " i ", "O"],
    ["16", " p/l ", "P"],
    ["46", " p/l ", "L"],
    ["36", " m ", "M"],
  ])("BD005 surface normalization %s %s", (tooth, input, expected) => {
    expect(normalizeSurfaceForTooth(tooth!, input!)).toBe(expected);
  });
  it.each(["", " ", "\t\n", "impossible_status", "💥"])(
    "BD006 reject impossible/blank clinical status %j",
    (status) => {
      expect(dentalEntitySchema.safeParse(entity("RESTORATION", status)).success).toBe(false);
    },
  );
  it.each([" ", "\n", "UNKNOWN", "🦷"])("BD007 reject invalid entity type %j", (entityType) => {
    expect(dentalEntitySchema.safeParse({ ...entity(), entityType }).success).toBe(false);
  });
  it("BD008 huge Unicode attributes preserve content through serialization", () => {
    const notes = "Niño, raíz, 東京 🦷 e\u0301\n".repeat(20_000);
    const value = { ...entity(), attributes: { notes, nested: { emoji: "👩🏽‍⚕️", empty: "" } } };
    expect(dentalEntitySchema.safeParse(domainEntityToApiInput(value)).success).toBe(true);
    expect(roundtrip(value)).toEqual(value);
  });
  it("BD009 empty replacement snapshot can be saved while an empty command batch leaves history unchanged", () => {
    expect(odontogramBatchSchema.safeParse({ expectedVersion: 1, entities: [] }).success).toBe(
      true,
    );
    const history = emptyHistory();
    expect(executeValidatedOdontogramBatch(history, []).history).toBe(history);
  });
  it("BD010 contradictory duplicate IDs rejected before persistence", () => {
    const first = entity();
    expect(
      odontogramBatchSchema.safeParse({
        expectedVersion: 1,
        entities: [first, { ...first, status: "filling" }],
      }).success,
    ).toBe(false);
  });
});

describe("SEQUENCES: odontogram torture", () => {
  it.each(["ABC", "ACB", "BAC"])("SQ action order %s is reversible (A=create, B=edit, C=deactivate)", (ordering) => {
    let history = emptyHistory();
    const states = [history.present];
    for (const action of ordering) {
      if (action === "B" && !history.present.entitiesById[entity().id]) {
        const before = history.present;
        expect(() => executeOdontogramCommand(history, { type: "SET_ENTITY_STATUS", entityId: entity().id, status: "filling" })).toThrow(RangeError);
        expect(history.present).toBe(before);
        continue;
      }
      const next = executeOdontogramCommand(history, action === "A"
        ? { type: "UPSERT_ENTITY", entity: entity() }
        : action === "B" ? { type: "SET_ENTITY_STATUS", entityId: entity().id, status: "filling" }
          : { type: "DEACTIVATE_ENTITY", entityId: entity().id });
      if (next !== history) states.push(next.present);
      history = next;
    }
    expect(Object.keys(history.present.entitiesById)).toHaveLength(1);
    for (let index = states.length - 2; index >= 0; index--) {
      history = undoHistory(history);
      expect(history.present).toEqual(states[index]);
    }
  });
  it("SQ create-edit-delete-create keeps exactly the new entity", () => {
    let history = executeOdontogramCommand(emptyHistory(), { type: "UPSERT_ENTITY", entity: entity() });
    history = executeOdontogramCommand(history, { type: "SET_ENTITY_STATUS", entityId: entity().id, status: "filling" });
    history = executeOdontogramCommand(history, { type: "REMOVE_ENTITY", entityId: entity().id });
    const replacement = { ...entity(), attributes: { notes: "nuevo" } };
    history = executeOdontogramCommand(history, { type: "UPSERT_ENTITY", entity: replacement });
    expect(Object.values(history.present.entitiesById)).toEqual([replacement]);
  });
  it("SQ duplicate entity command creates no duplicate data", () => {
    let history = emptyHistory();
    for (let index = 0; index < 3; index++) history = executeOdontogramCommand(history, { type: "UPSERT_ENTITY", entity: { ...entity() } });
    expect(Object.values(history.present.entitiesById)).toEqual([entity()]);
  });
  it.each([0, 1, 7, 31])(
    "SQ001 deterministic %i-command history undo/redo preserves snapshots",
    (count) => {
      let history = createBoundedHistory(createOdontogramEntityState(), 40);
      const snapshots = [history.present];
      for (let index = 0; index < count; index++) {
        history = executeOdontogramCommand(history, {
          type: "UPSERT_ENTITY",
          entity: { ...entity(), id: `r-${index}` },
        });
        snapshots.push(history.present);
      }
      for (let index = count - 1; index >= 0; index--) {
        history = undoHistory(history);
        expect(history.present).toEqual(snapshots[index]);
      }
      expect(undoHistory(history)).toBe(history);
      for (let index = 1; index <= count; index++) {
        history = redoHistory(history);
        expect(history.present).toEqual(snapshots[index]);
      }
      expect(redoHistory(history)).toBe(history);
    },
  );
  it("SQ002 upsert-status-deactivate-remove cycle is reversible and immutable", () => {
    let history = emptyHistory();
    const initial = history.present;
    history = executeOdontogramCommand(history, { type: "UPSERT_ENTITY", entity: entity() });
    const inserted = history.present;
    history = executeOdontogramCommand(history, {
      type: "SET_ENTITY_STATUS",
      entityId: entity().id,
      status: "filling",
    });
    history = executeOdontogramCommand(history, {
      type: "DEACTIVATE_ENTITY",
      entityId: entity().id,
    });
    expect(history.present.entitiesById[entity().id]?.active).toBe(false);
    history = executeOdontogramCommand(history, { type: "REMOVE_ENTITY", entityId: entity().id });
    expect(history.present.entitiesById).toEqual({});
    expect(history.present.revision).toBe(4);
    expect(inserted.entitiesById[entity().id]?.status).toBe("filling_pending");
    for (let index = 0; index < 4; index++) history = undoHistory(history);
    expect(history.present).toEqual(initial);
  });
  it("SQ003 branch after undo clears redo", () => {
    const added = executeOdontogramCommand(emptyHistory(), {
      type: "UPSERT_ENTITY",
      entity: entity(),
    });
    const fork = executeOdontogramCommand(undoHistory(added), {
      type: "UPSERT_ENTITY",
      entity: entity("CARIES", "caries", "16"),
    });
    expect(fork.future).toEqual([]);
    expect(redoHistory(fork)).toBe(fork);
  });
  it.each([
    ["filling", "filling"],
    ["endo", "endo"],
    ["post", "post"],
    ["implant", "implant"],
    ["crown", "crown"],
  ] as const)("SQ004 %s three-state cycle returns to origin", (family, initial) => {
    let status: ToothState = initial;
    for (let index = 0; index < 3; index++) status = cycleClinicalState(family, status);
    expect(status).toBe(initial);
  });
  it.each(["implant-first", "endo-first"])(
    "SQ005 natural/implant incompatibility blocks second command %s",
    (order) => {
      const implant = entity("IMPLANT", "implant");
      const endo = entity("ENDO", "endo_indicated");
      const [first, second] = order === "implant-first" ? [implant, endo] : [endo, implant];
      const history = createBoundedHistory(createOdontogramEntityState([first!]));
      const result = executeValidatedOdontogramCommand(history, {
        type: "UPSERT_ENTITY",
        entity: second!,
      });
      expect(result.evaluation.outcome).toBe("BLOCK");
      expect(result.history).toBe(history);
    },
  );
  it("SQ006 blocked batch rolls back every entity and creates no checkpoint", () => {
    const history = emptyHistory();
    const result = executeValidatedOdontogramBatch(history, [
      entity("CARIES", "caries"),
      entity("IMPLANT", "implant"),
    ]);
    expect(result.evaluation.outcome).toBe("BLOCK");
    expect(result.history).toBe(history);
  });
});

const typeStatuses: readonly [DentalEntityType, string][] = [
  ["TOOTH_STATE", "healthy"],
  ["HEALTHY", "healthy"],
  ["CARIES", "caries"],
  ["MISSING", "missing"],
  ["EXTRACTION", "extraction"],
  ["RESTORATION", "filling"],
  ["ENDO", "endo"],
  ["POST", "post"],
  ["CROWN", "crown"],
  ["IMPLANT", "implant"],
  ["ABUTMENT", "abutment_pending"],
  ["BRIDGE", "bridge_pending"],
  ["PONTIC", "pontic_pending"],
  ["REMOVABLE", "removable"],
  ["ORTHODONTIC", "active"],
  ["PEDIATRIC", "unerupted"],
  ["PROSTHESIS", "prosthesis"],
  ["SURGERY", "planned"],
  ["BONE_GRAFT", "planned"],
  ["MEMBRANE", "planned"],
  ["SINUS_LIFT", "planned"],
  ["SURGICAL_LESION", "planned"],
  ["IMPLANT_COMPONENT", "planned"],
  ["PROSTHETIC_STRUCTURE", "planned"],
  ["PERIODONTAL_FINDING", "planned"],
  ["SUPERNUMERARY_TOOTH", "present"],
];
describe("REGRESSION: odontogram torture", () => {
  it.each(typeStatuses)("RG005 lossless %s roundtrip", (entityType, status) => {
    const value = {
      ...entity(entityType, status),
      attributes: { notes: "á 🦷", nested: [1, false, null] },
      surfaces: ["M" as const],
      parentId: "parent-36",
    };
    expect(roundtrip(value)).toEqual({
      ...value,
      entityType: entityType === "TOOTH_STATE" ? "HEALTHY" : entityType,
    });
  });
  it.each([
    ["ENDO", "diagnosis"],
    ["IMPLANT", "implant_lost"],
    ["EXTRACTION", "extraction_completed"],
  ] as const)("RG006 preserve semantic status %s/%s", (type, status) => {
    expect(roundtrip(entity(type, status)).status).toBe(status);
  });
  it("RG007 actual implant data required equally in single and batch commands", () => {
    const value = { ...entity("IMPLANT", "implant"), attributes: { lifecycle: "REALIZADO" } };
    const history = emptyHistory();
    const single = executeValidatedOdontogramCommand(history, {
      type: "UPSERT_ENTITY",
      entity: value,
    });
    const batch = executeValidatedOdontogramBatch(history, [value]);
    expect(single.evaluation.outcome).toBe("REQUIRE_CONTEXT");
    expect(batch.evaluation.outcome).toBe("REQUIRE_CONTEXT");
    expect(batch.history).toBe(history);
  });
  it("RG008 extraction completed blocks subsequent endodontics", () => {
    const extraction = {
      ...entity("SURGERY", "extraction_simple"),
      attributes: { lifecycle: "REALIZADO", procedure: "extraction_simple" },
    };
    expect(deriveMouthState([extraction]).teeth["36"]?.presence).toBe("missing");
    expect(evaluateClinicalAction(entity("ENDO", "endo_indicated"), [extraction]).outcome).toBe(
      "BLOCK",
    );
  });
  it("RG009 lost implant is absent and cannot be probed", () => {
    const mouth = deriveMouthState([
      { ...entity("IMPLANT", "implant_lost"), attributes: { lifecycle: "REALIZADO" } },
    ]);
    expect(mouth.teeth["36"]?.presence).toBe("missing");
    expect(isProbeable(mouth, "36")).toBe(false);
  });
  it("RG010 impacted tooth permits surgical extraction", () => {
    expect(
      isSurgicalSite(
        deriveMouthState([entity("PEDIATRIC", "impacted")]),
        "36",
        "extraction_surgical",
      ),
    ).toBe(true);
  });
  it("RG011 supported impacted pediatric state is not erupted or endodontic candidate", () => {
    const mouth = deriveMouthState([entity("PEDIATRIC", "impacted")]);
    expect(mouth.teeth["36"]?.presence).toBe("unerupted");
    expect(isEndoCandidate(mouth, "36")).toBe(false);
  });
  it("RG012 voice adding lower removable preserves upper removable", () => {
    const upper = createRemovable("upper", ["16", "15"]);
    const lower = createRemovable("lower", ["46", "45"]);
    expect(mergeVoiceEntities([upper], [lower])).toEqual([upper, lower]);
  });
});
