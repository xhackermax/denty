import { describe, expect, it } from "vitest";

import {
  buildPeriodontalChart,
  normalizePeriodontalSite,
  periodontalRiskForSummary,
  summarizePeriodontal,
  validatePeriodontalReading,
} from "../periodontal";

describe("periodontal domain", () => {
  it("normaliza los alias legacy a los seis sitios canonicos", () => {
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

  it("valida los rangos clinicos de entrada", () => {
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

  it("construye una matriz periodontal por diente y sitio con CAL", () => {
    const chart = buildPeriodontalChart([
      {
        tooth: "16",
        site: "MV",
        probingDepth: 6,
        recession: 2,
        bleeding: true,
        plaque: true,
        suppuration: true,
      },
      { tooth: "16", site: "P/L", probingDepth: 4, recession: 1, mobility: 2, furcation: 1 },
    ]);

    expect(chart.teeth["16"]?.sites.MV).toMatchObject({
      probingDepth: 6,
      recession: 2,
      clinicalAttachmentLoss: 8,
      bleeding: true,
      plaque: true,
      suppuration: true,
    });
    expect(chart.teeth["16"]?.mobility).toBe(2);
    expect(chart.teeth["16"]?.furcation).toBe(1);
  });

  it("clasifica el riesgo periodontal desde el resumen", () => {
    expect(
      periodontalRiskForSummary({
        siteCount: 0,
        bleedingPct: 0,
        plaquePct: 0,
        sitesAtLeast4: 0,
        sitesAtLeast5: 0,
        sitesAtLeast6: 0,
        sitesAtLeast7: 0,
        maxPD: 0,
        maxCAL: 0,
      }),
    ).toBe("normal");
    expect(
      periodontalRiskForSummary({
        siteCount: 10,
        bleedingPct: 15,
        plaquePct: 20,
        sitesAtLeast4: 2,
        sitesAtLeast5: 0,
        sitesAtLeast6: 0,
        sitesAtLeast7: 0,
        maxPD: 4,
        maxCAL: 4,
      }),
    ).toBe("watch");
    expect(
      periodontalRiskForSummary({
        siteCount: 10,
        bleedingPct: 35,
        plaquePct: 45,
        sitesAtLeast4: 5,
        sitesAtLeast5: 3,
        sitesAtLeast6: 1,
        sitesAtLeast7: 0,
        maxPD: 6,
        maxCAL: 6,
      }),
    ).toBe("moderate_periodontitis");
    expect(
      periodontalRiskForSummary({
        siteCount: 10,
        bleedingPct: 60,
        plaquePct: 70,
        sitesAtLeast4: 7,
        sitesAtLeast5: 5,
        sitesAtLeast6: 3,
        sitesAtLeast7: 1,
        maxPD: 8,
        maxCAL: 9,
      }),
    ).toBe("advanced_periodontitis");
  });
});
