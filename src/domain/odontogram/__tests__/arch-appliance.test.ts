import { describe, expect, it } from "vitest";
import { archApplianceLabel, archApplianceOf, createArchAppliance } from "../index.ts";

describe("createArchAppliance", () => {
  const upper = ["11", "12", "21"];

  it("a complete denture replaces the arch teeth", () => {
    const entity = createArchAppliance("complete_denture", "upper", upper);
    expect(entity.entityType).toBe("REMOVABLE");
    expect(entity.attributes?.abutments).toBeUndefined();
    expect(archApplianceOf(entity)).toBe("complete_denture");
  });

  it("overdenture and splint keep the teeth as supports", () => {
    expect(
      createArchAppliance("implant_overdenture", "upper", upper).attributes?.abutments,
    ).toEqual(upper);
    expect(createArchAppliance("occlusal_splint", "upper", upper).id).toBe("occlusal_splint-upper");
  });

  it("orthodontics is an ORTHODONTIC entity per arch", () => {
    const entity = createArchAppliance("orthodontic_appliance", "lower", ["31"]);
    expect(entity.entityType).toBe("ORTHODONTIC");
    expect(archApplianceLabel("orthodontic_appliance", "lower")).toBe("Ortodoncia inferior");
  });

  it("rejects mixed arches and empty lists", () => {
    expect(() => createArchAppliance("complete_denture", "upper", ["31"])).toThrow(RangeError);
    expect(() => createArchAppliance("complete_denture", "upper", [])).toThrow(RangeError);
  });
});
