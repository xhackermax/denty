import type { TradeoffEntry } from "./tradeoff-catalog/types.ts";
import { tradeoffEntriesFor, type TradeoffClassifiable } from "./treatment-tradeoffs.ts";

// Chosen phrases are stored as plain bulleted lines inside the branch's free text, so what the
// patient reads is exactly what was saved and the dentist can still edit around them.
const BULLET = "• ";

function lines(text: string): string[] {
  return text.split("\n");
}

function isPhraseLine(line: string, phrase: string): boolean {
  const trimmed = line.trim();
  return trimmed === `${BULLET}${phrase}` || trimmed === phrase;
}

export function hasPhrase(text: string, phrase: string): boolean {
  return lines(text).some((line) => isPhraseLine(line, phrase));
}

/** Adds the phrase as a new bulleted line, or removes every line that is that phrase. */
export function togglePhrase(text: string, phrase: string): string {
  if (hasPhrase(text, phrase)) {
    return lines(text)
      .filter((line) => !isPhraseLine(line, phrase))
      .join("\n");
  }
  const base = text.replace(/\s+$/, "");
  return base ? `${base}\n${BULLET}${phrase}` : `${BULLET}${phrase}`;
}

const MAX_PLAN_ENTRIES = 8;

/**
 * Catalog rows to offer for a set of treatments: the best row of each treatment first, then
 * the other variants, without repeats.
 */
export function tradeoffEntriesForPlan(items: readonly TradeoffClassifiable[]): TradeoffEntry[] {
  const candidates = items.map((item) => tradeoffEntriesFor(item));
  const ordered = [
    ...candidates.flatMap((rows) => rows.slice(0, 1)),
    ...candidates.flatMap((rows) => rows.slice(1)),
  ];
  const unique = new Map(ordered.map((entry) => [entry.id, entry]));
  return [...unique.values()].slice(0, MAX_PLAN_ENTRIES);
}
