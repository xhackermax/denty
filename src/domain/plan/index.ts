export type PlanItemStatus = "PLANNED" | "ACTIVE" | "DEFERRED" | "COMPLETED" | "CANCELLED";

export interface PlanItem {
  id: string;
  treatmentCode: string;
  label: string;
  phase: 1 | 2 | 3 | 4 | 5;
  priority: number;
  status: PlanItemStatus;
}

export interface PlanDependency {
  itemId: string;
  dependsOnId: string;
  reason: string;
}

export interface TreatmentPlanGraph {
  items: readonly PlanItem[];
  dependencies: readonly PlanDependency[];
}

export type AlternativeType =
  "missing_tooth" | "tooth_prognosis" | "restoration_choice" | "removable_design";

export type PatientPlanPreference = "INTERESTED" | "DISCUSS";

export function friendlyAlternativeLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (/conservar|preserve|retain/.test(normalized)) return "Conservar el diente";
  if (/puente|bridge/.test(normalized)) return "Reponer con puente";
  if (/removible|removable/.test(normalized)) return "Prótesis removible";
  if (/provisional|temporary/.test(normalized)) return "Alternativa provisional";
  if (/sustituir|replace|implant/.test(normalized)) return "Sustituir el diente";
  return value;
}

function requireClinicalReason(reason: string): string {
  const normalized = reason.trim();
  if (!normalized) throw new Error("El cambio manual requiere un motivo clínico");
  return normalized;
}

export function changePlanItemPhase(
  item: PlanItem,
  phase: PlanItem["phase"],
  reason: string,
): { item: PlanItem; reason: string } {
  return { item: { ...item, phase }, reason: requireClinicalReason(reason) };
}

export function changePlanItemPriority(
  item: PlanItem,
  priority: number,
  reason: string,
): { item: PlanItem; reason: string } {
  if (!Number.isFinite(priority) || priority < 0 || priority > 100) {
    throw new RangeError("La prioridad debe estar entre 0 y 100");
  }
  return { item: { ...item, priority }, reason: requireClinicalReason(reason) };
}

export const BUDGET_CATEGORIES = [
  "Terapia básica",
  "Prótesis",
  "Cirugía e implantes",
  "Ortodoncia",
] as const;
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export function budgetCategoryForTreatment(
  item: Pick<PlanItem, "treatmentCode" | "label">,
): BudgetCategory {
  const code = `${item.treatmentCode} ${item.label}`.toLowerCase();
  if (/ortho|bracket|aligner|ortodon/.test(code)) return "Ortodoncia";
  if (/implant|sinus|graft|bone|regener|membran/.test(code)) return "Cirugía e implantes";
  if (/crown|corona|bridge|puente|removable|protes|prótes|onlay|inlay|veneer|carilla/.test(code)) {
    return "Prótesis";
  }
  return "Terapia básica";
}

export function validateGraph(graph: TreatmentPlanGraph): void {
  const ids = new Set(graph.items.map((item) => item.id));
  const dependencies = new Map<string, string[]>();

  for (const dependency of graph.dependencies) {
    if (!dependency.reason.trim()) throw new Error("Toda dependencia requiere un motivo clínico");
    if (!ids.has(dependency.itemId) || !ids.has(dependency.dependsOnId)) {
      throw new Error("La dependencia referencia un ítem inexistente");
    }
    if (dependency.itemId === dependency.dependsOnId) {
      throw new Error("Un ítem no puede depender de sí mismo");
    }
    const current = dependencies.get(dependency.itemId) ?? [];
    dependencies.set(dependency.itemId, [...current, dependency.dependsOnId]);
  }

  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (id: string): void => {
    if (done.has(id)) return;
    if (visiting.has(id)) throw new Error("El plan contiene una dependencia circular");
    visiting.add(id);
    for (const dependency of dependencies.get(id) ?? []) visit(dependency);
    visiting.delete(id);
    done.add(id);
  };

  for (const item of graph.items) visit(item.id);
}

