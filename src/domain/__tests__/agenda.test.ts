import { describe, expect, it } from "vitest";
import {
  canMove,
  durationMinutes,
  layoutDay,
  resizeTo,
  snap,
  waitingVisualState,
  type AgendaAppointment,
} from "../agenda";

const appointment = (
  id: string,
  start: string,
  end: string,
  staffId = "doctor-1",
  cabinetId = "cabinet-1",
): AgendaAppointment => ({
  id,
  startsAt: `2026-09-21T${start}:00+02:00`,
  endsAt: `2026-09-21T${end}:00+02:00`,
  staffId,
  cabinetId,
});

describe("agenda domain", () => {
  it("pinta una cita de 08:30 aunque no coincida con una línea de 20 min", () => {
    const [layout] = layoutDay([appointment("a", "08:30", "09:00")]);
    expect(layout?.topMinutes).toBe(30);
    expect(layout?.heightMinutes).toBe(30);
  });

  it("distribuye solapes triples en columnas", () => {
    const layout = layoutDay([
      appointment("a", "09:00", "10:00"),
      appointment("b", "09:20", "10:20"),
      appointment("c", "09:40", "10:40"),
    ]);
    expect(new Set(layout.map((row) => row.column))).toEqual(new Set([0, 1, 2]));
    expect(layout.every((row) => row.columnCount === 3)).toBe(true);
  });

  it("mantiene duración proporcional incluso al cruzar mediodía", () => {
    const [layout] = layoutDay([appointment("a", "11:45", "12:45")]);
    expect(layout?.heightMinutes).toBe(60);
    expect(durationMinutes(appointment("a", "11:45", "12:45"))).toBe(60);
  });

  it("calcula duración real al atravesar cambios DST de Madrid", () => {
    expect(
      durationMinutes({
        startsAt: "2026-03-29T01:30:00+01:00",
        endsAt: "2026-03-29T03:30:00+02:00",
      }),
    ).toBe(60);
    expect(
      durationMinutes({
        startsAt: "2026-10-25T02:30:00+02:00",
        endsAt: "2026-10-25T02:30:00+01:00",
      }),
    ).toBe(60);
  });

  it("detecta conflicto de doctor, gabinete y bloque", () => {
    const moving = appointment("a", "09:00", "09:30");
    const others = [appointment("b", "09:20", "10:00")];
    expect(canMove(moving, moving, others).ok).toBe(false);
    expect(
      canMove(
        moving,
        moving,
        [],
        [
          {
            id: "block",
            startsAt: "2026-09-21T08:00:00+02:00",
            endsAt: "2026-09-21T10:00:00+02:00",
            staffId: "doctor-1",
          },
        ],
      ).ok,
    ).toBe(false);
  });

  it("redimensiona con mínimo 10 min y snap configurable", () => {
    expect(snap(37, 10)).toBe(40);
    const resized = resizeTo(appointment("a", "09:00", "09:30"), 5);
    expect(resized.endsAt).toBe("2026-09-21T09:10:00+02:00");
  });

  it("recupera la semántica visual de espera histórica", () => {
    expect(waitingVisualState({ status: "IN_CHAIR" })).toBe("green");
    expect(waitingVisualState({ status: "NO_SHOW" })).toBe("blue");
    expect(
      waitingVisualState({
        status: "ARRIVED",
        arrivedAt: "2026-09-21T09:00:00+02:00",
        now: "2026-09-21T09:16:00+02:00",
      }),
    ).toBe("red");
  });
});
