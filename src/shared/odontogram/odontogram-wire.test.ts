import { describe, expect, it } from "vitest";

import { DENTAL_ENTITY_TYPES, type DentalEntity, type DentalEntityType } from "@/domain";
import {
  createStateEntity,
  domainEntityToApiInput,
  persistedEntityToDomain,
  toothStateFromEntity,
} from "./odontogram-wire";

describe("odontogram wire adapter", () => {
  it("maps legacy restoration records to the original Denty UI state", () => {
    const entity = persistedEntityToDomain({
      id: "rest-16-mod",
      tooth: "16",
      entityType: "RESTORATION",
      status: "restoration_completed",
      surfacesJson: ["M", "O", "D"],
      active: true,
      version: 2,
    });

    expect(entity).toMatchObject({
      entityType: "RESTORATION",
      status: "filling",
      surfaces: ["M", "O", "D"],
    });
  });

  it("serializes UI state using the backend clinical vocabulary", () => {
    const entity = createStateEntity("22", "endo");

    expect(domainEntityToApiInput(entity)).toMatchObject({
      entityType: "ENDO",
      status: "endo_completed",
      tooth: "22",
    });
  });

  it("keeps caries and missing as explicit clinical entity types", () => {
    expect(createStateEntity("36", "caries", ["O"])).toMatchObject({
      entityType: "CARIES",
      status: "caries",
    });
    expect(createStateEntity("46", "missing")).toMatchObject({
      entityType: "MISSING",
      status: "missing",
    });
  });

  it("normalizes backend status kinds without losing the entity identity", () => {
    const implant: DentalEntity = {
      id: "implant-46",
      tooth: "46",
      entityType: "IMPLANT",
      status: "implant_review",
      active: true,
    };

    expect(toothStateFromEntity(implant)).toBe("implant_review");
    expect(domainEntityToApiInput(implant).status).toBe("implant_review");
  });

  const roundtrip = (entity: DentalEntity) => {
    const wire = domainEntityToApiInput(entity);
    return persistedEntityToDomain({
      id: wire.id,
      ...(wire.tooth ? { tooth: wire.tooth } : {}),
      ...(wire.arch ? { arch: wire.arch } : {}),
      entityType: wire.entityType,
      status: wire.status,
      surfacesJson: wire.surfaces ?? null,
      attributesJson: wire.attributes ?? {},
      ...(wire.parentId ? { parentId: wire.parentId } : {}),
      active: wire.active,
      version: 2,
    });
  };

  it.each(DENTAL_ENTITY_TYPES.filter((type) => type !== "TOOTH_STATE"))(
    "loads a saved %s without losing data",
    (entityType: DentalEntityType) => {
      const entity: DentalEntity = {
        id: `e-${entityType}`,
        tooth: "36",
        entityType,
        status: "planned_custom",
        surfaces: ["M"],
        attributes: { notes: "á" },
        parentId: "parent-36",
        active: true,
      };
      expect(roundtrip(entity)).toEqual(entity);
    },
  );

  it.each([
    ["ENDO", "diagnosis"],
    ["ENDO", "retreatment"],
    ["IMPLANT", "implant_lost"],
    ["IMPLANT", "peri_implantitis"],
    ["EXTRACTION", "extraction_completed"],
  ] as const)("keeps the clinical meaning of %s/%s", (entityType, status) => {
    const entity: DentalEntity = { id: "e", tooth: "36", entityType, status, active: true };
    expect(toothStateFromEntity(entity)).toBeNull();
    expect(roundtrip(entity).status).toBe(status);
  });

  it.each([
    ["IMPLANT", "implant_pending", "implant_indicated"],
    ["CROWN", "planned", "crown_pending"],
    ["RESTORATION", "filling_completed", "filling"],
    ["ENDO", "endo_unsatisfactory", "endo_bad"],
    ["CARIES", "caries_pending", "caries"],
    ["EXTRACTION", "extraction_indicated", "extraction"],
  ] as const)("still reads the lifecycle alias %s/%s as %s", (entityType, status, state) => {
    expect(toothStateFromEntity({ id: "e", tooth: "36", entityType, status, active: true })).toBe(
      state,
    );
  });

  it("rejects an entity type the domain does not know", () => {
    expect(() =>
      persistedEntityToDomain({
        id: "e",
        tooth: "36",
        entityType: "UNKNOWN",
        status: "x",
        active: true,
        version: 1,
      }),
    ).toThrow(TypeError);
  });
});
