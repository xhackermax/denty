/**
 * Follow-up reviews after implants, orthodontics, endodontics and periodontics:
 * 3, 6 and 12 months after the treatment, then once a year.
 *
 * The database applies the same rules (migration `treatment_review_schedule`);
 * this module is the readable, tested source the SQL is checked against.
 */

export const REVIEW_SPECIALTIES = ["IMPLANT", "ORTHO", "ENDO", "PERIO"] as const;
export type ReviewSpecialty = (typeof REVIEW_SPECIALTIES)[number];

export const REVIEW_STEPS = ["3M", "6M", "12M", "ANNUAL"] as const;
export type ReviewStep = (typeof REVIEW_STEPS)[number];

/** Months after the treatment for the first-year reviews. */
export const FIRST_YEAR_REVIEW_MONTHS = { "3M": 3, "6M": 6, "12M": 12 } as const;

/** Maintenance and review visits must not restart the series they belong to. */
export const PERIO_CODES_WITHOUT_NEW_SERIES = [
  "PERIO_MAINTENANCE",
  "PERIO_REVIEW",
  "SPLINT_REVIEW",
  "ORAL_HYGIENE",
  "HYGIENE",
] as const;

/** Retention marks the end of active orthodontics; adjustment visits are not follow-up anchors. */
export const ORTHO_RETENTION_CODE_PREFIX = "RETENEDOR";

const SPECIALTY_LABELS: Record<ReviewSpecialty, string> = {
  IMPLANT: "implantes",
  ORTHO: "ortodoncia",
  ENDO: "endodoncia",
  PERIO: "periodoncia",
};

const STEP_LABELS: Record<ReviewStep, string> = {
  "3M": "3 meses",
  "6M": "6 meses",
  "12M": "1 año",
  ANNUAL: "anual",
};

export interface ExecutedTreatment {
  treatmentCode: string | null;
  treatmentCategory: string | null;
}

/**
 * Implants are not mapped here: their series starts from the recorded
 * placement (`implant_placement_outcomes`), which excludes failed attempts.
 */
export function reviewSpecialtyForExecution(execution: ExecutedTreatment): ReviewSpecialty | null {
  const category = (execution.treatmentCategory ?? "").trim().toUpperCase();
  const code = (execution.treatmentCode ?? "").trim().toUpperCase();
  if (category === "ENDODONTICS") return "ENDO";
  if (category === "ORTHODONTICS" && code.startsWith(ORTHO_RETENTION_CODE_PREFIX)) return "ORTHO";
  if (
    category === "PERIODONTICS" &&
    !(PERIO_CODES_WITHOUT_NEW_SERIES as readonly string[]).includes(code)
  )
    return "PERIO";
  return null;
}

export function reviewKind(specialty: ReviewSpecialty, step: ReviewStep): string {
  return `REVIEW_${specialty}_${step}`;
}

export function parseReviewKind(
  kind: string,
): { specialty: ReviewSpecialty; step: ReviewStep } | null {
  const match = /^REVIEW_([A-Z]+)_([0-9A-Z]+)$/.exec(kind);
  if (!match) return null;
  const [, specialty, step] = match;
  if (!(REVIEW_SPECIALTIES as readonly string[]).includes(specialty!)) return null;
  if (!(REVIEW_STEPS as readonly string[]).includes(step!)) return null;
  return { specialty: specialty as ReviewSpecialty, step: step as ReviewStep };
}

function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("INVALID_REVIEW_DATE");
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month))
    throw new Error("INVALID_REVIEW_DATE");
  return { year, month, day };
}

// Calendar arithmetic only: review dates are clinic calendar days, never instants.
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function daysInMonth(year: number, month: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1]!;
}

/** Same rule as PostgreSQL `date + interval 'n months'`: a missing day falls back to the month's last day. */
function addMonths(isoDate: string, months: number): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const index = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  const nextDay = Math.min(day, daysInMonth(nextYear, nextMonth));
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
}

export interface ScheduledReview {
  kind: string;
  step: Exclude<ReviewStep, "ANNUAL">;
  dueDate: string;
}

/** First-year reviews from the treatment date (clinic calendar day, YYYY-MM-DD). */
export function buildTreatmentReviewSchedule(
  specialty: ReviewSpecialty,
  treatmentDate: string,
): ScheduledReview[] {
  parseIsoDate(treatmentDate);
  return (Object.keys(FIRST_YEAR_REVIEW_MONTHS) as (keyof typeof FIRST_YEAR_REVIEW_MONTHS)[]).map(
    (step) => ({
      kind: reviewKind(specialty, step),
      step,
      dueDate: addMonths(treatmentDate, FIRST_YEAR_REVIEW_MONTHS[step]),
    }),
  );
}

/** Each booked yearly review schedules the next one a year later. */
export function nextAnnualReviewDate(previousDueDate: string): string {
  return addMonths(previousDueDate, 12);
}

/** Text for reception, from a recall kind (`REVIEW_IMPLANT_3M`, `NO_SHOW`, …). */
export function recallReasonLabel(kind: string): string {
  const review = parseReviewKind(kind);
  if (review)
    return `Revisión de ${SPECIALTY_LABELS[review.specialty]} · ${STEP_LABELS[review.step]}`;
  if (kind === "NO_SHOW") return "No se presentó a la cita";
  return kind;
}
