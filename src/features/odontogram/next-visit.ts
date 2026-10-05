export interface NextVisitPlanItem {
  readonly id: string;
  readonly tooth?: string | null | undefined;
  readonly label: string;
  readonly status: string;
}

export interface PendingTreatment {
  readonly id: string;
  readonly tooth: string;
  readonly label: string;
}

const CLOSED_STATUSES = new Set(["COMPLETED", "DONE", "CANCELLED", "SUPERSEDED", "REJECTED"]);

export function pendingTreatments(items: readonly NextVisitPlanItem[]): PendingTreatment[] {
  return items
    .filter((item) => item.tooth && !CLOSED_STATUSES.has(item.status.toUpperCase()))
    .map((item) => ({ id: item.id, tooth: item.tooth as string, label: item.label }));
}

export function pendingTeeth(pending: readonly PendingTreatment[]): Set<string> {
  return new Set(pending.map((item) => item.tooth));
}

// Texto para el campo «Previsto para la próxima visita» a partir de los dientes marcados.
export function nextVisitText(
  pending: readonly PendingTreatment[],
  pickedTeeth: ReadonlySet<string>,
): string {
  return pending
    .filter((item) => pickedTeeth.has(item.tooth))
    .map((item) => `Pieza ${item.tooth}: ${item.label}`)
    .join("; ");
}
