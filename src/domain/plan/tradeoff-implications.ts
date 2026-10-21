import { deferralAdvice } from "./tradeoff-context.ts";
import type { TradeoffEntry } from "./tradeoff-catalog/types.ts";
import { normalized } from "./treatment-phase.ts";
import { tradeoffEntriesFor, type TradeoffClassifiable } from "./treatment-tradeoffs.ts";

/**
 * What an option involves beyond its price (part VI of the catalog: "no comparar únicamente
 * precios"). Everything is read from the catalog rows; nothing here estimates times, costs or
 * success rates, which the source forbids inventing.
 */
export interface OptionImplications {
  procedures: number;
  surgery: boolean;
  irreversible: boolean;
  /** Follow-up the option needs to last, from the catalog's continuity table. */
  maintenance: string[];
}

// Continuity rows that describe ongoing care rather than an infection or an unfinished phase.
const MAINTENANCE_CONSEQUENCES = new Set(["C03", "C04", "C05", "C06", "C07"]);
const SURGICAL =
  /extracci|exodoncia|cirug|injerto|regenerac|implant|elevacion de seno|coronectomia/;

function isSurgical(entry: TradeoffEntry): boolean {
  return (
    entry.specialty === "cirugia" ||
    entry.specialty === "implantologia" ||
    SURGICAL.test(normalized(entry.name))
  );
}

function isIrreversible(entry: TradeoffEntry): boolean {
  return (
    /extracci|exodoncia/.test(normalized(entry.name)) ||
    entry.disadvantages.some((phrase) => /irreversib/.test(normalized(phrase.text)))
  );
}

export function optionImplications(items: readonly TradeoffClassifiable[]): OptionImplications {
  // The best row per treatment only: looser candidates would describe treatments not proposed.
  const rows = items
    .map((item) => tradeoffEntriesFor(item)[0])
    .filter((entry): entry is TradeoffEntry => entry !== undefined);
  return {
    procedures: items.length,
    surgery: rows.some(isSurgical),
    irreversible: rows.some(isIrreversible),
    maintenance: deferralAdvice(rows)
      .consequences.filter((item) => MAINTENANCE_CONSEQUENCES.has(item.id))
      .map((item) => item.action),
  };
}

/**
 * Lines for the patient. Only what the catalog supports is stated: an option without a surgical
 * row is not called "sin cirugía", because an unrecognised treatment could still be one.
 */
export function implicationLines(implications: OptionImplications): string[] {
  return [
    `${implications.procedures} ${implications.procedures === 1 ? "procedimiento" : "procedimientos"}`,
    ...(implications.surgery ? ["Incluye cirugía"] : []),
    ...(implications.irreversible ? ["Incluye pasos irreversibles"] : []),
    ...implications.maintenance.map((action) => `Mantenimiento: ${action.toLowerCase()}`),
  ];
}
