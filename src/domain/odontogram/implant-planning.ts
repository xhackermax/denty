import type { DentalEntity } from "./index.ts";

export type ImplantProstheticDesign =
  | "UNIT_TIBASE"
  | "MULTIUNIT_FIXED"
  | "DIRECT_SCREWED"
  | "BAR_OVERDENTURE"
  | "LOCATOR_OVERDENTURE"
  | "HYBRID_ALL_ON_X"
  | "CUSTOM";

export interface ImplantPlanComponent {
  readonly code: string;
  readonly label: string;
  readonly quantity: number;
  readonly tooth?: string;
  readonly billable: boolean;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

export interface PlannedImplant {
  readonly id: string;
  readonly tooth: string;
  readonly design: ImplantProstheticDesign;
  readonly implant: DentalEntity;
  readonly components: readonly ImplantPlanComponent[];
}

const component = (code: string, label: string, tooth: string): ImplantPlanComponent => ({
  code,
  label,
  quantity: 1,
  tooth,
  billable: true,
});

function componentsFor(design: ImplantProstheticDesign, tooth: string): ImplantPlanComponent[] {
  const fixture = component("IMPLANT_FIXTURE", "Implante / procedimiento quirúrgico", tooth);
  const screw = component("PROSTHETIC_SCREW", "Tornillo protésico", tooth);
  if (design === "UNIT_TIBASE")
    return [
      fixture,
      component("TIBASE", "TiBase", tooth),
      screw,
      component("DEFINITIVE_IMPLANT_CROWN", "Corona definitiva sobre implante", tooth),
    ];
  if (design === "MULTIUNIT_FIXED")
    return [
      fixture,
      component("MULTIUNIT", "Multiunit", tooth),
      screw,
      component("SCREWED_STRUCTURE", "Estructura atornillada", tooth),
    ];
  if (design === "DIRECT_SCREWED")
    return [
      fixture,
      screw,
      component("DIRECT_SCREWED_STRUCTURE", "Estructura directa a implante", tooth),
    ];
  if (design === "BAR_OVERDENTURE")
    return [
      fixture,
      component("BAR", "Barra implantosoportada", tooth),
      screw,
      component("OVERDENTURE", "Sobredentadura", tooth),
    ];
  if (design === "LOCATOR_OVERDENTURE")
    return [
      fixture,
      component("LOCATOR", "Locator", tooth),
      component("OVERDENTURE", "Sobredentadura", tooth),
    ];
  if (design === "HYBRID_ALL_ON_X")
    return [
      fixture,
      component("MULTIUNIT", "Multiunit", tooth),
      screw,
      component("HYBRID_ALL_ON_X", "Prótesis híbrida All-on-X", tooth),
    ];
  return [fixture];
}

export function createPlannedImplant(
  tooth: string,
  design: ImplantProstheticDesign = "UNIT_TIBASE",
): PlannedImplant {
  const id = `implant-${tooth}`;
  return {
    id,
    tooth,
    design,
    implant: {
      id,
      tooth,
      entityType: "IMPLANT",
      status: "implant_pending",
      active: true,
      attributes: { lifecycle: "PLANIFICADO", prostheticDesign: design },
    },
    components: componentsFor(design, tooth),
  };
}

export function deriveImplantBudgetBom(plan: PlannedImplant): ImplantPlanComponent[] {
  return plan.components
    .filter((item) => item.billable && item.quantity > 0)
    .map((item) => ({ ...item }));
}

export function implantPlanEntities(plan: PlannedImplant): DentalEntity[] {
  return [
    plan.implant,
    ...plan.components
      .filter((item) => item.code !== "IMPLANT_FIXTURE")
      .map<DentalEntity>((item) => ({
        id: `${plan.id}-${item.code.toLowerCase()}`,
        tooth: plan.tooth,
        entityType:
          item.code.includes("STRUCTURE") ||
          item.code.includes("CROWN") ||
          item.code === "OVERDENTURE"
            ? "PROSTHETIC_STRUCTURE"
            : "IMPLANT_COMPONENT",
        status: item.code.toLowerCase(),
        parentId: plan.id,
        active: true,
        attributes: { lifecycle: "PLANIFICADO", billableCode: item.code, quantity: item.quantity },
      })),
  ];
}
