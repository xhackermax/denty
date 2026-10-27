import { groupByClinicalPhase, type ClinicalPhaseGroupKey } from "./clinical-phase-groups.ts";
import { treatmentFamily, type TreatmentFamily } from "./treatment-plan-document.ts";

export interface AppointmentRange {
  minAppointments: number;
  maxAppointments: number;
}

/** Chair time in minutes; null when some treatment in the group has no duration recorded. */
export interface ChairMinutes {
  minMinutes: number;
  maxMinutes: number;
}

export interface ClinicalPhaseAppointments extends AppointmentRange {
  key: ClinicalPhaseGroupKey;
  label: string;
  chairMinutes: ChairMinutes | null;
}

export interface PlanAppointmentEstimate {
  stages: ClinicalPhaseAppointments[];
  total: AppointmentRange;
  chairMinutes: ChairMinutes | null;
}

/** Recorded times for a treatment: a doctor's own, or the clinic catalog's. Null = not set. */
export interface TreatmentTimeSource {
  durationMin?: number | null | undefined;
  appointmentsMin?: number | null | undefined;
  appointmentsMax?: number | null | undefined;
}

export interface ResolvedTreatmentTimes extends AppointmentRange {
  durationMin: number | null;
}

interface EstimableItem {
  treatmentCode: string;
  label: string;
}

const APPOINTMENT_RANGES: Record<TreatmentFamily, AppointmentRange> = {
  extraction: { minAppointments: 1, maxAppointments: 2 },
  root_canal: { minAppointments: 1, maxAppointments: 2 },
  periodontal: { minAppointments: 2, maxAppointments: 4 },
  filling: { minAppointments: 1, maxAppointments: 1 },
  hygiene: { minAppointments: 1, maxAppointments: 1 },
  splint: { minAppointments: 2, maxAppointments: 2 },
  orthodontics: { minAppointments: 8, maxAppointments: 24 },
  bone_graft: { minAppointments: 2, maxAppointments: 3 },
  implant: { minAppointments: 3, maxAppointments: 5 },
  whitening: { minAppointments: 1, maxAppointments: 3 },
  post: { minAppointments: 1, maxAppointments: 1 },
  crown: { minAppointments: 2, maxAppointments: 3 },
  veneer: { minAppointments: 2, maxAppointments: 3 },
  bridge: { minAppointments: 2, maxAppointments: 3 },
  removable: { minAppointments: 4, maxAppointments: 5 },
  other: { minAppointments: 1, maxAppointments: 1 },
};

/** Orientative clinical visits for one treatment line, by treatment family. */
export function appointmentRange(item: { treatmentCode: string; label: string }): AppointmentRange {
  return APPOINTMENT_RANGES[treatmentFamily(item)];
}

export function sumAppointmentRanges(ranges: readonly AppointmentRange[]): AppointmentRange {
  return ranges.reduce(
    (total, range) => ({
      minAppointments: total.minAppointments + range.minAppointments,
      maxAppointments: total.maxAppointments + range.maxAppointments,
    }),
    { minAppointments: 0, maxAppointments: 0 },
  );
}

function firstSet(
  sources: ReadonlyArray<TreatmentTimeSource | null | undefined>,
  field: keyof TreatmentTimeSource,
): number | null {
  for (const source of sources) {
    const value = source?.[field];
    if (typeof value === "number" && value > 0) return value;
  }
  return null;
}

/**
 * Each value comes from the first source that records it, in the order given (the doctor's,
 * then the catalog's); visits fall back to the default for the treatment family.
 */
export function resolveTreatmentTimes(
  item: EstimableItem,
  sources: ReadonlyArray<TreatmentTimeSource | null | undefined> = [],
): ResolvedTreatmentTimes {
  const fallback = appointmentRange(item);
  const recordedMin = firstSet(sources, "appointmentsMin");
  const recordedMax = firstSet(sources, "appointmentsMax");
  const minAppointments =
    recordedMin ?? Math.min(fallback.minAppointments, recordedMax ?? Infinity);
  const maxAppointments = Math.max(recordedMax ?? fallback.maxAppointments, minAppointments);
  return { minAppointments, maxAppointments, durationMin: firstSet(sources, "durationMin") };
}

function chairMinutes(times: readonly ResolvedTreatmentTimes[]): ChairMinutes | null {
  if (!times.length || times.some((time) => time.durationMin === null)) return null;
  return times.reduce(
    (total, time) => ({
      minMinutes: total.minMinutes + (time.durationMin ?? 0) * time.minAppointments,
      maxMinutes: total.maxMinutes + (time.durationMin ?? 0) * time.maxAppointments,
    }),
    { minMinutes: 0, maxMinutes: 0 },
  );
}

/**
 * Visits per clinical stage, in the same phases the plan folds its treatments into, so the
 * patient reads time next to the steps that take it. Stages are added up as if done one after
 * another: it does not schedule, overlap visits or count maintenance reviews.
 */
export function estimatePlanAppointments<T extends EstimableItem>(
  items: readonly T[],
  sourcesFor: (item: T) => ReadonlyArray<TreatmentTimeSource | null | undefined> = () => [],
): PlanAppointmentEstimate {
  const resolved: ResolvedTreatmentTimes[] = [];
  const stages = groupByClinicalPhase(items).map((group) => {
    const times = group.items.map((item) => resolveTreatmentTimes(item, sourcesFor(item)));
    resolved.push(...times);
    return {
      key: group.key,
      label: group.label,
      ...sumAppointmentRanges(times),
      chairMinutes: chairMinutes(times),
    };
  });
  return { stages, total: sumAppointmentRanges(stages), chairMinutes: chairMinutes(resolved) };
}

function hoursText(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1).replace(".", ",");
}

/** "≈ 2–3 h en el sillón" or "≈ 45 min en el sillón". */
export function chairTimeLabel({ minMinutes, maxMinutes }: ChairMinutes): string {
  if (maxMinutes < 60)
    return minMinutes === maxMinutes
      ? `${minMinutes} min en el sillón`
      : `${minMinutes}–${maxMinutes} min en el sillón`;
  const low = hoursText(minMinutes);
  const high = hoursText(maxMinutes);
  return low === high ? `${low} h en el sillón` : `${low}–${high} h en el sillón`;
}

export function appointmentRangeLabel({
  minAppointments,
  maxAppointments,
}: AppointmentRange): string {
  return minAppointments === maxAppointments
    ? `${minAppointments} ${minAppointments === 1 ? "cita" : "citas"}`
    : `${minAppointments}–${maxAppointments} citas`;
}
