import { describe, expect, it } from "vitest";

import { availableRecallActions } from "../recall-actions";

const base = { status: "pending" as const, closeReason: null, nextAppointment: null };

describe("availableRecallActions", () => {
  it("ofrece el trabajo diario a un recall pendiente sin cita", () => {
    expect(availableRecallActions(base)).toEqual([
      "CONTACT",
      "POSTPONE",
      "RESCHEDULE",
      "COMPLETE",
      "CANCEL",
    ]);
  });

  it("solo permite vincular cuando el paciente tiene una próxima cita", () => {
    const actions = availableRecallActions({
      ...base,
      status: "contacted",
      nextAppointment: { id: "a", startsAt: "2026-11-02T09:00:00Z" },
    });
    expect(actions).toContain("LINK_APPOINTMENT");
  });

  it("con cita reservada solo deja completar o cancelar", () => {
    expect(availableRecallActions({ ...base, status: "booked" })).toEqual(["COMPLETE", "CANCEL"]);
  });

  it("reabre solo los cancelados, no los completados", () => {
    expect(
      availableRecallActions({ ...base, status: "dismissed", closeReason: "CANCELLED" }),
    ).toEqual(["REOPEN"]);
    expect(
      availableRecallActions({ ...base, status: "dismissed", closeReason: "COMPLETED" }),
    ).toEqual([]);
    expect(availableRecallActions({ ...base, status: "dismissed", closeReason: null })).toEqual([]);
  });
});