export function orderedPlan(graph: TreatmentPlanGraph): PlanItem[] {
  validateGraph(graph);
  const byId = new Map(graph.items.map((item) => [item.id, item]));
  const dependencies = new Map<string, string[]>();
  for (const dependency of graph.dependencies) {
    const current = dependencies.get(dependency.itemId) ?? [];
    dependencies.set(dependency.itemId, [...current, dependency.dependsOnId]);
  }

  const ordered: PlanItem[] = [];
  const seen = new Set<string>();
  const visit = (item: PlanItem): void => {
    if (seen.has(item.id)) return;
    for (const id of dependencies.get(item.id) ?? []) {
      const dependency = byId.get(id);
      if (dependency) visit(dependency);
    }
    seen.add(item.id);
    ordered.push(item);
  };

  [...graph.items]
    .sort((a, b) => a.phase - b.phase || b.priority - a.priority || a.label.localeCompare(b.label))
    .forEach(visit);
  return ordered;
}

export function addDependency(
  graph: TreatmentPlanGraph,
  dependency: PlanDependency,
): TreatmentPlanGraph {
  const next = { ...graph, dependencies: [...graph.dependencies, dependency] };
  validateGraph(next);
  return next;
}

export function removeDependency(
  graph: TreatmentPlanGraph,
  itemId: string,
  dependsOnId: string,
  reason: string,
): TreatmentPlanGraph {
  requireClinicalReason(reason);
  const dependencies = graph.dependencies.filter(
    (dependency) => !(dependency.itemId === itemId && dependency.dependsOnId === dependsOnId),
  );
  if (dependencies.length === graph.dependencies.length) {
    throw new Error("La dependencia indicada no existe");
  }
  const next = { ...graph, dependencies };
  validateGraph(next);
  return next;
}

export const CLINICAL_PHASES = {
  acute: 1,
  periodontal: 2,
  disease: 3,
  missing: 4,
  rehabilitation: 5,
} as const;

export function clinicalPhaseForTreatment(
  item: Pick<PlanItem, "treatmentCode"> & { clinicalReason?: string },
): PlanItem["phase"] {
  const text = `${item.treatmentCode} ${item.clinicalReason ?? ""}`.toLowerCase();
  if (/dolor|infecc|absceso|pulpitis|necrosis|endodon|reendodon|extracci/.test(text)) return 1;
  if (/period|raspado|alisado|higiene profunda|gingiv/.test(text)) return 2;
  if (/caries|restaur|empaste|saneamiento/.test(text)) return 3;
  if (/ausen|missing|reponer|valoracion.*implante|valoración.*implante/.test(text)) return 4;
  return 5;
}

export type KennedyClass = "I" | "II" | "III" | "IV" | "UNCLASSIFIED";

interface KennedyToothPosition {
  readonly arch: "upper" | "lower";
  readonly side: "right" | "left";
  readonly position: number;
}

function kennedyToothPosition(tooth: string): KennedyToothPosition | null {
  if (!/^\d{2}$/.test(tooth)) return null;
  const quadrant = Number(tooth[0]);
  const position = Number(tooth[1]);
  if (quadrant < 1 || quadrant > 4 || position < 1 || position > 8) return null;
  return {
    arch: quadrant <= 2 ? "upper" : "lower",
    side: quadrant === 1 || quadrant === 4 ? "right" : "left",
    position,
  };
}

/**
 * Sugerencia conservadora heredada del motor 2.3.x. La clasificación definitiva
 * debe ser confirmada por el profesional antes de aprobar una alternativa removible.
 */
export function suggestKennedyClass(missingTeeth: readonly string[]): KennedyClass {
  const positions = missingTeeth.map(kennedyToothPosition);
  if (!positions.length || positions.some((position) => position === null)) return "UNCLASSIFIED";

  const teeth = positions.filter((position): position is KennedyToothPosition => position !== null);
  const arch = teeth[0]?.arch;
  if (!arch || teeth.some((position) => position.arch !== arch)) return "UNCLASSIFIED";

  const right = teeth.filter((position) => position.side === "right");
  const left = teeth.filter((position) => position.side === "left");
  const distalExtension = (side: readonly KennedyToothPosition[]) =>
    side.some((position) => position.position >= 6) &&
    side.some((position) => position.position === 7 || position.position === 8);

  const rightDistal = distalExtension(right);
  const leftDistal = distalExtension(left);
  if (rightDistal && leftDistal) return "I";
  if (rightDistal || leftDistal) return "II";

  const crossesAnteriorMidline =
    right.some((position) => position.position <= 3) &&
    left.some((position) => position.position <= 3);
  if (crossesAnteriorMidline) return "IV";
  return "III";
}
