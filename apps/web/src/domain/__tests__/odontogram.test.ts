import { describe, expect, it } from "vitest";
import {
  TOOTH_STATES,
  archForTooth,
  assertNoImplantCariesConflict,
  bridgeTeethFromEndpoints,
  compareOdontogramSnapshots,
  createBridgeEntities,
  createEndoPostCrown,
  createImplantStack,
  cycleClinicalState,
  normalizeSurfaceForTooth,
  occlusalSurfaceForTooth,
  toothType,
  type DentalEntity,
} from "../odontogram";

describe("odontogram domain", () => {
  it("conserva el catálogo de 25 estados", () => {
    expect(TOOTH_STATES).toHaveLength(25);
  });

  it("calcula arcada temporal correctamente", () => {
    expect(archForTooth("55")).toBe("upper");
    expect(archForTooth("65")).toBe("upper");
    expect(archForTooth("75")).toBe("lower");
    expect(archForTooth("85")).toBe("lower");
  });

  it("normaliza O/I y P/L según anatomía", () => {
    expect(toothType("11")).toBe("incisor");
    expect(toothType("16")).toBe("molar");
    expect(occlusalSurfaceForTooth("11")).toBe("I");
    expect(occlusalSurfaceForTooth("16")).toBe("O");
    expect(normalizeSurfaceForTooth("26", "P/L")).toBe("P");
    expect(normalizeSurfaceForTooth("46", "P/L")).toBe("L");
  });

  it("recupera el ciclo de doble clic/toque de 2.3.7", () => {
    expect(cycleClinicalState("filling", "filling")).toBe("filling_bad");
    expect(cycleClinicalState("filling", "filling_bad")).toBe("filling_pending");
    expect(cycleClinicalState("filling", "filling_pending")).toBe("filling");
    expect(cycleClinicalState("implant", "implant")).toBe("implant_review");
  });

  it("crea un puente 13→23 cruzando la línea media", () => {
    expect(bridgeTeethFromEndpoints("13", "23")).toEqual([
      "13", "12", "11", "21", "22", "23",
    ]);
    const entities = createBridgeEntities("13", "23");
    const bridge = entities[0];
    expect(bridge?.attributes).toMatchObject({
      pillars: ["13", "23"],
      pontics: ["12", "11", "21", "22"],
    });
    expect(entities.filter((entity) => entity.entityType === "PONTIC")).toHaveLength(4);
  });

  it("permite seleccionar el puente en dirección inversa", () => {
    expect(bridgeTeethFromEndpoints("23", "13")).toEqual([
      "23", "22", "21", "11", "12", "13",
    ]);
  });

  it("crea exactamente las cadenas clínicas de implante y endo", () => {
    const implant = createImplantStack("36");
    expect(implant.map((entity) => entity.entityType)).toEqual(["IMPLANT", "ABUTMENT", "CROWN"]);
    expect(implant[1]?.parentId).toBe("implant-36");
    expect(implant[2]?.parentId).toBe("implant-36-abutment");

    expect(createEndoPostCrown("22").map((entity) => entity.entityType)).toEqual([
      "ENDO", "POST", "CROWN",
    ]);
  });

  it("impide implante sobre caries activa y viceversa", () => {
    const caries: DentalEntity = {
      id: "caries-36",
      tooth: "36",
      entityType: "TOOTH_STATE",
      status: "caries",
      active: true,
    };
    expect(() => assertNoImplantCariesConflict([caries], "36", "implant")).toThrow(/incompatibles/);

    const implant = createImplantStack("46")[0];
    expect(() => assertNoImplantCariesConflict(implant ? [implant] : [], "46", "caries")).toThrow(
      /incompatibles/,
    );
  });

  it("compara snapshots sin confundir el orden de atributos con un cambio clínico", () => {
    const before: DentalEntity = {
      id: "crown-36",
      tooth: "36",
      entityType: "CROWN",
      status: "crown_pending",
      attributes: { material: "zirconia", shade: "A2" },
      active: true,
    };
    const sameDifferentKeyOrder: DentalEntity = {
      ...before,
      attributes: { shade: "A2", material: "zirconia" },
    };
    const changed: DentalEntity = { ...before, status: "crown" };

    expect(
      compareOdontogramSnapshots(
        { entities: [before] },
        { entities: [sameDifferentKeyOrder] },
      ),
    ).toEqual({ added: [], removed: [], changed: [] });

    expect(
      compareOdontogramSnapshots(
        { entities: [before] },
        { entities: [changed, createImplantStack("46")[0]!] },
      ),
    ).toMatchObject({
      removed: [],
      changed: [changed],
    });
  });

});
