import { teethForChart, type MouthState } from "../odontogram/mouth-state";
import { PERIODONTAL_SITES, normalizePeriodontalSite, type PeriodontalReading } from "./index";
export interface PerioSite {
  pd: number | null;
  gm: number | null;
  bop: boolean;
  plaque: boolean;
  suppuration: boolean;
}
export interface PerioTooth {
  missing: boolean;
  implant: boolean;
  mobility: number | null;
  furcation: Partial<Record<"b" | "l" | "m" | "d", number>>;
  sites: Record<"MV" | "V" | "DV" | "MP" | "P/L" | "DP", PerioSite>;
}
export interface PerioExam {
  teeth: Record<string, PerioTooth>;
}
export function createPerioExam(
  mouth: MouthState,
  readings: readonly Partial<PeriodontalReading>[] = [],
): PerioExam {
  const teeth: PerioExam["teeth"] = Object.fromEntries(
    teethForChart(mouth, "perio").map((tooth) => [
      tooth,
      {
        missing: !["present", "deciduous", "extracted_planned", "implant"].includes(
          mouth.teeth[tooth]!.presence,
        ),
        implant: mouth.teeth[tooth]!.presence === "implant",
        mobility: null,
        furcation: {},
        sites: Object.fromEntries(
          PERIODONTAL_SITES.map((site) => [
            site,
            { pd: null, gm: null, bop: false, plaque: false, suppuration: false },
          ]),
        ) as PerioTooth["sites"],
      },
    ]),
  );
  for (const reading of readings) {
    if (!reading.tooth || !reading.site || !teeth[reading.tooth]) continue;
    const tooth = teeth[reading.tooth]!;
    const site = normalizePeriodontalSite(reading.site);
    tooth.sites[site] = {
      pd: reading.probingDepth ?? null,
      gm: reading.recession === undefined ? null : -reading.recession,
      bop: reading.bleeding ?? false,
      plaque: reading.plaque ?? false,
      suppuration: reading.suppuration ?? false,
    };
    tooth.mobility = reading.mobility ?? tooth.mobility;
    if (reading.furcation !== undefined) tooth.furcation.b = reading.furcation;
  }
  return { teeth };
}
export function reconcileExamMouth(exam: PerioExam, mouth: MouthState): PerioExam {
  const defaults = createPerioExam(mouth);
  return {
    teeth: Object.fromEntries(
      [...new Set([...Object.keys(exam.teeth), ...Object.keys(defaults.teeth)])].map((tooth) => {
        const data = exam.teeth[tooth] ?? defaults.teeth[tooth]!;
        const presence = mouth.teeth[tooth]?.presence;
        return [
          tooth,
          {
            ...data,
            missing: !["present", "deciduous", "extracted_planned", "implant"].includes(
              presence ?? "missing",
            ),
            implant: presence === "implant",
          },
        ];
      }),
    ),
  };
}
export function examToReadings(
  exam: PerioExam,
  options: { requireMargin?: boolean } = {},
): PeriodontalReading[] {
  return Object.entries(exam.teeth).flatMap(([tooth, data]) =>
    data.missing
      ? []
      : PERIODONTAL_SITES.flatMap((site) => {
          const r = data.sites[site];
          if (r.pd === null || (options.requireMargin && r.gm === null)) return [];
          return [
            {
              tooth,
              site,
              probingDepth: r.pd,
              recession: -(r.gm ?? 0),
              bleeding: r.bop,
              plaque: r.plaque,
              suppuration: r.suppuration,
              ...(data.mobility === null ? {} : { mobility: data.mobility }),
              ...(Object.keys(data.furcation).length
                ? { furcation: Math.max(...Object.values(data.furcation)) }
                : {}),
            },
          ];
        }),
  );
}
/**
 * Main-odontogram overlay only: includes sites with BOP or suppuration even
 * when PD/GM has not yet been measured. Does not change the finalized exam
 * payload (examToSites), where the existing clinical validation still applies.
 */
export function examToVisualReadings(exam: PerioExam): Partial<PeriodontalReading>[] {
  return Object.entries(exam.teeth).flatMap(([tooth, data]) =>
    data.missing
      ? []
      : PERIODONTAL_SITES.flatMap((site) => {
          const r = data.sites[site];
          if (r.pd === null && r.gm === null && !r.bop && !r.suppuration && !r.plaque)
            return [];
          return [{
            tooth,
            site,
            ...(r.pd === null ? {} : { probingDepth: r.pd }),
            ...(r.gm === null ? {} : { recession: -r.gm }),
            bleeding: r.bop,
            suppuration: r.suppuration,
            plaque: r.plaque,
          }];
        }),
  );
}

export function examToSites(exam: PerioExam) {
  return examToReadings(exam).map((reading) => {
    const { recession, ...rest } = reading;
    return exam.teeth[reading.tooth]!.sites[reading.site].gm === null
      ? rest
      : { ...rest, recession };
  });
}
export function perioSummary(exam: PerioExam) {
  const readings = examToReadings(exam);
  const cal = examToReadings(exam, { requireMargin: true });
  const percent = (n: number) =>
    readings.length ? Math.round((n / readings.length) * 10000) / 100 : 0;
  const mean = (values: readonly number[]) =>
    values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : 0;
  return {
    siteCount: readings.length,
    meanPD: mean(readings.map((r) => r.probingDepth)),
    meanCAL: mean(cal.map((r) => Math.max(0, r.probingDepth + r.recession))),
    calSiteCount: cal.length,
    bleedingPct: percent(readings.filter((r) => r.bleeding).length),
    plaquePct: percent(readings.filter((r) => r.plaque).length),
    sitesAtLeast4: readings.filter((r) => r.probingDepth >= 4).length,
    sitesAtLeast5: readings.filter((r) => r.probingDepth >= 5).length,
    sitesAtLeast6: readings.filter((r) => r.probingDepth >= 6).length,
    quadrants: [
      ...new Set(readings.filter((r) => r.probingDepth >= 4).map((r) => Number(r.tooth[0]))),
    ].sort(),
    remainingSites:
      Object.values(exam.teeth).filter((t) => !t.missing).length * 6 - readings.length,
  };
}
