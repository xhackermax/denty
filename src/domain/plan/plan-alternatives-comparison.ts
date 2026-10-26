import { normalized } from "./treatment-phase.ts";
import { suggestedTradeoffs } from "./treatment-tradeoffs.ts";

export interface ComparablePlanItem {
  id: string;
  treatmentCode: string;
  label: string;
  tooth?: string | null | undefined;
  treatmentCatalogId?: string | null | undefined;
}

export interface ComparableAlternative {
  id: string;
  title?: string | null | undefined;
  advantages?: string | null | undefined;
  disadvantages?: string | null | undefined;
  items: ReadonlyArray<{
    id: string;
    clinicalPlanItemId?: string | null | undefined;
    description: string;
    tooth?: string | null | undefined;
  }>;
}

export interface ComparedTreatment {
  key: string;
  treatmentCode: string;
  label: string;
  tooth: string | null;
  /** Catalog entry the plan item came from, so its recorded times can be looked up. */
  treatmentCatalogId: string | null;
}

export interface ComparedPlanColumn {
  letter: string;
  alternativeId: string | null;
  title: string;
  treatments: ComparedTreatment[];
  teeth: string[];
}

export interface PlanAlternativeDifference {
  letter: string;
  title: string;
  exclusive: ComparedTreatment[];
  advantages: string | null;
  disadvantages: string | null;
  /** Generic pros and cons of the exclusive treatments, for when none were written. */
  suggestedAdvantages: string[];
  suggestedDisadvantages: string[];
}

export interface PlanAlternativesComparison {
  columns: ComparedPlanColumn[];
  common: ComparedTreatment[];
  alternatives: PlanAlternativeDifference[];
}

const BASE_TITLE = "Plan completo";

function letterAt(index: number): string {
  return String.fromCharCode(65 + index);
}

function matchKey(tooth: string | null | undefined, label: string): string {
  return `${tooth ?? ""}|${normalized(label).trim()}`;
}

function uniqueTeeth(treatments: readonly ComparedTreatment[]): string[] {
  const teeth = new Set(treatments.flatMap((item) => (item.tooth ? [item.tooth] : [])));
  return [...teeth].sort(
    (left, right) => Number(left) - Number(right) || left.localeCompare(right),
  );
}

/**
 * Compares Plan A with its branches. Branch items copied from the plan keep a link to the
 * plan item; older or hand-made items are matched by tooth and name so shared steps are
 * still recognised as common.
 */
export function comparePlanAlternatives(
  planItems: readonly ComparablePlanItem[],
  alternatives: readonly ComparableAlternative[],
): PlanAlternativesComparison {
  const planById = new Map(planItems.map((item) => [item.id, item]));
  const planByMatch = new Map(planItems.map((item) => [matchKey(item.tooth, item.label), item]));

  const baseTreatments: ComparedTreatment[] = planItems.map((item) => ({
    key: item.id,
    treatmentCode: item.treatmentCode,
    label: item.label,
    tooth: item.tooth ?? null,
    treatmentCatalogId: item.treatmentCatalogId ?? null,
  }));

  const columns: ComparedPlanColumn[] = [
    {
      letter: "A",
      alternativeId: null,
      title: BASE_TITLE,
      treatments: baseTreatments,
      teeth: uniqueTeeth(baseTreatments),
    },
    ...alternatives.map((alternative, index) => {
      const treatments = alternative.items.map((item): ComparedTreatment => {
        const planItem =
          (item.clinicalPlanItemId ? planById.get(item.clinicalPlanItemId) : undefined) ??
          planByMatch.get(matchKey(item.tooth, item.description));
        return planItem
          ? {
              key: planItem.id,
              treatmentCode: planItem.treatmentCode,
              label: planItem.label,
              tooth: planItem.tooth ?? null,
              treatmentCatalogId: planItem.treatmentCatalogId ?? null,
            }
          : {
              key: `alt:${matchKey(item.tooth, item.description)}`,
              treatmentCode: "",
              label: item.description,
              tooth: item.tooth ?? null,
              treatmentCatalogId: null,
            };
      });
      return {
        letter: letterAt(index + 1),
        alternativeId: alternative.id,
        title: alternative.title?.trim() || "Alternativa",
        treatments,
        teeth: uniqueTeeth(treatments),
      };
    }),
  ];

  const keySets = columns.map((column) => new Set(column.treatments.map((item) => item.key)));
  const common = baseTreatments.filter((item) => keySets.every((keys) => keys.has(item.key)));
  const commonKeys = new Set(common.map((item) => item.key));

  const alternativesById = new Map(
    alternatives.map((alternative) => [alternative.id, alternative]),
  );
  const differences = alternatives.length
    ? columns.map((column) => {
        const source = column.alternativeId
          ? alternativesById.get(column.alternativeId)
          : undefined;
        const exclusive = column.treatments.filter((item) => !commonKeys.has(item.key));
        const suggested = suggestedTradeoffs(exclusive);
        return {
          letter: column.letter,
          title: column.title,
          exclusive,
          advantages: source?.advantages?.trim() || null,
          disadvantages: source?.disadvantages?.trim() || null,
          suggestedAdvantages: suggested.advantages,
          suggestedDisadvantages: suggested.disadvantages,
        };
      })
    : [];

  return { columns, common, alternatives: differences };
}
