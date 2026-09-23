import { describe, expect, it } from "vitest";
import {
  addMinutes,
  epochMillis,
  hhmm,
  overlaps,
  startOfDayMadrid,
  todayMadrid,
  toMadridISO,
} from "../dates";

describe("dates Europe/Madrid", () => {
  it("no cae en el día UTC anterior a las 00:30 de Madrid", () => {
    expect(todayMadrid("2026-09-20T22:30:00Z")).toBe("2026-09-21");
    expect(hhmm("2026-09-20T22:30:00Z")).toBe("00:30");
  });

  it("respeta el salto DST del 29-03-2026", () => {
    expect(toMadridISO("2026-03-29T00:30:00Z")).toBe("2026-03-29T01:30:00+01:00");
    expect(toMadridISO("2026-03-29T01:30:00Z")).toBe("2026-03-29T03:30:00+02:00");
  });

  it("distingue las dos 02:30 del cambio DST del 25-10-2026", () => {
    expect(toMadridISO("2026-10-25T00:30:00Z")).toBe("2026-10-25T02:30:00+02:00");
    expect(toMadridISO("2026-10-25T01:30:00Z")).toBe("2026-10-25T02:30:00+01:00");
  });

  it("calcula inicio del día y suma minutos en Madrid", () => {
    expect(toMadridISO(startOfDayMadrid("2026-09-21T15:00:00Z"))).toBe("2026-09-21T00:00:00+02:00");
    expect(toMadridISO(addMinutes("2026-09-21T08:00:00+02:00", 45))).toBe(
      "2026-09-21T08:45:00+02:00",
    );
  });

  it("centraliza epoch y rechaza fechas inválidas", () => {
    expect(epochMillis("2026-09-21T08:00:00+02:00")).toBe(1789970400000);
    expect(() => epochMillis("not-a-date")).toThrow(/Fecha no válida/);
  });

  it("detecta solapes sin considerar adyacencias como conflicto", () => {
    expect(
      overlaps(
        { startsAt: "2026-09-21T08:00:00+02:00", endsAt: "2026-09-21T08:30:00+02:00" },
        { startsAt: "2026-09-21T08:29:00+02:00", endsAt: "2026-09-21T09:00:00+02:00" },
      ),
    ).toBe(true);
    expect(
      overlaps(
        { startsAt: "2026-09-21T08:00:00+02:00", endsAt: "2026-09-21T08:30:00+02:00" },
        { startsAt: "2026-09-21T08:30:00+02:00", endsAt: "2026-09-21T09:00:00+02:00" },
      ),
    ).toBe(false);
  });
});
