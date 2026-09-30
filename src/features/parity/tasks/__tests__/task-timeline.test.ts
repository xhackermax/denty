import { describe, expect, it } from "vitest";

import type { TimelineTask } from "../task-types";
import {
  buildSchedule,
  dayStartMinute,
  dueAtToTimeInput,
  formatClock,
  formatRange,
  getWeekDays,
  mergeVisibleOrder,
  minuteOfDay,
  moveId,
  moveIdToIndex,
  planReplan,
  shiftDay,
  sortByPriority,
  timeInputToDueAt,
  zonedDayKey,
  zonedToUtc,
} from "../task-timeline";

let counter = 0;
function task(over: Partial<TimelineTask> = {}): TimelineTask {
  counter += 1;
  return {
    id: over.id ?? `t${counter}`,
    title: `Tarea ${counter}`,
    status: "OPEN",
    priority: "NORMAL",
    version: 1,
    position: counter,
    durationMin: 15,
    dueAt: null,
    archivedAt: null,
    ...over,
  };
}

// 2026-09-30 es horario de verano en Madrid (UTC+2).
const TODAY = "2026-09-30";
const at = (hhmm: string) => new Date(`2026-09-30T${hhmm}:00+02:00`);

describe("zona horaria Europe/Madrid", () => {
  it("calcula la clave de día local, no la UTC", () => {
    expect(zonedDayKey(new Date("2026-09-30T22:30:00Z"))).toBe("2026-10-01");
    expect(zonedDayKey(new Date("2026-09-30T21:59:00Z"))).toBe("2026-09-30");
  });
  it("calcula el minuto del día en verano e invierno", () => {
    expect(minuteOfDay(new Date("2026-09-30T08:30:00Z"))).toBe(10 * 60 + 30);
    expect(minuteOfDay(new Date("2026-01-15T08:30:00Z"))).toBe(9 * 60 + 30);
  });
  it("convierte día+minuto local a UTC respetando el cambio de hora", () => {
    expect(zonedToUtc("2026-09-30", 9 * 60).toISOString()).toBe("2026-09-30T07:00:00.000Z");
    expect(zonedToUtc("2026-01-15", 9 * 60).toISOString()).toBe("2026-01-15T08:00:00.000Z");
    // 25 oct 2026: termina el horario de verano a las 03:00 -> 02:00
    expect(zonedToUtc("2026-10-25", 12 * 60).toISOString()).toBe("2026-10-25T11:00:00.000Z");
    expect(zonedToUtc("2026-03-29", 12 * 60).toISOString()).toBe("2026-03-29T10:00:00.000Z");
  });
  it("admite minutos que desbordan el día", () => {
    expect(zonedToUtc("2026-09-30", 24 * 60 + 30).toISOString()).toBe("2026-09-30T22:30:00.000Z");
  });
});

