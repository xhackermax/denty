import { deferralAdvice } from "./tradeoff-context.ts";
import { optionImplications, type OptionImplications } from "./tradeoff-implications.ts";
import { tradeoffEntriesFor } from "./treatment-tradeoffs.ts";
import type { TradeoffEntry } from "./tradeoff-catalog/types.ts";

/**
 * What the patient was shown when comparing treatment options, and what they decided. It is
 * saved as an exact copy (part V of the clinical catalog: "guardar snapshot inmutable"), so a
 * later change to a budget or to the phrase library never rewrites what the patient read.
 */
export const COMPARISON_DECISIONS = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "POSTPONED",
  "NO_TREATMENT",
] as const;
export type ComparisonDecision = (typeof COMPARISON_DECISIONS)[number];

export const COMPARISON_DECISION_LABELS: Record<ComparisonDecision, string> = {
  PENDING: "Pendiente de decidir",
  ACCEPTED: "Acepta una opción",
  DECLINED: "Rechaza el tratamiento",
  POSTPONED: "Aplaza el tratamiento",
  NO_TREATMENT: "Elige no tratar",
};

export interface ComparisonTreatmentLine {
  description: string;
  tooth: string | null;
  totalCents: number;
}

export interface ComparisonOptionSnapshot {
  id: string;
  label: string;
  title: string;
  code: string | null;
  totalCents: number;
  /** Only what this option adds; common steps are listed once in the content. */
  treatments: ComparisonTreatmentLine[];
  advantages: string[];
  disadvantages: string[];
  /** What the option involves besides its price; absent in comparisons saved before it existed. */
  implications?: OptionImplications | undefined;
}

export interface ComparisonConsequenceSnapshot {
  id: string;
  decision: string;
  consequence: string;
}

export interface TreatmentComparisonContent {
  options: ComparisonOptionSnapshot[];
  common: ComparisonTreatmentLine[];
  consequences: ComparisonConsequenceSnapshot[];
}

export interface ComparisonBudget {
  id: string;
  code: string;
  title: string | null;
  totalCents: number;
  advantages: string | null;
  disadvantages: string | null;
  items: ReadonlyArray<ComparisonTreatmentLine & { key: string }>;
}

export interface ComparisonDecisionInput {
  decision: ComparisonDecision;
  chosenOptionId: string | null;
}

const BULLET = /^\s*(?:[•·\-*]\s*)?/;

/** Branch pros and cons are free text, one phrase per line (see tradeoff-selection). */
export function textPhrases(text: string | null | undefined): string[] {
  return (text ?? "")
    .split("\n")
    .map((line) => line.replace(BULLET, "").trim())
    .filter(Boolean);
}

const line = ({ description, tooth, totalCents }: ComparisonTreatmentLine) => ({
  description,
  tooth,
  totalCents,
});

/** Implications of the whole option, common steps included: the patient goes through all of them. */
export function budgetImplications(budget: ComparisonBudget): OptionImplications {
  return optionImplications(
    budget.items.map((item) => ({ treatmentCode: "", label: item.description, tooth: item.tooth })),
  );
}

export function buildComparisonContent(
  budgets: readonly ComparisonBudget[],
  sharedKeys: ReadonlySet<string>,
  consequences: readonly ComparisonConsequenceSnapshot[],
): TreatmentComparisonContent {
  return {
    options: budgets.map((budget, index) => ({
      id: budget.id,
      label: `Opción ${index + 1}`,
      title: budget.title?.trim() || budget.code,
      code: budget.code || null,
      totalCents: budget.totalCents,
      treatments: budget.items.filter((item) => !sharedKeys.has(item.key)).map(line),
      advantages: textPhrases(budget.advantages),
      disadvantages: textPhrases(budget.disadvantages),
      implications: budgetImplications(budget),
    })),
    common: (budgets[0]?.items ?? []).filter((item) => sharedKeys.has(item.key)).map(line),
    consequences: consequences.map(({ id, decision, consequence }) => ({
      id,
      decision,
      consequence,
    })),
  };
}

/**
 * Consequences of postponing that concern the compared treatments. Only the best catalog row
 * of each treatment counts: the source asks for consequences "pertinentes al caso", and looser
 * candidates would add warnings about treatments nobody proposed.
 */
export function comparisonConsequences(
  budgets: readonly ComparisonBudget[],
): ComparisonConsequenceSnapshot[] {
  const rows = budgets
    .flatMap((budget) => budget.items)
    .map(
      (item) =>
        tradeoffEntriesFor({ treatmentCode: "", label: item.description, tooth: item.tooth })[0],
    )
    .filter((entry): entry is TradeoffEntry => entry !== undefined);
  return deferralAdvice(rows).consequences.map(({ id, decision, consequence }) => ({
    id,
    decision,
    consequence,
  }));
}

export function validateComparisonDecision(
  input: ComparisonDecisionInput,
  optionIds: readonly string[],
): string | null {
  if (input.decision === "ACCEPTED")
    return input.chosenOptionId && optionIds.includes(input.chosenOptionId)
      ? null
      : "Elige la opción que acepta el paciente.";
  return input.chosenOptionId ? "Solo se elige una opción cuando el paciente acepta." : null;
}

export function decisionSummary(
  input: ComparisonDecisionInput,
  content: Pick<TreatmentComparisonContent, "options">,
): string {
  const chosen =
    input.decision === "ACCEPTED"
      ? content.options.find((option) => option.id === input.chosenOptionId)
      : undefined;
  return chosen
    ? `Acepta la ${chosen.label} · ${chosen.title}`
    : COMPARISON_DECISION_LABELS[input.decision];
}
