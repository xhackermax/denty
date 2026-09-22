import { describe, expect, it } from "vitest";

import type { DentalEntity } from "@/domain";
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
});