describe("días y semanas", () => {
  it("shiftDay cruza meses y años", () => {
    expect(shiftDay("2026-09-30", 1)).toBe("2026-10-01");
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("getWeekDays devuelve 7 días lunes a domingo", () => {
    const week = getWeekDays("2026-09-30");
    expect(week).toHaveLength(7);
    expect(week[0]).toBe("2026-09-28");
    expect(week[6]).toBe("2026-10-04");
    expect(getWeekDays("2026-09-27")[0]).toBe("2026-09-21");
  });
});

describe("formato", () => {
  it("formatClock no rellena la hora con ceros", () => {
    expect(formatClock(9 * 60 + 30)).toBe("9:30");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(24 * 60 + 5)).toBe("0:05");
  });
  it("formatRange incluye duración", () => {
    expect(formatRange(570, 585)).toBe("9:30–9:45 (15 min)");
    expect(formatRange(540, 630)).toBe("9:00–10:30 (1 h 30 min)");
    expect(formatRange(540, 600)).toBe("9:00–10:00 (1 h)");
  });
});

describe("dayStartMinute", () => {
  it("antes de la jornada hoy: 09:00", () => {
    expect(dayStartMinute(TODAY, at("07:12"))).toBe(540);
  });
  it("durante la jornada hoy: hora actual redondeada a 5 min hacia arriba", () => {
    expect(dayStartMinute(TODAY, at("10:12"))).toBe(10 * 60 + 15);
    expect(dayStartMinute(TODAY, at("10:15"))).toBe(10 * 60 + 15);
  });
  it("otros días: 09:00", () => {
    expect(dayStartMinute("2026-10-01", at("15:00"))).toBe(540);
    expect(dayStartMinute("2026-09-29", at("15:00"))).toBe(540);
  });
});

describe("buildSchedule", () => {
  it("lista vacía", () => {
    const s = buildSchedule([], { dayKey: TODAY, now: at("08:00") });
    expect(s.entries).toEqual([]);
    expect(s.rows).toEqual([]);
  });

  it("apila duraciones desde las 09:00 en orden de position", () => {
    const a = task({ id: "a", position: 2, durationMin: 30 });
    const b = task({ id: "b", position: 1, durationMin: 15 });
    const s = buildSchedule([a, b], { dayKey: TODAY, now: at("08:00") });
    expect(s.entries.map((e) => e.task.id)).toEqual(["b", "a"]);
    expect(s.entries.map((e) => [e.startMin, e.endMin])).toEqual([
      [540, 555],
      [555, 585],
    ]);
    expect(s.rows.every((r) => r.kind === "task")).toBe(true);
  });

  it("usa 15 min si falta la duración o no es válida", () => {
    const s = buildSchedule(
      [
        task({ id: "a", durationMin: null, position: 1 }),
        task({ id: "b", durationMin: undefined, position: 2 }),
        task({ id: "c", durationMin: 0, position: 3 }),
      ],
      { dayKey: TODAY, now: at("08:00") },
    );
    expect(s.entries.map((e) => e.durationMin)).toEqual([15, 15, 15]);
    expect(s.entries[2]?.endMin).toBe(540 + 45);
  });

  it("hoy empieza en la hora actual redondeada", () => {
    const s = buildSchedule([task({ position: 1 })], { dayKey: TODAY, now: at("10:12") });
    expect(s.entries[0]?.startMin).toBe(10 * 60 + 15);
  });

  it("otro día empieza a las 09:00", () => {
    const s = buildSchedule([task({ position: 1 })], { dayKey: "2026-10-01", now: at("10:12") });
    expect(s.entries[0]?.startMin).toBe(540);
  });

  it("excluye archivadas y canceladas", () => {
    const s = buildSchedule(
      [
        task({ id: "a", position: 1 }),
        task({ id: "b", position: 2, archivedAt: "2026-09-01T00:00:00Z" }),
        task({ id: "c", position: 3, status: "CANCELLED" }),
      ],
      { dayKey: TODAY, now: at("08:00") },
    );
    expect(s.entries.map((e) => e.task.id)).toEqual(["a"]);
  });

  it("una tarea con dueAt ese día empieza a esa hora y genera hueco", () => {
    const a = task({ id: "a", position: 1, durationMin: 15 });
    const b = task({
      id: "b",
      position: 2,
      dueAt: "2026-09-30T10:00:00+02:00",
      durationMin: 30,
    });
    const s = buildSchedule([a, b], { dayKey: TODAY, now: at("08:00") });
    expect(s.entries[1]).toMatchObject({ startMin: 600, endMin: 630, explicit: true });
    expect(s.rows.map((r) => r.kind)).toEqual(["task", "gap", "task"]);
    const gap = s.rows[1];
    expect(gap?.kind === "gap" && gap.gap).toMatchObject({
      startMin: 555,
      endMin: 600,
      minutes: 45,
      elapsed: false,
    });
  });

  it("las tareas flotantes siguientes se apilan tras una tarea con hora", () => {
    const a = task({ id: "a", position: 1, dueAt: "2026-09-30T14:00:00+02:00" });
    const b = task({ id: "b", position: 2 });
    const s = buildSchedule([a, b], { dayKey: TODAY, now: at("08:00") });
    expect(s.entries[1]?.startMin).toBe(14 * 60 + 15);
  });

  it("un hueco pasado queda marcado como terminado", () => {
    const a = task({ id: "a", position: 1, dueAt: "2026-09-30T09:00:00+02:00" });
    const b = task({ id: "b", position: 2, dueAt: "2026-09-30T12:00:00+02:00" });
    const s = buildSchedule([a, b], { dayKey: TODAY, now: at("13:00") });
    const gap = s.rows.find((r) => r.kind === "gap");
    expect(gap?.kind === "gap" && gap.gap.elapsed).toBe(true);
  });

  it("detecta solapes entre tareas con hora", () => {
    const a = task({ id: "a", position: 1, dueAt: "2026-09-30T10:00:00+02:00", durationMin: 30 });
    const b = task({ id: "b", position: 2, dueAt: "2026-09-30T10:15:00+02:00", durationMin: 30 });
    const c = task({ id: "c", position: 3, dueAt: "2026-09-30T11:00:00+02:00", durationMin: 15 });
    const s = buildSchedule([a, b, c], { dayKey: TODAY, now: at("08:00") });
    expect(s.entries[0]?.conflictsWith).toEqual(["b"]);
    expect(s.entries[1]?.conflictsWith).toEqual(["a"]);
    expect(s.entries[2]?.conflictsWith).toEqual([]);
  });

  it("tareas contiguas (fin == inicio) no son conflicto", () => {
    const a = task({ id: "a", position: 1, dueAt: "2026-09-30T10:00:00+02:00", durationMin: 30 });
    const b = task({ id: "b", position: 2, dueAt: "2026-09-30T10:30:00+02:00" });
    const s = buildSchedule([a, b], { dayKey: TODAY, now: at("08:00") });
    expect(s.entries.flatMap((e) => e.conflictsWith)).toEqual([]);
  });

  it("las hechas no generan conflicto", () => {
    const a = task({
      id: "a",
      position: 1,
      status: "DONE",
      dueAt: "2026-09-30T10:00:00+02:00",
      durationMin: 30,
    });
    const b = task({ id: "b", position: 2, dueAt: "2026-09-30T10:15:00+02:00" });
    const s = buildSchedule([a, b], { dayKey: TODAY, now: at("08:00") });
    expect(s.entries.flatMap((e) => e.conflictsWith)).toEqual([]);
  });

  it("una tarea flotante desborda contra otra con hora y marca el conflicto", () => {
    const a = task({ id: "a", position: 1, durationMin: 90 });
    const b = task({ id: "b", position: 2, dueAt: "2026-09-30T10:00:00+02:00" });
    const s = buildSchedule([a, b], { dayKey: TODAY, now: at("08:00") });
    expect(s.entries[0]?.conflictsWith).toEqual(["b"]);
  });

  it("el dueAt se interpreta en Madrid: 23:30Z ya es el día siguiente", () => {
    const t = task({ id: "a", position: 1, dueAt: "2026-09-30T22:30:00Z", durationMin: 15 });
    const today = buildSchedule([t], { dayKey: TODAY, now: at("08:00") });
    expect(today.entries).toEqual([]);
    const tomorrow = buildSchedule([t], { dayKey: "2026-10-01", now: at("08:00") });
    expect(tomorrow.entries[0]).toMatchObject({ startMin: 30, explicit: true });
  });

  it("las tareas con dueAt de otro día no aparecen; sin dueAt aparecen siempre", () => {
    const fut = task({ id: "f", position: 1, dueAt: "2026-10-05T10:00:00+02:00" });
    const free = task({ id: "x", position: 2 });
    const s = buildSchedule([fut, free], { dayKey: TODAY, now: at("08:00") });
    expect(s.entries.map((e) => e.task.id)).toEqual(["x"]);
  });

  it("vencidas: con hora ya pasada y sin hacer", () => {
    const late = task({ id: "l", position: 1, dueAt: "2026-09-30T09:00:00+02:00" });
    const doneLate = task({
      id: "d",
      position: 2,
      status: "DONE",
      dueAt: "2026-09-30T09:30:00+02:00",
    });
    const future = task({ id: "u", position: 3, dueAt: "2026-09-30T17:00:00+02:00" });
    const s = buildSchedule([late, doneLate, future], { dayKey: TODAY, now: at("12:00") });
    expect(s.entries.filter((e) => e.overdue).map((e) => e.task.id)).toEqual(["l"]);
  });

  it("arrastra a hoy las no hechas con dueAt de días anteriores, como vencidas", () => {
    const old = task({ id: "o", position: 1, dueAt: "2026-09-28T10:00:00+02:00" });
    const oldDone = task({
      id: "od",
      position: 2,
      status: "DONE",
      dueAt: "2026-09-28T10:00:00+02:00",
    });
    const s = buildSchedule([old, oldDone], { dayKey: TODAY, now: at("08:00") });
    expect(s.entries.map((e) => [e.task.id, e.overdue, e.explicit])).toEqual([["o", true, false]]);
    const other = buildSchedule([old], { dayKey: "2026-10-01", now: at("08:00") });
    expect(other.entries).toEqual([]);
  });

  it("en días que no son hoy nada está vencido", () => {
    const t = task({ position: 1, dueAt: "2026-09-29T09:00:00+02:00" });
    const s = buildSchedule([t], { dayKey: "2026-09-29", now: at("12:00") });
    expect(s.entries[0]?.overdue).toBe(false);
  });
});

describe("sortByPriority", () => {
  it("ordena URGENT>HIGH>NORMAL>LOW de forma estable sin mutar", () => {
    const list = [
      task({ id: "n1", priority: "NORMAL" }),
      task({ id: "l1", priority: "LOW" }),
      task({ id: "u1", priority: "URGENT" }),
      task({ id: "n2", priority: "NORMAL" }),
      task({ id: "h1", priority: "HIGH" }),
      task({ id: "u2", priority: "URGENT" }),
    ];
    const copy = [...list];
    expect(sortByPriority(list).map((t) => t.id)).toEqual(["u1", "u2", "h1", "n1", "n2", "l1"]);
    expect(list).toEqual(copy);
  });
  it("lista vacía", () => {
    expect(sortByPriority([])).toEqual([]);
  });
});

describe("mover ids", () => {
  const ids = ["a", "b", "c"];
  it("moveId sube y baja", () => {
    expect(moveId(ids, "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveId(ids, "b", 1)).toEqual(["a", "c", "b"]);
  });
  it("moveId respeta los límites y ids desconocidos", () => {
    expect(moveId(ids, "a", -1)).toEqual(ids);
    expect(moveId(ids, "c", 1)).toEqual(ids);
    expect(moveId(ids, "zz", 1)).toEqual(ids);
  });
  it("moveIdToIndex recoloca por arrastre", () => {
    expect(moveIdToIndex(ids, "a", 2)).toEqual(["b", "c", "a"]);
    expect(moveIdToIndex(ids, "c", 0)).toEqual(["c", "a", "b"]);
    expect(moveIdToIndex(ids, "b", 1)).toEqual(ids);
    expect(moveIdToIndex(ids, "a", 99)).toEqual(["b", "c", "a"]);
    expect(moveIdToIndex(ids, "a", -5)).toEqual(ids);
  });
  it("mergeVisibleOrder conserva las posiciones de las no visibles", () => {
    expect(mergeVisibleOrder(["a", "X", "b", "Y", "c"], ["c", "a", "b"])).toEqual([
      "c",
      "X",
      "a",
      "Y",
      "b",
    ]);
    expect(mergeVisibleOrder(["X"], [])).toEqual(["X"]);
  });
});

describe("planReplan", () => {
  it("mueve las vencidas al principio de lo pendiente conservando su orden y limpia dueAt", () => {
    const list = [
      task({ id: "d", position: 1, status: "DONE" }),
      task({ id: "p", position: 2 }),
      task({ id: "o1", position: 3, dueAt: "2026-09-30T09:00:00+02:00" }),
      task({ id: "q", position: 4 }),
      task({ id: "o2", position: 5, dueAt: "2026-09-28T09:00:00+02:00" }),
    ];
    const s = buildSchedule(list, { dayKey: TODAY, now: at("12:00") });
    const plan = planReplan(s);
    expect(plan.orderedIds).toEqual(["d", "o1", "o2", "p", "q"]);
    expect(plan.clearDueAtIds).toEqual(["o1", "o2"]);
  });

  it("sin vencidas no cambia nada", () => {
    const s = buildSchedule([task({ id: "a", position: 1 })], { dayKey: TODAY, now: at("08:00") });
    expect(planReplan(s)).toEqual({ orderedIds: ["a"], clearDueAtIds: [] });
  });

  it("si todo lo demás está hecho las vencidas van al final", () => {
    const list = [
      task({ id: "d", position: 1, status: "DONE" }),
      task({ id: "o", position: 2, dueAt: "2026-09-30T09:00:00+02:00" }),
    ];
    const s = buildSchedule(list, { dayKey: TODAY, now: at("12:00") });
    expect(planReplan(s).orderedIds).toEqual(["d", "o"]);
  });

  it("tras replanificar (dueAt null) ya no hay vencidas", () => {
    const list = [
      task({ id: "o", position: 1, dueAt: "2026-09-30T09:00:00+02:00" }),
      task({ id: "p", position: 2 }),
    ];
    const s = buildSchedule(list, { dayKey: TODAY, now: at("12:00") });
    const plan = planReplan(s);
    const replanned = plan.orderedIds.map((id, i) => ({
      ...(list.find((t) => t.id === id) as TimelineTask),
      position: i,
      dueAt: plan.clearDueAtIds.includes(id) ? null : list.find((t) => t.id === id)?.dueAt,
    }));
    const again = buildSchedule(replanned, { dayKey: TODAY, now: at("12:00") });
    expect(again.entries.some((e) => e.overdue)).toBe(false);
    expect(again.entries[0]?.startMin).toBe(12 * 60);
  });
});

describe("hora de los formularios", () => {
  it("dueAtToTimeInput devuelve HH:mm local", () => {
    expect(dueAtToTimeInput("2026-09-30T08:05:00Z")).toBe("10:05");
    expect(dueAtToTimeInput(null)).toBe("");
    expect(dueAtToTimeInput(undefined)).toBe("");
  });
  it("timeInputToDueAt genera ISO UTC para el día indicado", () => {
    expect(timeInputToDueAt("2026-09-30", "10:05")).toBe("2026-09-30T08:05:00.000Z");
    expect(timeInputToDueAt("2026-09-30", "")).toBeNull();
    expect(timeInputToDueAt("2026-09-30", "xx")).toBeNull();
  });
});
