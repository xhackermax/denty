import { describe, expect, it } from "vitest";
import {
  canApplyGameVoucher,
  canIssuePrescription,
  canTransitionAlternative,
  canTransitionClinicalPlanItem,
  canTransitionDocument,
  canTransitionInvoice,
  canTransitionPrescription,
  canRetryVerifactu,
  canTransitionAppointment,
  canTransitionLaboratory,
  hasInvoiceBalance,
  isLaboratoryLate,
  maxPaymentAllocation,
  nextAttendanceAction,
} from "../state-machines";

describe("state machines", () => {
  it("preserva las transiciones clínicas de cita", () => {
    expect(canTransitionAppointment("PLANNED", "arrive", "RECEPTION")).toBe(true);
    expect(canTransitionAppointment("COMPLETED", "arrive", "RECEPTION")).toBe(false);
    expect(canTransitionAppointment("ARRIVED", "confirm_waiting_room", "RECEPTION", false)).toBe(
      true,
    );
    expect(canTransitionAppointment("ARRIVED", "confirm_waiting_room", "DENTIST", false)).toBe(
      false,
    );
    expect(canTransitionAppointment("ARRIVED", "confirm_waiting_room", "RECEPTION", true)).toBe(
      false,
    );
  });

  it("controla laboratorio y retrasos", () => {
    expect(canTransitionLaboratory("SCANNED", "SENT")).toBe(true);
    expect(canTransitionLaboratory("PLACED", "SENT")).toBe(false);
    expect(isLaboratoryLate("2026-09-20T10:00:00+02:00", "SENT", "2026-09-21T10:00:00+02:00")).toBe(
      true,
    );
    expect(
      isLaboratoryLate("2026-09-20T10:00:00+02:00", "RECEIVED", "2026-09-21T10:00:00+02:00"),
    ).toBe(false);
  });

  it("controla VERI*FACTU, saldos y asignación de cobro", () => {
    expect(canRetryVerifactu("ERROR")).toBe(true);
    expect(canRetryVerifactu("ACCEPTED")).toBe(false);
    expect(hasInvoiceBalance("ISSUED", 10_000, 9_000)).toBe(true);
    expect(maxPaymentAllocation(5_000, 2_300)).toBe(2_300);
  });

  it("exige receta validada, paciente, prescriptor y medicamento", () => {
    expect(
      canIssuePrescription({
        state: "READY",
        patientId: "p1",
        prescriberId: "d1",
        medicationCount: 1,
      }),
    ).toBe(true);
    expect(canIssuePrescription({ state: "READY", patientId: "p1", medicationCount: 1 })).toBe(
      false,
    );
  });

  it("models invoice, prescription, plan, alternative, document and voucher transitions", () => {
    expect(canTransitionInvoice("DRAFT", "ISSUED")).toBe(true);
    expect(canTransitionInvoice("DRAFT", "RECTIFIED")).toBe(false);

    expect(canTransitionPrescription("DRAFT", "READY")).toBe(true);
    expect(canTransitionPrescription("READY", "ISSUED")).toBe(true);
    expect(canTransitionPrescription("CANCELLED", "READY")).toBe(false);

    expect(canTransitionClinicalPlanItem("PLANNED", "ACTIVE")).toBe(true);
    expect(canTransitionClinicalPlanItem("COMPLETED", "ACTIVE")).toBe(false);

    expect(canTransitionAlternative("DRAFT", "CLINICALLY_APPROVED")).toBe(true);
    expect(canTransitionAlternative("CLINICALLY_APPROVED", "REJECTED")).toBe(false);

    expect(canTransitionDocument("DRAFT", "FINALIZED")).toBe(true);
    expect(canTransitionDocument("SIGNED", "DELIVERED")).toBe(true);
    expect(canTransitionDocument("ARCHIVED", "SIGNED")).toBe(false);

    expect(canApplyGameVoucher("AVAILABLE")).toBe(true);
    expect(canApplyGameVoucher("APPLIED")).toBe(false);
  });

  it("alterna la siguiente acción de fichaje", () => {
    expect(nextAttendanceAction("IN")).toBe("OUT");
    expect(nextAttendanceAction("OUT")).toBe("IN");
  });
});
