import {
  COMPARISON_SCENARIOS,
  type ComparisonScenario,
} from "./tradeoff-catalog/comparison-scenarios.ts";
import {
  CLINICAL_GUARDS,
  DEFERRAL_CONSEQUENCES,
  NO_TREATMENT_OPTIONS,
  type CatalogTrigger,
  type ClinicalGuard,
  type DeferralConsequence,
} from "./tradeoff-catalog/continuity.ts";
import { TRADEOFF_SPECIALTIES } from "./tradeoff-catalog/treatment-matrix.ts";
import type { TradeoffEntry, TradeoffSpecialty } from "./tradeoff-catalog/types.ts";
import type { PlanAlternativesComparison } from "./plan-alternatives-comparison.ts";
import {
  tradeoffEntriesFor,
  tradeoffEntry,
  type TradeoffClassifiable,
} from "./treatment-tradeoffs.ts";

export interface DeferralAdvice {
  /** "No tratar / observar" rows that are a defensible choice for these treatments. */
  options: TradeoffEntry[];
  consequences: DeferralConsequence[];
}

function fires(trigger: CatalogTrigger, entries: readonly TradeoffEntry[]): boolean {
  return entries.some(
    (entry) =>
      trigger.specialties?.includes(entry.specialty) || trigger.entryIds?.includes(entry.id),
  );
}

/**
 * Scenarios from the catalog where one plan holds option A and a different plan option B, so
 * the dentist sees which reference comparison (and its clinical check) applies.
 */
export function matchingScenarios(
  plans: ReadonlyArray<readonly TradeoffEntry[]>,
): ComparisonScenario[] {
  const planIds = plans.map((entries) => new Set(entries.map((entry) => entry.id)));
  const holds = (plan: Set<string>, ids: readonly string[]) => ids.some((id) => plan.has(id));
  return COMPARISON_SCENARIOS.filter(({ options: [first, second] }) =>
    planIds.some(
      (left, i) =>
        holds(left, first.entryIds) &&
        planIds.some((right, j) => i !== j && holds(right, second.entryIds)),
    ),
  );
}

/** What to explain if the patient postpones or declines the treatments behind these rows. */
export function deferralAdvice(entries: readonly TradeoffEntry[]): DeferralAdvice {
  return {
    options: NO_TREATMENT_OPTIONS.filter((option) => fires(option.trigger, entries))
      .map((option) => tradeoffEntry(option.entryId))
      .filter((entry): entry is TradeoffEntry => entry !== undefined),
    consequences: DEFERRAL_CONSEQUENCES.filter((item) => fires(item.trigger, entries)),
  };
}

/** Cautions the dentist must see before explaining these rows; "always" ones come last. */
export function clinicalGuards(entries: readonly TradeoffEntry[]): ClinicalGuard[] {
  return [
    ...CLINICAL_GUARDS.filter(
      (guard) => guard.trigger !== "always" && fires(guard.trigger, entries),
    ),
    ...CLINICAL_GUARDS.filter((guard) => guard.trigger === "always"),
  ];
}

/** Specialty-wide notes ("no todos los dientes endodonciados necesitan corona…"). */
export function specialtyNotes(entries: readonly TradeoffEntry[]): TradeoffSpecialty[] {
  const involved = new Set(entries.map((entry) => entry.specialty));
  return TRADEOFF_SPECIALTIES.filter(
    (specialty) => involved.has(specialty.id) && specialty.notes.length,
  );
}

export interface PlanTradeoffContext {
  scenarios: ComparisonScenario[];
  deferral: DeferralAdvice;
  guards: ClinicalGuard[];
  notes: TradeoffSpecialty[];
}

/**
 * Reference material for a plan comparison: scenarios are read from what differs between the
 * plans, while postponing and cautions concern every treatment in any plan.
 */
export function planTradeoffContext(comparison: PlanAlternativesComparison): PlanTradeoffContext {
  const rowsOf = (items: readonly TradeoffClassifiable[]) => items.flatMap(tradeoffEntriesFor);
  const everything = rowsOf(comparison.columns.flatMap((column) => column.treatments));
  return {
    scenarios: matchingScenarios(comparison.alternatives.map((plan) => rowsOf(plan.exclusive))),
    deferral: deferralAdvice(everything),
    guards: everything.length ? clinicalGuards(everything) : [],
    notes: specialtyNotes(everything),
  };
}
