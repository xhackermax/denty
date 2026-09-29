/**
 * Guided treatment flow: odontogram → plan → consents → budget → signature →
 * appointments. Pure decisions about which step can be reached, kept apart from
 * the modal so they can be tested.
 */
export const TREATMENT_FLOW_STEPS = [
  "plan",
  "consents",
  "budget",
  "signature",
  "appointments",
] as const;

export type TreatmentFlowStep = (typeof TREATMENT_FLOW_STEPS)[number];

const CLOSED_ITEM_STATUSES = new Set(["CANCELLED", "SUPERSEDED", "COMPLETED", "DONE"]);

export function isOpenPlanItem(item: { status: string }): boolean {
  return !CLOSED_ITEM_STATUSES.has(item.status.toUpperCase());
}

export interface TreatmentFlowState {
  openItemCount: number;
  pendingConsentCount: number;
  budget: { status: string; outdated: boolean } | null;
}

export function budgetIsSignedAndCurrent(state: TreatmentFlowState): boolean {
  return state.budget?.status === "SIGNED" && !state.budget.outdated;
}

/** Where to land when the flow opens: straight to appointments if already signed. */
export function initialTreatmentFlowStep(state: TreatmentFlowState): TreatmentFlowStep {
  return budgetIsSignedAndCurrent(state) && state.openItemCount > 0 ? "appointments" : "plan";
}

/** Why "Siguiente" is disabled on a step, or null when the user can move on. */
export function treatmentFlowBlocker(
  step: TreatmentFlowStep,
  state: TreatmentFlowState,
): string | null {
  if (step === "plan" && state.openItemCount === 0)
    return "Marca en el odontograma las caries o los tratamientos pendientes para crear el plan.";
  if (step === "consents" && state.pendingConsentCount > 0)
    return state.pendingConsentCount === 1
      ? "Falta firmar 1 consentimiento."
      : `Falta firmar ${state.pendingConsentCount} consentimientos.`;
  if (step === "budget" && !state.budget) return "Preparando el presupuesto…";
  if (step === "signature" && state.budget?.status !== "SIGNED")
    return "El paciente tiene que firmar el presupuesto.";
  return null;
}

/** Parses a euro amount typed by the user ("45", "45,5", "1.200,00") into cents. */
export function eurosToCents(value: string | number): number | null {
  if (typeof value === "number")
    return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
  const normalized = value
    .trim()
    .replace(/\s|€/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  if (!normalized) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

interface OdontogramEntityLike {
  tooth?: string | undefined;
  entityType: string;
  status: string;
  surfaces?: readonly string[] | undefined;
  active?: boolean | undefined;
  attributes?: Readonly<Record<string, unknown>> | undefined;
}

const TREATMENT_ENTITY_TYPES = new Set([
  "RESTORATION",
  "CROWN",
  "ENDO",
  "POST",
  "IMPLANT",
  "EXTRACTION",
  "PROSTHESIS",
  "REMOVABLE",
]);

/** Something the plan will turn into a treatment: a caries, a planned or a defective one. */
function needsTreatment(entity: OdontogramEntityLike): boolean {
  if (entity.active === false || !entity.tooth) return false;
  if (entity.entityType.toUpperCase() === "CARIES") return true;
  if (!TREATMENT_ENTITY_TYPES.has(entity.entityType.toUpperCase())) return false;
  return (
    /(_planned|_pending|_indicated|_unsatisfactory|_bad)$/i.test(entity.status) ||
    entity.attributes?.lifecycle === "PLANIFICADO"
  );
}

function treatmentKey(entity: OdontogramEntityLike): string {
  return `${entity.tooth}:${entity.entityType.toUpperCase()}:${[...(entity.surfaces ?? [])].sort().join("")}`;
}

/**
 * After saving the odontogram: did the dentist mark something new to treat? Then
 * the guided flow opens by itself (plan → consents → budget → signature → appointments).
 */
export function hasNewTreatmentWork(
  before: readonly OdontogramEntityLike[],
  after: readonly OdontogramEntityLike[],
): boolean {
  const known = new Set(before.filter(needsTreatment).map(treatmentKey));
  return after.filter(needsTreatment).some((entity) => !known.has(treatmentKey(entity)));
}
