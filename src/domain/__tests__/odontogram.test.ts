import { describe, expect, it } from "vitest";
import {
  PERMANENT_LOWER,
  TOOTH_STATES,
  TEMPORARY_LOWER,
  TEMPORARY_UPPER,
  archForTooth,
  assertNoImplantCariesConflict,
  bridgeTeethFromEndpoints,
  compareOdontogramSnapshots,
  createBridgeEntities,
  createEndoPostCrown,
  createImplantStack,
  createOrthodonticEntity,
  createPediatricEntity,
  cycleClinicalState,
  dentitionStageForBirthDate,
  normalizeSurfaceForTooth,
  occlusalSurfaceForTooth,
  teethForDentition,
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

  it("elige denticion primaria, mixta y permanente por edad", () => {
    const today = "2026-09-22T12:00:00.000Z";
    expect(dentitionStageForBirthDate("2021-09-22", today)).toBe("primary");
    expect(dentitionStageForBirthDate("2020-09-22", today)).toBe("mixed");
    expect(dentitionStageForBirthDate("2014-09-22", today)).toBe("mixed");
    expect(dentitionStageForBirthDate("2013-09-22", today)).toBe("permanent");
    expect(dentitionStageForBirthDate(undefined, today)).toBe("permanent");
  });

  it("devuelve dientes correctos para denticion primaria y mixta", () => {
    expect(teethForDentition("primary").upper).toEqual([...TEMPORARY_UPPER]);
    expect(teethForDentition("primary").lower).toEqual([...TEMPORARY_LOWER]);
    expect(teethForDentition("mixed").upper).toContain("11");
    expect(teethForDentition("mixed").upper).toContain("55");
    expect(teethForDentition("permanent").lower).toEqual([...PERMANENT_LOWER]);
  });

  it("crea entidades pediatricas compatibles con DentalEntity", () => {
    expect(createPediatricEntity("75", "pulpotomy")).toMatchObject({
      tooth: "75",
      entityType: "PEDIATRIC",
      status: "pulpotomy",
      active: true,
    });
  });

  it("crea una entidad ortodontica de paciente sin duplicar dientes", () => {
    const entity = createOrthodonticEntity("patient-1", {
      molarClassRight: "I",
      molarClassLeft: "II",
      overjetMm: 4,
      overbitePct: 60,
      appliances: ["aligners", "retainer"],
    });

    expect(entity).toMatchObject({
      id: "orthodontic-patient-1",
      entityType: "ORTHODONTIC",
      status: "active",
      active: true,
    });
    expect(entity.tooth).toBeUndefined();
    expect(entity.attributes).toMatchObject({
      overjetMm: 4,
      appliances: ["aligners", "retainer"],
    });
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
    expect(bridgeTeethFromEndpoints("13", "23")).toEqual(["13", "12", "11", "21", "22", "23"]);
    const entities = createBridgeEntities("13", "23");
    const bridge = entities[0];
    expect(bridge?.attributes).toMatchObject({
      pillars: ["13", "23"],
      pontics: ["12", "11", "21", "22"],
    });
    expect(entities.filter((entity) => entity.entityType === "PONTIC")).toHaveLength(4);
    expect(entities.filter((entity) => entity.entityType === "PROSTHESIS")).toHaveLength(6);
    expect(
      createBridgeEntities("13", "23", "prosthesis")
        .filter((entity) => entity.entityType === "PROSTHESIS")
        .every((entity) => entity.status === "prosthesis"),
    ).toBe(true);
  });

  it("permite seleccionar el puente en dirección inversa", () => {
    expect(bridgeTeethFromEndpoints("23", "13")).toEqual(["23", "22", "21", "11", "12", "13"]);
  });

  it("crea exactamente las cadenas clínicas de implante y endo", () => {
    const implant = createImplantStack("36");
    expect(implant.map((entity) => entity.entityType)).toEqual(["IMPLANT", "ABUTMENT", "CROWN"]);
    expect(implant[1]?.parentId).toBe("implant-36");
    expect(implant[2]?.parentId).toBe("implant-36-abutment");

    expect(createEndoPostCrown("22").map((entity) => entity.entityType)).toEqual([
      "ENDO",
      "POST",
      "CROWN",
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
      compareOdontogramSnapshots({ entities: [before] }, { entities: [sameDifferentKeyOrder] }),
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
