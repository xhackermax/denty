import { describe, expect, it } from "vitest";

import {
  createImplantStack,
  evaluateClinicalAction,
  evaluateClinicalBatch,
  type DentalEntity,
} from "../index";

let sequence = 0;
const dental = (overrides: Partial<DentalEntity>): DentalEntity => ({
  id: `rule-entity-${(sequence += 1)}`,
  tooth: "16",
  entityType: "SURGERY",
  status: "observation",
  active: true,
  ...overrides,
});

const cases: readonly [string, DentalEntity, readonly DentalEntity[]][] = [
  [
    "R001",
    dental({ entityType: "RESTORATION", status: "filling" }),
    [dental({ entityType: "MISSING", status: "missing" })],
  ],
  [
    "R002",
    dental({ entityType: "IMPLANT", status: "implant_pending" }),
    [dental({ entityType: "HEALTHY", status: "healthy" })],
  ],
  [
    "R003",
    dental({ entityType: "CROWN", status: "crown_pending" }),
    [dental({ entityType: "MISSING", status: "missing" })],
  ],
  ["R004", dental({ entityType: "POST", status: "post_pending" }), []],
  [
    "R005",
    dental({ entityType: "RESTORATION", status: "access_chimney" }),
    [dental({ entityType: "CROWN", status: "crown_pending" })],
  ],
  [
    "R006",
    dental({ entityType: "BRIDGE", status: "bridge_pending", attributes: { role: "abutment" } }),
    [dental({ entityType: "PERIODONTAL_FINDING", status: "mobility", attributes: { grade: 3 } })],
  ],
  [
    "R007",
    dental({ entityType: "PEDIATRIC", status: "sealant", surfaces: ["O"] }),
    [dental({ entityType: "CARIES", status: "caries", surfaces: ["O"] })],
  ],
  [
    "R008",
    dental({ entityType: "EXTRACTION", status: "extraction" }),
    [dental({ entityType: "PROSTHESIS", status: "bridge_abutment" })],
  ],
  [
    "R009",
    dental({ entityType: "REMOVABLE", status: "clasp", attributes: { bridgeAbutment: true } }),
    [],
  ],
  ["R010", dental({ entityType: "ENDO", status: "endo", attributes: { canalCount: 5 } }), []],
  [
    "R011",
    dental({
      tooth: "16",
      entityType: "PEDIATRIC",
      status: "pulpotomy",
      attributes: { immatureApex: false },
    }),
    [],
  ],
  ["R012", dental({ tooth: "16", entityType: "PEDIATRIC", status: "stainless_steel_crown" }), []],
  ["R013", dental({ entityType: "PEDIATRIC", status: "space_maintainer" }), []],
  [
    "R014",
    dental({
      entityType: "IMPLANT",
      status: "orthodontic_tad",
      attributes: { orthodonticTad: true },
    }),
    [],
  ],
  [
    "R015",
    dental({ entityType: "ENDO", status: "apexification", attributes: { immatureApex: false } }),
    [],
  ],
  [
    "R016",
    dental({ entityType: "ORTHODONTIC", status: "traction" }),
    [dental({ entityType: "TOOTH_STATE", status: "ankylosed" })],
  ],
  [
    "R017",
    dental({ entityType: "PROSTHESIS", status: "bridge_abutment" }),
    [dental({ entityType: "TOOTH_STATE", status: "external_root_resorption_severe" })],
  ],
  ["R018", dental({ entityType: "SURGERY", status: "extraction_surgical" }), []],
];

describe("clinical rules R001-R018", () => {
  it.each(cases)(
    "triggers %s with its intended clinical conflict",
    (ruleId, proposed, existing) => {
      const result = evaluateClinicalAction({ type: "UPSERT_ENTITY", entity: proposed }, existing);
      expect(result.ruleIds).toContain(ruleId);
      expect(result.outcome).not.toBe("ALLOW");
    },
  );

  describe("R003: a crown needs a tooth or an implant underneath", () => {
    const crown = () => dental({ entityType: "CROWN", status: "crown_pending" });
    const crownRule = (existing: readonly DentalEntity[]) =>
      evaluateClinicalAction(crown(), existing).ruleIds.includes("R003");

    it.each([
      ["an untouched natural tooth", []],
      ["a root-canal treated tooth", [dental({ entityType: "ENDO", status: "endo" })]],
      ["a restored tooth", [dental({ entityType: "RESTORATION", status: "filling" })]],
      ["a decayed tooth", [dental({ entityType: "CARIES", status: "caries" })]],
      [
        "an implant where the tooth was lost",
        [
          dental({ entityType: "MISSING", status: "missing" }),
          dental({ entityType: "IMPLANT", status: "implant" }),
        ],
      ],
    ] as const)("accepts %s", (_, existing) => {
      expect(crownRule(existing)).toBe(false);
    });

    it.each([
      ["a missing tooth", [dental({ entityType: "MISSING", status: "missing" })]],
      ["a tooth marked missing", [dental({ entityType: "TOOTH_STATE", status: "missing" })]],
      [
        "a tooth already extracted",
        [dental({ entityType: "EXTRACTION", status: "extraction_completed" })],
      ],
    ] as const)("asks for support on %s", (_, existing) => {
      expect(crownRule(existing)).toBe(true);
    });
  });

  it("allows an unrelated observation without false positives", () => {
    const result = evaluateClinicalAction(
      { type: "UPSERT_ENTITY", entity: dental({ tooth: "11", status: "observation" }) },
      [dental({ tooth: "26", entityType: "IMPLANT", status: "implant" })],
    );
    expect(result).toMatchObject({ outcome: "ALLOW", ruleIds: [] });
  });
});

describe("templates pass their own clinical rules", () => {
  it("an implant + abutment + crown stack on an untouched position is allowed", () => {
    const evaluation = evaluateClinicalBatch(
      createImplantStack("36").map((entity) => ({ type: "UPSERT_ENTITY" as const, entity })),
      [],
    );
    expect(evaluation).toMatchObject({ outcome: "ALLOW", ruleIds: [] });
  });

  it("marks the template crown as implant-supported", () => {
    const crown = createImplantStack("36").find((entity) => entity.entityType === "CROWN");
    expect(crown?.attributes?.implantSupported).toBe(true);
  });
});
