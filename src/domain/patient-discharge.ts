/**
 * Discharge ("dar de alta"): the patient finishes treatment and moves to
 * maintenance reviews every 6 or 12 months.
 *
 * The database applies the same rules (migration `patient_discharge_reviews`):
 * one open REVIEW_MAINTENANCE recall, due one interval after the discharge.
 */

import { addMonths } from "./treatment-reviews";

export const DISCHARGE_REVIEW_KIND = "REVIEW_MAINTENANCE";
export const REVIEW_INTERVAL_OPTIONS = [6, 12] as const;
export type ReviewIntervalMonths = (typeof REVIEW_INTERVAL_OPTIONS)[number];

/** Used when none of the patient's treatments sets an interval: the usual check-up. */
export const DEFAULT_REVIEW_INTERVAL_MONTHS: ReviewIntervalMonths = 6;

export interface TreatmentReviewInterval {
  name: string;
  reviewIntervalMonths: number | null;
}

export interface DischargeSuggestion {
  months: ReviewIntervalMonths;
  /** Treatment that sets the interval; null when the clinic default applies. */
  basedOn: string | null;
}

export function isReviewIntervalMonths(value: unknown): value is ReviewIntervalMonths {
  return (REVIEW_INTERVAL_OPTIONS as readonly unknown[]).includes(value);
}

/**
 * The shortest interval wins: a patient with implants (6 months) and a filling
 * (12 months) still needs to come every 6 months.
 */
export function suggestDischargeReviewMonths(
  treatments: readonly TreatmentReviewInterval[],
): DischargeSuggestion {
  let best: { months: ReviewIntervalMonths; name: string } | null = null;
  for (const treatment of treatments) {
    const months = treatment.reviewIntervalMonths;
    if (!isReviewIntervalMonths(months)) continue;
    if (!best || months < best.months) best = { months, name: treatment.name };
  }
  return best
    ? { months: best.months, basedOn: best.name }
    : { months: DEFAULT_REVIEW_INTERVAL_MONTHS, basedOn: null };
}

/** Due date of the first maintenance review (clinic calendar days, YYYY-MM-DD). */
export function dischargeReviewDueDate(
  dischargeDate: string,
  months: ReviewIntervalMonths,
): string {
  return addMonths(dischargeDate, months);
}

export function reviewIntervalLabel(months: number): string {
  return months === 12 ? "Anual (12 meses)" : `Cada ${months} meses`;
}

/**
 * Due date of the maintenance review to book now: the first one after the
 * discharge, rolled forward while it is more than a month overdue (the patient
 * already came for it or missed it).
 */
export function nextMaintenanceDueDate(
  dischargeDate: string,
  months: ReviewIntervalMonths,
  today: string,
): string {
  let due = dischargeReviewDueDate(dischargeDate, months);
  while (addMonths(due, 1) < today) due = addMonths(due, months);
  return due;
}
