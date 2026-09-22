import { describe, expect, it } from "vitest";
import {
  normalizePeriodontalSite,
  summarizePeriodontal,
  validatePeriodontalReading,
} from "../periodontal";

describe("periodontal domain", () => {
  it("normaliza los alias legacy a los seis sitios canónicos", () => {
    expect(normalizePeriodontalSite("mv")).toBe("MV");
    expect(normalizePeriodontalSite("ml")).toBe("MP");
    expect(normalizePeriodontalSite("lp")).toBe("P/L");
    expect(normalizePeriodontalSite("dl")).toBe("DP");
    expect(normalizePeriodontalSite("B")).toBe("V");
  });

  it("resume BOP, placa, umbrales, maxPD y maxCAL", () => {
    const summary = summarizePeriodontal([
      { tooth: "11", site: "MV", probingDepth: 3, recession: 0, bleeding: true, plaque: true },
      { tooth: "11", site: "V", probingDepth: 4, recession: 1, bleeding: false, plaque: true },
      { tooth: "11", site: "DV", probingDepth: 5, recession: 2, bleeding: true, plaque: false },
      { tooth: "11", site: "MP", probingDepth: 6, recession: 0, bleeding: false, plaque: false },
      { tooth: "11", site: "P/L", probingDepth: 7, recession: 3, bleeding: false, plaque: false },
      { tooth: "11", site: "DP", probingDepth: 2, recession: -1, bleeding: false, plaque: false },
    ]);
    expect(summary.siteCount).toBe(6);
    expect(summary.bleedingPct).toBeCloseTo(33.33, 2);
    expect(summary.plaquePct).toBeCloseTo(33.33, 2);
    expect(summary.sitesAtLeast4).toBe(4);
    expect(summary.sitesAtLeast5).toBe(3);
    expect(summary.sitesAtLeast6).toBe(2);
    expect(summary.sitesAtLeast7).toBe(1);
    expect(summary.maxPD).toBe(7);
    expect(summary.maxCAL).toBe(10);
  });

  it("valida los rangos clínicos de entrada", () => {
    expect(() =>
      validatePeriodontalReading({
        tooth: "16",
        site: "MV",
        probingDepth: 16,
        recession: 0,
      }),
    ).toThrow(/0 y 15/);
    expect(() =>
      validatePeriodontalReading({
        tooth: "16",
        site: "MV",
        probingDepth: 4,
        recession: 0,
        mobility: 4,
      }),
    ).toThrow(/movilidad/);
  });

});
