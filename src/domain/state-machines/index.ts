import { epochMillis } from "../dates";
import type { Role } from "../permissions";

export type AppointmentState =
  "PLANNED" | "CONFIRMED" | "ARRIVED" | "IN_CHAIR" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
export type AppointmentAction =
  "confirm" | "arrive" | "confirm_waiting_room" | "chair" | "complete" | "no_show" | "cancel";

export type LaboratoryState =
  | "PLANNED"
  | "IMPRESSION_TAKEN"
  | "SCANNED"
  | "SENT"
  | "IN_PRODUCTION"
  | "TRIAL"
  | "RECEIVED"
  | "PLACED"
  | "INCIDENT"
  | "CANCELLED";

export type PrescriptionState = "DRAFT" | "READY" | "ISSUED" | "CANCELLED";
export type InvoiceState = "DRAFT" | "ISSUED" | "RECTIFIED";
export type VerifactuState = "PENDING" | "ACCEPTED" | "REJECTED" | "ERROR";
export type ClinicalPlanItemState = "PLANNED" | "ACTIVE" | "DEFERRED" | "COMPLETED" | "CANCELLED";
export type AlternativeState = "DRAFT" | "CLINICALLY_APPROVED" | "REJECTED";
export type DocumentState = "DRAFT" | "FINALIZED" | "SIGNED" | "DELIVERED" | "ARCHIVED";
export type GameVoucherState = "AVAILABLE" | "APPLIED";
export type AttendanceNextAction = "IN" | "OUT";

const APPOINTMENT_TRANSITIONS: Readonly<Record<AppointmentAction, readonly AppointmentState[]>> = {
  confirm: ["PLANNED"],
  arrive: ["PLANNED", "CONFIRMED"],
  confirm_waiting_room: ["ARRIVED"],
  chair: ["ARRIVED"],
  complete: ["IN_CHAIR"],
  no_show: ["PLANNED", "CONFIRMED", "ARRIVED"],
  cancel: ["PLANNED", "CONFIRMED", "ARRIVED"],
};

export function canTransitionAppointment(
  from: AppointmentState,
  action: AppointmentAction,
  actorRole: Role,
  hasVisitSession = false,
): boolean {
  if (!APPOINTMENT_TRANSITIONS[action].includes(from)) return false;
  if (action === "confirm_waiting_room") {
    return !hasVisitSession && ["ADMIN", "RECEPTION"].includes(actorRole);
  }
  return actorRole !== "PATIENT";
}

const LAB_TRANSITIONS: Readonly<Record<LaboratoryState, readonly LaboratoryState[]>> = {
  PLANNED: ["IMPRESSION_TAKEN", "SCANNED", "CANCELLED"],
  IMPRESSION_TAKEN: ["SENT", "INCIDENT", "CANCELLED"],
  SCANNED: ["SENT", "INCIDENT", "CANCELLED"],
  SENT: ["IN_PRODUCTION", "INCIDENT", "CANCELLED"],
  IN_PRODUCTION: ["TRIAL", "RECEIVED", "INCIDENT", "CANCELLED"],
  TRIAL: ["IN_PRODUCTION", "RECEIVED", "INCIDENT", "CANCELLED"],
  RECEIVED: ["PLACED", "INCIDENT"],
  PLACED: [],
  INCIDENT: ["IN_PRODUCTION", "TRIAL", "RECEIVED", "CANCELLED"],
  CANCELLED: [],
};

export function canTransitionLaboratory(from: LaboratoryState, to: LaboratoryState): boolean {
  return LAB_TRANSITIONS[from].includes(to);
}

export function isLaboratoryLate(
  etaAt: Date | number | string,
  state: LaboratoryState,
  now: Date | number | string = Date.now(),
): boolean {
  if (["RECEIVED", "PLACED", "CANCELLED"].includes(state)) return false;
  return epochMillis(etaAt) < epochMillis(now);
}

const INVOICE_TRANSITIONS: Readonly<Record<InvoiceState, readonly InvoiceState[]>> = {
  DRAFT: ["ISSUED"],
  ISSUED: ["RECTIFIED"],
  RECTIFIED: [],
};

export function canTransitionInvoice(from: InvoiceState, to: InvoiceState): boolean {
  return INVOICE_TRANSITIONS[from].includes(to);
}

const PRESCRIPTION_TRANSITIONS: Readonly<Record<PrescriptionState, readonly PrescriptionState[]>> =
  {
    DRAFT: ["READY", "CANCELLED"],
    READY: ["ISSUED", "CANCELLED"],
    ISSUED: ["CANCELLED"],
    CANCELLED: [],
  };

export function canTransitionPrescription(from: PrescriptionState, to: PrescriptionState): boolean {
  return PRESCRIPTION_TRANSITIONS[from].includes(to);
}

const PLAN_ITEM_TRANSITIONS: Readonly<
  Record<ClinicalPlanItemState, readonly ClinicalPlanItemState[]>
> = {
  PLANNED: ["ACTIVE", "DEFERRED", "COMPLETED", "CANCELLED"],
  ACTIVE: ["DEFERRED", "COMPLETED", "CANCELLED"],
  DEFERRED: ["PLANNED", "ACTIVE", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionClinicalPlanItem(
  from: ClinicalPlanItemState,
  to: ClinicalPlanItemState,
): boolean {
  return PLAN_ITEM_TRANSITIONS[from].includes(to);
}

const ALTERNATIVE_TRANSITIONS: Readonly<Record<AlternativeState, readonly AlternativeState[]>> = {
  DRAFT: ["CLINICALLY_APPROVED", "REJECTED"],
  CLINICALLY_APPROVED: [],
  REJECTED: [],
};

export function canTransitionAlternative(from: AlternativeState, to: AlternativeState): boolean {
  return ALTERNATIVE_TRANSITIONS[from].includes(to);
}

const DOCUMENT_TRANSITIONS: Readonly<Record<DocumentState, readonly DocumentState[]>> = {
  DRAFT: ["FINALIZED"],
  FINALIZED: ["SIGNED"],
  SIGNED: ["DELIVERED"],
  DELIVERED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionDocument(from: DocumentState, to: DocumentState): boolean {
  return DOCUMENT_TRANSITIONS[from].includes(to);
}

export function canApplyGameVoucher(state: GameVoucherState): boolean {
  return state === "AVAILABLE";
}

export function canRetryVerifactu(state: VerifactuState): boolean {
  return state === "REJECTED" || state === "ERROR";
}

export function hasInvoiceBalance(
  state: InvoiceState,
  totalCents: number,
  paidCents: number,
): boolean {
  return ["ISSUED", "RECTIFIED"].includes(state) && paidCents < totalCents;
}

export function maxPaymentAllocation(
  paymentRemainingCents: number,
  invoiceBalanceCents: number,
): number {
  return Math.max(0, Math.min(paymentRemainingCents, invoiceBalanceCents));
}

export function canIssuePrescription(input: {
  state: PrescriptionState;
  patientId?: string;
  prescriberId?: string;
  medicationCount: number;
}): boolean {
  return (
    input.state === "READY" &&
    Boolean(input.patientId) &&
    Boolean(input.prescriberId) &&
    input.medicationCount >= 1
  );
}

export function nextAttendanceAction(current: AttendanceNextAction): AttendanceNextAction {
  return current === "IN" ? "OUT" : "IN";
}
