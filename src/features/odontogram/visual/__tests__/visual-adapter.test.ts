import { describe, expect, it } from "vitest";

import type { DentalEntity, PeriodontalReading } from "@/domain";
import { deriveMouthState } from "@/domain/odontogram/mouth-state";

import { toVisualDentition, toVisualTeeth } from "../visual-adapter";

const entity = (
  partial: Partial<DentalEntity> & Pick<DentalEntity, "id" | "entityType" | "status">,
) => ({ active: true, ...partial }) as DentalEntity;

const reading = (
  site: PeriodontalReading["site"],
  probingDepth: number,
  extra: Partial<PeriodontalReading> = {},
) => ({ tooth: "16", site, probingDepth, recession: 0, ...extra }) as PeriodontalReading;

function teethFor(entities: DentalEntity[], readings: PeriodontalReading[] = []) {
  return toVisualTeeth(entities, readings, deriveMouthState(entities));
}
const tooth = (teeth: ReturnType<typeof toVisualTeeth>, fdi: number) =>
  teeth.find((record) => record.fdi === fdi);

describe("toVisualTeeth", () => {
  it("splits a multi-surface finding per surface and maps Denty surfaces to the chart", () => {
    const teeth = teethFor([
      entity({
        id: "c1",
        entityType: "CARIES",
        status: "caries",
        tooth: "16",
        surfaces: ["O", "M"],
      }),
      entity({
        id: "c2",
        entityType: "CARIES",
        status: "caries",
        tooth: "11",
        surfaces: ["I", "P"],
      }),
    ]);
    expect(tooth(teeth, 16)?.findings).toEqual([
      expect.objectContaining({
        id: "c1:O",
        layer: "restauradora",
        label: "Caries",
        status: "observed",
        surface: "O",
      }),
      expect.objectContaining({ id: "c1:M", surface: "M" }),
    ]);
    expect(tooth(teeth, 11)?.findings.map((finding) => finding.surface)).toEqual(["O", "L"]);
  });

  it("derives status from the clinical lifecycle", () => {
    const teeth = teethFor([
      entity({ id: "a", entityType: "TOOTH_STATE", status: "filling_pending", tooth: "26" }),
      entity({ id: "b", entityType: "TOOTH_STATE", status: "filling", tooth: "26" }),
      entity({ id: "c", entityType: "TOOTH_STATE", status: "filling_bad", tooth: "26" }),
      entity({
        id: "d",
        entityType: "ENDO",
        status: "done",
        tooth: "26",
        attributes: { lifecycle: "REALIZADO_OTRA_CLINICA" },
      }),
    ]);
    expect(
      tooth(teeth, 26)?.findings.map(({ label, status, layer }) => [label, status, layer]),
    ).toEqual([
      ["Obturación", "planned", "restauradora"],
      ["Obturación", "completed", "restauradora"],
      ["Obturación · a revisar", "observed", "restauradora"],
      ["Endodoncia", "completed", "endo"],
    ]);
  });

  it("assigns every treatment family to its specialty layer", () => {
    const layerOf = (
      partial: Partial<DentalEntity> & Pick<DentalEntity, "entityType" | "status">,
    ) => tooth(teethFor([entity({ id: "x", tooth: "36", ...partial })]), 36)?.findings[0]?.layer;
    expect(layerOf({ entityType: "CROWN", status: "crown_pending" })).toBe("protesis");
    expect(layerOf({ entityType: "TOOTH_STATE", status: "post" })).toBe("endo");
    expect(layerOf({ entityType: "EXTRACTION", status: "planned" })).toBe("cirugia");
    expect(layerOf({ entityType: "BRIDGE", status: "prosthesis" })).toBe("protesis");
    expect(layerOf({ entityType: "SUPERNUMERARY_TOOTH", status: "present" })).toBe("cirugia");
  });

  it("marks absent teeth and implants and skips healthy, inactive or toothless entities", () => {
    const teeth = teethFor([
      entity({ id: "m", entityType: "MISSING", status: "missing", tooth: "46" }),
      entity({ id: "i", entityType: "IMPLANT", status: "implant", tooth: "36" }),
      entity({ id: "h", entityType: "HEALTHY", status: "healthy", tooth: "21" }),
      entity({ id: "off", entityType: "CARIES", status: "caries", tooth: "22", active: false }),
      entity({ id: "arch", entityType: "REMOVABLE", status: "removable" }),
    ]);
    expect(tooth(teeth, 46)?.presence).toBe("absent");
    expect(tooth(teeth, 36)?.presence).toBe("implant");
    expect(tooth(teeth, 21)?.findings).toEqual([]);
    expect(tooth(teeth, 22)?.findings).toEqual([]);
  });

  it("turns orthodontic tooth marks into bracket findings", () => {
    const teeth = teethFor([
      entity({
        id: "o",
        entityType: "ORTHODONTIC",
        status: "planned",
        attributes: { toothMarks: { "11": "bracket", "21": "band", "31": 7 } },
      }),
    ]);
    expect(tooth(teeth, 11)?.findings).toEqual([
      expect.objectContaining({ layer: "orto", label: "Bracket", marker: "bracket" }),
    ]);
    expect(tooth(teeth, 21)?.findings[0]).toMatchObject({ label: "Banda", layer: "orto" });
    expect(tooth(teeth, 21)?.findings[0]?.marker).toBeUndefined();
    expect(tooth(teeth, 31)?.findings).toEqual([]);
  });

  it("maps probing sites and bleeding or suppuration to perio findings", () => {
    const teeth = teethFor(
      [],
      [
        reading("MV", 3),
        reading("MP", 5, { bleeding: true }),
        reading("P/L", 2),
        reading("DP", 4, { suppuration: true }),
      ],
    );
    expect(tooth(teeth, 16)?.probing).toEqual({ MV: 3, ML: 5, L: 2, DL: 4 });
    expect(tooth(teeth, 16)?.findings).toEqual([
      expect.objectContaining({
        layer: "perio",
        label: "Sangrado al sondaje",
        site: "ML",
        status: "observed",
      }),
      expect.objectContaining({ layer: "perio", label: "Supuración", site: "DL" }),
    ]);
  });

  it("charts bleeding even when the depth was not recorded", () => {
    const teeth = toVisualTeeth(
      [],
      [{ tooth: "16", site: "V", bleeding: true }],
      deriveMouthState([]),
    );
    expect(tooth(teeth, 16)?.probing).toBeUndefined();
    expect(tooth(teeth, 16)?.findings[0]).toMatchObject({
      site: "V",
      label: "Sangrado al sondaje",
    });
  });

  it("keeps notes and dates when the entity carries them", () => {
    const teeth = teethFor([
      entity({
        id: "n",
        entityType: "RESTORATION",
        status: "filling",
        tooth: "15",
        attributes: { notes: "Composite A2", recordedAt: "2026-09-01T10:00:00Z" },
      }),
    ]);
    expect(tooth(teeth, 15)?.findings[0]).toMatchObject({
      note: "Composite A2",
      recordedAt: "2026-09-01T10:00:00Z",
    });
  });
});

describe("toVisualDentition", () => {
  it("follows the patient's dentition", () => {
    expect(toVisualDentition(deriveMouthState([]))).toBe("permanent");
    expect(
      toVisualDentition(deriveMouthState([], { birthDate: "2023-01-01", today: "2026-10-03" })),
    ).toBe("primary");
    expect(
      toVisualDentition(deriveMouthState([], { birthDate: "2017-01-01", today: "2026-10-03" })),
    ).toBe("mixed");
  });
});
