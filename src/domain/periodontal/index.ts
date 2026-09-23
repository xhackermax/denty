export const PERIODONTAL_SITES = ["MV", "V", "DV", "MP", "P/L", "DP"] as const;
export type PeriodontalSite = (typeof PERIODONTAL_SITES)[number];

const SITE_ALIASES: Readonly<Record<string, PeriodontalSite>> = {
  MV: "MV",
  V: "V",
  B: "V",
  DV: "DV",
  MP: "MP",
  ML: "MP",
  "P/L": "P/L",
  P: "P/L",
  L: "P/L",
  LP: "P/L",
  DP: "DP",
  DL: "DP",
};

export interface PeriodontalReading {
  tooth: string;
  site: PeriodontalSite;
  probingDepth: number;
  recession: number;
  bleeding?: boolean;
  plaque?: boolean;
  suppuration?: boolean;
  mobility?: number;
  furcation?: number;
}

export type PeriodontalStage = "I" | "II" | "III" | "IV";
export type PeriodontalGrade = "A" | "B" | "C";
export type PeriodontalExtent = "LOCALIZED" | "GENERALIZED" | "MOLAR_INCISOR";

export interface PeriodontalClassification {
  stage: PeriodontalStage;
  grade: PeriodontalGrade;
  extent: PeriodontalExtent;
}

export interface PeriodontalSummary {
  siteCount: number;
  bleedingPct: number;
  plaquePct: number;
  sitesAtLeast4: number;
  sitesAtLeast5: number;
  sitesAtLeast6: number;
  sitesAtLeast7: number;
  maxPD: number;
  maxCAL: number;
}

export interface PeriodontalSiteCell extends PeriodontalReading {
  clinicalAttachmentLoss: number;
}

export interface PeriodontalToothChart {
  tooth: string;
  sites: Partial<Record<PeriodontalSite, PeriodontalSiteCell>>;
  mobility?: number;
  furcation?: number;
}

export interface PeriodontalChart {
  teeth: Record<string, PeriodontalToothChart>;
  summary: PeriodontalSummary;
}

export type PeriodontalRisk =
  "normal" | "watch" | "moderate_periodontitis" | "advanced_periodontitis";

export function normalizePeriodontalSite(site: string): PeriodontalSite {
  const normalized = SITE_ALIASES[site.trim().toUpperCase()];
  if (!normalized) throw new RangeError(`Sitio periodontal no válido: ${site}`);
  return normalized;
}

export function validatePeriodontalReading(reading: PeriodontalReading): void {
  if (
    !Number.isInteger(reading.probingDepth) ||
    reading.probingDepth < 0 ||
    reading.probingDepth > 15
  ) {
    throw new RangeError("La profundidad de sondaje debe estar entre 0 y 15 mm");
  }
  if (!Number.isInteger(reading.recession) || reading.recession < -5 || reading.recession > 15) {
    throw new RangeError("La recesión debe estar entre -5 y 15 mm");
  }
  if (
    reading.mobility !== undefined &&
    (!Number.isInteger(reading.mobility) || reading.mobility < 0 || reading.mobility > 3)
  ) {
    throw new RangeError("La movilidad debe estar entre 0 y 3");
  }
  if (
    reading.furcation !== undefined &&
    (!Number.isInteger(reading.furcation) || reading.furcation < 0 || reading.furcation > 3)
  ) {
    throw new RangeError("La furca debe estar entre 0 y 3");
  }
}

export function summarizePeriodontal(readings: readonly PeriodontalReading[]): PeriodontalSummary {
  for (const reading of readings) validatePeriodontalReading(reading);

  if (!readings.length) {
    return {
      siteCount: 0,
      bleedingPct: 0,
      plaquePct: 0,
      sitesAtLeast4: 0,
      sitesAtLeast5: 0,
      sitesAtLeast6: 0,
      sitesAtLeast7: 0,
      maxPD: 0,
      maxCAL: 0,
    };
  }

  const countAtLeast = (depth: number) =>
    readings.filter((reading) => reading.probingDepth >= depth).length;
  const percentage = (count: number) => Math.round((count / readings.length) * 10_000) / 100;

  return {
    siteCount: readings.length,
    bleedingPct: percentage(readings.filter((reading) => reading.bleeding).length),
    plaquePct: percentage(readings.filter((reading) => reading.plaque).length),
    sitesAtLeast4: countAtLeast(4),
    sitesAtLeast5: countAtLeast(5),
    sitesAtLeast6: countAtLeast(6),
    sitesAtLeast7: countAtLeast(7),
    maxPD: Math.max(...readings.map((reading) => reading.probingDepth)),
    maxCAL: Math.max(...readings.map((reading) => reading.probingDepth + reading.recession)),
  };
}

export function buildPeriodontalChart(readings: readonly PeriodontalReading[]): PeriodontalChart {
  const teeth: Record<string, PeriodontalToothChart> = {};

  for (const reading of readings) {
    validatePeriodontalReading(reading);
    const site = normalizePeriodontalSite(reading.site);
    const toothChart = teeth[reading.tooth] ?? { tooth: reading.tooth, sites: {} };
    toothChart.sites[site] = {
      ...reading,
      site,
      clinicalAttachmentLoss: reading.probingDepth + reading.recession,
    };
    if (reading.mobility !== undefined) toothChart.mobility = reading.mobility;
    if (reading.furcation !== undefined) toothChart.furcation = reading.furcation;
    teeth[reading.tooth] = toothChart;
  }

  return { teeth, summary: summarizePeriodontal(readings) };
}

export function periodontalRiskForSummary(summary: PeriodontalSummary): PeriodontalRisk {
  if (summary.maxPD >= 7 || summary.maxCAL >= 8 || summary.sitesAtLeast7 > 0) {
    return "advanced_periodontitis";
  }
  if (summary.maxPD >= 6 || summary.maxCAL >= 6 || summary.sitesAtLeast6 > 0) {
    return "moderate_periodontitis";
  }
  if (summary.maxPD >= 4 || summary.bleedingPct >= 10 || summary.plaquePct >= 20) {
    return "watch";
  }
  return "normal";
}
