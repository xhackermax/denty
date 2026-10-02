import { describe, expect, it } from "vitest";

import type { TimelineTask } from "../task-types";
import {
  buildDayMarkers,
  buildSchedule,
  dayPatchFor,
  dayShortcuts,
  undoDayPatch,
  describeDay,
  inboxTasks,
  resolveTaskSchedule,
  taskDay,
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
    scheduledOn: over.dueAt ? null : "2026-09-30",
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
    const s = buildSchedule([task({ position: 1, scheduledOn: "2026-10-01" })], {
      dayKey: "2026-10-01",
      now: at("10:12"),
    });
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

  it("presenta las tareas con hora fija en orden cronológico, no por orden de creación", () => {
    const s = buildSchedule(
      [
        task({ id: "mediodia", position: 1, dueAt: "2026-09-30T12:00:00+02:00" }),
        task({ id: "manana", position: 2, dueAt: "2026-09-30T09:30:00+02:00" }),
        task({ id: "media-manana", position: 3, dueAt: "2026-09-30T10:45:00+02:00" }),
      ],
      { dayKey: TODAY, now: at("08:00") },
    );

    expect(s.entries.map((entry) => entry.task.id)).toEqual(["manana", "media-manana", "mediodia"]);
    expect(s.rows.filter((row) => row.kind === "task").map((row) => row.key)).toEqual([
      "manana",
      "media-manana",
      "mediodia",
    ]);
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
    expect(plan.moves).toEqual([
      { id: "o1", scheduledOn: TODAY, clearDueAt: true },
      { id: "o2", scheduledOn: TODAY, clearDueAt: true },
    ]);
  });

  it("sin vencidas no cambia nada", () => {
    const s = buildSchedule([task({ id: "a", position: 1 })], { dayKey: TODAY, now: at("08:00") });
    expect(planReplan(s)).toEqual({ orderedIds: ["a"], moves: [] });
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
      ...(plan.moves.some((m) => m.id === id) ? { dueAt: null, scheduledOn: TODAY } : {}),
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

describe("taskDay", () => {
  it("scheduledOn manda sobre dueAt", () => {
    expect(taskDay(task({ scheduledOn: "2026-10-02", dueAt: "2026-09-30T10:00:00+02:00" }))).toBe(
      "2026-10-02",
    );
  });
  it("sin scheduledOn usa la fecha de dueAt en Madrid", () => {
    expect(taskDay(task({ dueAt: "2026-09-30T22:30:00Z" }))).toBe("2026-10-01");
    expect(taskDay(task({ dueAt: "2026-10-25T23:30:00Z" }))).toBe("2026-10-26");
  });
  it("sin nada es null (Bandeja); dueAt inválido también", () => {
    expect(taskDay(task({ scheduledOn: null, dueAt: null }))).toBeNull();
    expect(taskDay(task({ scheduledOn: undefined, dueAt: undefined }))).toBeNull();
    expect(taskDay(task({ scheduledOn: null, dueAt: "basura" }))).toBeNull();
  });
});

describe("buildSchedule por día programado", () => {
  const opts = (dayKey: string, now = at("08:00")) => ({ dayKey, now });

  it("solo muestra las tareas de ese día", () => {
    const list = [
      task({ id: "hoy", position: 1 }),
      task({ id: "jue", position: 2, scheduledOn: "2026-10-01" }),
      task({ id: "bandeja", position: 3, scheduledOn: null }),
    ];
    expect(buildSchedule(list, opts(TODAY)).entries.map((e) => e.task.id)).toEqual(["hoy"]);
    expect(buildSchedule(list, opts("2026-10-01")).entries.map((e) => e.task.id)).toEqual(["jue"]);
    expect(buildSchedule(list, opts("2026-10-02")).entries).toEqual([]);
  });

  it("la Bandeja no aparece en ningún día", () => {
    const list = [task({ position: 1, scheduledOn: null })];
    for (const d of ["2026-09-29", TODAY, "2026-10-01"]) {
      expect(buildSchedule(list, opts(d)).entries).toEqual([]);
    }
  });

  it("scheduledOn sin hora apila en secuencia y no es 'hora fija'", () => {
    const s = buildSchedule([task({ position: 1, scheduledOn: "2026-10-01" })], opts("2026-10-01"));
    expect(s.entries[0]).toMatchObject({ startMin: 540, explicit: false });
  });

  it("dueAt con la misma fecha que scheduledOn es hora fija", () => {
    const t = task({ scheduledOn: "2026-10-01", dueAt: "2026-10-01T12:00:00+02:00", position: 1 });
    const s = buildSchedule([t], opts("2026-10-01"));
    expect(s.entries[0]).toMatchObject({ startMin: 720, explicit: true });
  });

  it("si scheduledOn y dueAt discrepan, gana scheduledOn y la hora no es fija", () => {
    const t = task({ scheduledOn: "2026-10-02", dueAt: "2026-10-01T12:00:00+02:00", position: 1 });
    expect(buildSchedule([t], opts("2026-10-01")).entries).toEqual([]);
    const s = buildSchedule([t], opts("2026-10-02"));
    expect(s.entries[0]).toMatchObject({ startMin: 540, explicit: false });
  });

  it("dueAt sin scheduledOn sigue fijando el día (datos antiguos)", () => {
    const t = task({ dueAt: "2026-10-01T09:30:00+02:00", position: 1 });
    expect(buildSchedule([t], opts("2026-10-01")).entries[0]).toMatchObject({
      startMin: 570,
      explicit: true,
    });
  });

  it("arrastra a hoy las no hechas con scheduledOn anterior, como vencidas", () => {
    const old = task({ id: "o", position: 1, scheduledOn: "2026-09-27" });
    const oldDone = task({ id: "od", position: 2, scheduledOn: "2026-09-27", status: "DONE" });
    const s = buildSchedule([old, oldDone], opts(TODAY));
    expect(s.entries.map((e) => [e.task.id, e.overdue])).toEqual([["o", true]]);
    expect(buildSchedule([old], opts("2026-10-01")).entries).toEqual([]);
  });

  it("al ver un día pasado, sus tareas salen sin vencer", () => {
    const old = task({ id: "o", position: 1, scheduledOn: "2026-09-27" });
    const s = buildSchedule([old], opts("2026-09-27"));
    expect(s.entries.map((e) => [e.task.id, e.overdue])).toEqual([["o", false]]);
  });

  it("una tarea de hoy sin hora no está vencida", () => {
    const s = buildSchedule([task({ position: 1 })], opts(TODAY, at("20:00")));
    expect(s.entries[0]?.overdue).toBe(false);
  });

  it("las archivadas y canceladas no se arrastran", () => {
    const list = [
      task({ scheduledOn: "2026-09-20", archivedAt: "2026-09-21T00:00:00Z" }),
      task({ scheduledOn: "2026-09-20", status: "CANCELLED" }),
    ];
    expect(buildSchedule(list, opts(TODAY)).entries).toEqual([]);
  });

  it("cambio de hora: una tarea el día del cambio a horario de invierno mantiene su hora", () => {
    const t = task({ dueAt: "2026-10-25T10:00:00Z", position: 1 });
    const s = buildSchedule([t], { dayKey: "2026-10-25", now: at("08:00") });
    expect(s.entries[0]).toMatchObject({ startMin: 11 * 60, explicit: true });
    expect(taskDay(t)).toBe("2026-10-25");
  });
});

describe("inboxTasks", () => {
  it("devuelve las tareas sin día ordenadas por position, sin archivadas ni canceladas", () => {
    const list = [
      task({ id: "b", position: 2, scheduledOn: null }),
      task({ id: "a", position: 1, scheduledOn: null }),
      task({ id: "hoy", position: 0 }),
      task({ id: "arch", position: 3, scheduledOn: null, archivedAt: "2026-09-01T00:00:00Z" }),
      task({ id: "can", position: 4, scheduledOn: null, status: "CANCELLED" }),
      task({ id: "due", position: 5, dueAt: "2026-10-01T10:00:00Z" }),
    ];
    expect(inboxTasks(list).map((t) => t.id)).toEqual(["a", "b"]);
  });
  it("lista vacía", () => {
    expect(inboxTasks([])).toEqual([]);
  });
});

describe("buildDayMarkers", () => {
  const days = getWeekDays(TODAY);
  const build = (list: TimelineTask[], now = at("08:00")) => buildDayMarkers(list, days, { now });

  it("días sin tareas tienen marcador vacío", () => {
    const m = build([]);
    expect(m["2026-10-01"]).toMatchObject({ total: 0, done: 0, dots: [], extra: 0 });
    expect(Object.keys(m)).toEqual(days);
  });

  it("cuenta tareas y hechas por día, y la bandeja no cuenta", () => {
    const m = build([
      task({ scheduledOn: "2026-10-01" }),
      task({ scheduledOn: "2026-10-01", status: "DONE" }),
      task({ scheduledOn: "2026-10-01", status: "DONE" }),
      task({ scheduledOn: null }),
    ]);
    expect(m["2026-10-01"]).toMatchObject({ total: 3, done: 2, pending: 1 });
    expect(Object.values(m).reduce((n, x) => n + x.total, 0)).toBe(3);
  });

  it("puntos: pendientes por prioridad primero, hechos atenuados al final", () => {
    const m = build([
      task({ scheduledOn: "2026-10-01", priority: "LOW" }),
      task({ scheduledOn: "2026-10-01", priority: "URGENT", status: "DONE" }),
      task({ scheduledOn: "2026-10-01", priority: "URGENT" }),
    ]);
    expect(m["2026-10-01"]?.dots).toEqual([
      { priority: "URGENT", done: false },
      { priority: "LOW", done: false },
      { priority: "URGENT", done: true },
    ]);
  });

  it("limita a 4 puntos y resume el resto", () => {
    const list = Array.from({ length: 7 }, () => task({ scheduledOn: "2026-10-01" }));
    const marker = build(list)["2026-10-01"];
    expect(marker?.dots).toHaveLength(4);
    expect(marker?.extra).toBe(3);
    expect(marker?.total).toBe(7);
  });

  it("excluye archivadas y canceladas", () => {
    const m = build([
      task({ scheduledOn: "2026-10-01", archivedAt: "2026-09-01T00:00:00Z" }),
      task({ scheduledOn: "2026-10-01", status: "CANCELLED" }),
    ]);
    expect(m["2026-10-01"]?.total).toBe(0);
  });

  it("las vencidas arrastradas cuentan en hoy y lo resaltan", () => {
    const m = build([task({ scheduledOn: "2026-09-28" })]);
    expect(m[TODAY]).toMatchObject({ total: 1, hasOverdue: true });
    expect(m["2026-09-28"]).toMatchObject({ total: 1, hasOverdue: false });
  });

  it("marca conflictos", () => {
    const m = build([
      task({ dueAt: "2026-10-01T10:00:00+02:00", durationMin: 30 }),
      task({ dueAt: "2026-10-01T10:15:00+02:00" }),
    ]);
    expect(m["2026-10-01"]?.hasConflict).toBe(true);
    expect(m[TODAY]?.hasConflict).toBe(false);
  });

  it("usa el día de Madrid para dueAt", () => {
    const m = build([task({ dueAt: "2026-09-30T22:30:00Z" })]);
    expect(m["2026-10-01"]?.total).toBe(1);
    expect(m[TODAY]?.total).toBe(0);
  });
});

describe("dayPatchFor", () => {
  it("tarea sin hora: solo cambia scheduledOn", () => {
    expect(dayPatchFor(task({ scheduledOn: TODAY }), "2026-10-01")).toEqual({
      scheduledOn: "2026-10-01",
    });
  });
  it("tarea con hora: conserva la hora en el nuevo día (Madrid)", () => {
    const t = task({ dueAt: "2026-09-30T08:05:00Z" });
    expect(dayPatchFor(t, "2026-10-01")).toEqual({
      scheduledOn: "2026-10-01",
      dueAt: "2026-10-01T08:05:00.000Z",
    });
  });
  it("respeta el cambio de hora al mover la tarea entre semanas de verano e invierno", () => {
    const t = task({ dueAt: "2026-10-24T08:00:00Z" });
    expect(dayPatchFor(t, "2026-10-26")).toEqual({
      scheduledOn: "2026-10-26",
      dueAt: "2026-10-26T09:00:00.000Z",
    });
  });
  it("a la Bandeja: scheduledOn null y se quita la hora", () => {
    expect(dayPatchFor(task({ dueAt: "2026-09-30T08:05:00Z" }), null)).toEqual({
      scheduledOn: null,
      dueAt: null,
    });
    expect(dayPatchFor(task({ scheduledOn: TODAY }), null)).toEqual({ scheduledOn: null });
  });
  it("mover a un día que ya coincide con la hora no la reescribe", () => {
    const t = task({ dueAt: "2026-09-30T08:05:00Z" });
    expect(dayPatchFor(t, TODAY)).toEqual({ scheduledOn: TODAY });
  });
});

describe("resolveTaskSchedule", () => {
  it("día sin hora", () => {
    expect(resolveTaskSchedule("2026-10-01", "")).toEqual({
      scheduledOn: "2026-10-01",
      dueAt: null,
    });
  });
  it("con hora fija su fecha manda y scheduledOn se alinea", () => {
    expect(resolveTaskSchedule("2026-10-01", "10:05")).toEqual({
      scheduledOn: "2026-10-01",
      dueAt: "2026-10-01T08:05:00.000Z",
    });
  });
  it("hora inválida se ignora", () => {
    expect(resolveTaskSchedule("2026-10-01", "xx")).toEqual({
      scheduledOn: "2026-10-01",
      dueAt: null,
    });
  });
  it("sin día (Bandeja) no hay hora ni fecha", () => {
    expect(resolveTaskSchedule(null, "10:05")).toEqual({ scheduledOn: null, dueAt: null });
  });
});

describe("describeDay", () => {
  it("hoy, mañana, ayer y fecha corta", () => {
    expect(describeDay(TODAY, TODAY)).toBe("hoy");
    expect(describeDay("2026-10-01", TODAY)).toBe("mañana");
    expect(describeDay("2026-09-29", TODAY)).toBe("ayer");
    expect(describeDay("2026-10-08", TODAY)).toMatch(/jue.* 8 oct/);
  });
});

describe("undoDayPatch", () => {
  it("restaura scheduledOn y solo toca dueAt si el cambio lo tocó", () => {
    const t = task({ scheduledOn: TODAY });
    expect(undoDayPatch(t, { scheduledOn: "2026-10-01" })).toEqual({ scheduledOn: TODAY });
    const timed = task({ dueAt: "2026-09-30T08:05:00Z" });
    expect(undoDayPatch(timed, { scheduledOn: "2026-10-01", dueAt: "x" })).toEqual({
      scheduledOn: null,
      dueAt: "2026-09-30T08:05:00Z",
    });
  });
});

describe("dayShortcuts", () => {
  it("hoy y mañana siempre; el día visto solo si es otro", () => {
    expect(dayShortcuts(TODAY).map((s) => s.day)).toEqual([TODAY, "2026-10-01"]);
    expect(dayShortcuts(TODAY, TODAY).map((s) => s.key)).toEqual(["today", "tomorrow"]);
    expect(dayShortcuts(TODAY, "2026-10-01")).toHaveLength(2);
    const extra = dayShortcuts(TODAY, "2026-10-03")[2];
    expect(extra).toMatchObject({ key: "selected", day: "2026-10-03" });
    expect(extra?.label).toMatch(/^Día seleccionado · .*3 oct/);
  });
});
