import type { RecallAction, RecallItem } from "@/shared/api";

type ActionSubject = Pick<RecallItem, "status" | "closeReason" | "nextAppointment">;

/** Mirrors the transitions accepted by private.recall_apply, so the menu never offers a dead action. */
export function availableRecallActions(recall: ActionSubject): RecallAction[] {
  switch (recall.status) {
    case "pending":
    case "contacted":
      return [
        "CONTACT",
        ...(recall.nextAppointment ? (["LINK_APPOINTMENT"] as const) : []),
        "POSTPONE",
        "RESCHEDULE",
        "COMPLETE",
        "CANCEL",
      ];
    case "booked":
      return ["COMPLETE", "CANCEL"];
    case "dismissed":
      return recall.closeReason === "CANCELLED" ? ["REOPEN"] : [];
    default:
      return [];
  }
}

export const RECALL_ACTION_LABELS: Record<RecallAction, string> = {
  CONTACT: "Marcar contactado",
  POSTPONE: "Posponer",
  RESCHEDULE: "Cambiar fecha",
  ASSIGN: "Cambiar responsable",
  LINK_APPOINTMENT: "Vincular próxima cita",
  COMPLETE: "Marcar realizado",
  CANCEL: "Cancelar recall",
  REOPEN: "Reabrir",
};
