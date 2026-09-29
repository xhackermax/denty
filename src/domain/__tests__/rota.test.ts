import { describe, expect, it } from "vitest";

import { describeRota, findRotaOverlap, staffForSiteDay, weekdayOfDate } from "../agenda";

const NAVARRA = "site-navarra";
const CARINENA = "site-carinena";

// Max: Monday and Wednesday at Av. Navarra, Thursday at Cariñena.
const max = {
  id: "max",
  schedules: [
    { siteId: NAVARRA, weekday: 1, startsAt: "09:00", endsAt: "14:00" },
    { siteId: NAVARRA, weekday: 3, startsAt: "09:00", endsAt: "14:00" },
    { siteId: CARINENA, weekday: 4, startsAt: "10:00", endsAt: "18:00" },
  ],
};
// Isaac: Monday morning at Cariñena, Monday afternoon at Av. Navarra.
const isaac = {
  id: "isaac",
  schedules: [
    { siteId: CARINENA, weekday: 1, startsAt: "09:00", endsAt: "13:00" },
    { siteId: NAVARRA, weekday: 1, startsAt: "16:00", endsAt: "20:00" },
  ],
};
const reception = { id: "reception", schedules: [] };

describe("rota por sedes", () => {
  it("calcula el día de la semana de una fecha", () => {
    expect(weekdayOfDate("2026-09-28")).toBe(1); // lunes
    expect(weekdayOfDate("2026-10-04")).toBe(0); // domingo
  });

  it("cada sede muestra los doctores que trabajan allí ese día", () => {
    const monday = "2026-09-28";
    const thursday = "2026-10-01";
    const ids = (list: { id: string }[]) => list.map((member) => member.id);
    expect(ids(staffForSiteDay([max, isaac], NAVARRA, monday))).toEqual(["max", "isaac"]);
    expect(ids(staffForSiteDay([max, isaac], CARINENA, monday))).toEqual(["isaac"]);
    expect(ids(staffForSiteDay([max, isaac], CARINENA, thursday))).toEqual(["max"]);
    expect(ids(staffForSiteDay([max, isaac], NAVARRA, thursday))).toEqual([]);
  });

  it("no oculta a quien ya tiene citas ni a quien aún no tiene horario", () => {
    const thursday = "2026-10-01";
    expect(
      staffForSiteDay([max, isaac, reception], NAVARRA, thursday, new Set(["isaac"])).map(
        (member) => member.id,
      ),
    ).toEqual(["isaac", "reception"]);
  });

  it("sin sede elegida se ven todos", () => {
    expect(staffForSiteDay([max, isaac], null, "2026-10-01")).toHaveLength(2);
  });

  it("detecta turnos solapados aunque sean en sedes distintas", () => {
    expect(findRotaOverlap(isaac.schedules)).toBeNull();
    expect(
      findRotaOverlap([
        { siteId: NAVARRA, weekday: 2, startsAt: "09:00", endsAt: "14:00" },
        { siteId: CARINENA, weekday: 2, startsAt: "13:00", endsAt: "18:00" },
      ]),
    ).not.toBeNull();
  });

  it("resume el horario por sede", () => {
    const names = new Map([
      [NAVARRA, "Av. Navarra"],
      [CARINENA, "Cariñena"],
    ]);
    expect(describeRota(max.schedules, names)).toBe("L, X · Av. Navarra — J · Cariñena");
    expect(describeRota([], names)).toMatch(/Sin horario/);
  });
});
