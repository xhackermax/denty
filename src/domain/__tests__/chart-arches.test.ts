import { describe, expect, it } from "vitest";

import {
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  TEMPORARY_LOWER,
  TEMPORARY_UPPER,
  type DentalEntity,
} from "../odontogram";
import { chartArches, deriveMouthState } from "../odontogram/mouth-state";

const TODAY = "2026-10-04";
const arches = (birthDate: string | undefined, entities: DentalEntity[] = []) =>
  chartArches(deriveMouthState(entities, { ...(birthDate ? { birthDate } : {}), today: TODAY }));
const isPrimary = (tooth: string) => Number(tooth[0]) >= 5;

describe("chartArches", () => {
  it("shows a young child only primary teeth", () => {
    const { upper, lower } = arches("2022-03-01"); // 4 years old
    expect(upper).toEqual([...TEMPORARY_UPPER]);
    expect(lower).toEqual([...TEMPORARY_LOWER]);
  });

  it("shows an adult only permanent teeth, also when no birth date is known", () => {
    for (const birthDate of ["1985-04-12", undefined]) {
      const { upper, lower } = arches(birthDate);
      expect(upper).toEqual([...PERMANENT_UPPER]);
      expect(lower).toEqual([...PERMANENT_LOWER]);
    }
  });

  it("keeps the adult chart permanent even if a primary tooth was recorded", () => {
    const retained: DentalEntity = {
      id: "p",
      tooth: "55",
      entityType: "PEDIATRIC",
      status: "retained",
      active: true,
    };
    expect([...arches("1985-04-12", [retained]).upper].some(isPrimary)).toBe(false);
  });

  it("shows a mixed dentition one tooth per position, primary where it is still in place", () => {
    const { upper, lower } = arches("2018-01-15"); // 8 years old
    expect(upper).toEqual(["16", "55", "54", "53", "12", "11", "21", "22", "63", "64", "65", "26"]);
    expect(lower).toEqual(["46", "85", "84", "83", "42", "41", "31", "32", "73", "74", "75", "36"]);
  });

  it("lets the successor take the position once the primary tooth is lost", () => {
    const exfoliated: DentalEntity = {
      id: "x",
      tooth: "53",
      entityType: "PEDIATRIC",
      status: "exfoliated",
      active: true,
    };
    const { upper } = arches("2018-01-15", [exfoliated]);
    expect(upper).toContain("13");
    expect(upper).not.toContain("53");
  });
});
