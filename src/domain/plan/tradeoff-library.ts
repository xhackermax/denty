import type { TradeoffEntry, TradeoffKind, TreatmentArgument } from "./tradeoff-catalog/types.ts";

/**
 * A clinic's change to one catalog phrase. The template stays in code; the clinic only stores
 * what differs, so a corrected template still reaches every phrase the clinic did not touch.
 */
export interface ArgumentOverride {
  phraseId: string;
  entryId: string;
  kind: TradeoffKind;
  /** Replacement text; null keeps the template wording. */
  text: string | null;
  hidden: boolean;
  /** Place within its list; null keeps the template order after the placed ones. */
  position: number | null;
  /** A phrase the clinic wrote itself, with no template behind it. */
  custom: boolean;
}

/** One phrase as the library editor shows it, including the hidden ones. */
export interface LibraryPhrase {
  id: string;
  kind: TradeoffKind;
  text: string;
  templateText: string | null;
  hidden: boolean;
  custom: boolean;
  changed: boolean;
}

function phrasesOfKind(
  entry: TradeoffEntry,
  kind: TradeoffKind,
  overrides: readonly ArgumentOverride[],
): LibraryPhrase[] {
  const own = overrides.filter((item) => item.entryId === entry.id && item.kind === kind);
  const byId = new Map(own.map((item) => [item.phraseId, item]));
  const template = kind === "advantage" ? entry.advantages : entry.disadvantages;
  const fromTemplate = template.map((phrase): LibraryPhrase => {
    const change = byId.get(phrase.id);
    return {
      id: phrase.id,
      kind,
      text: change?.text ?? phrase.text,
      templateText: phrase.text,
      hidden: change?.hidden ?? false,
      custom: false,
      changed: change !== undefined && (change.text !== null || change.hidden),
    };
  });
  const added = own
    .filter((item) => item.custom && item.text)
    .map((item): LibraryPhrase => ({
      id: item.phraseId,
      kind,
      text: item.text!,
      templateText: null,
      hidden: item.hidden,
      custom: true,
      changed: true,
    }));
  const all = [...fromTemplate, ...added];
  const rank = (phrase: LibraryPhrase, index: number) =>
    byId.get(phrase.id)?.position ?? Number.MAX_SAFE_INTEGER - all.length + index;
  return all
    .map((phrase, index) => ({ phrase, rank: rank(phrase, index), index }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ phrase }) => phrase);
}

export function libraryPhrases(
  entry: TradeoffEntry,
  overrides: readonly ArgumentOverride[],
): LibraryPhrase[] {
  return [
    ...phrasesOfKind(entry, "advantage", overrides),
    ...phrasesOfKind(entry, "disadvantage", overrides),
  ];
}

const visible = (phrases: readonly LibraryPhrase[]): TreatmentArgument[] =>
  phrases
    .filter((phrase) => !phrase.hidden)
    .map((phrase) => ({ id: phrase.id, kind: phrase.kind, text: phrase.text }));

/** The entry as this clinic explains it: its wording, its order, without hidden phrases. */
export function applyArgumentOverrides(
  entry: TradeoffEntry,
  overrides: readonly ArgumentOverride[],
): TradeoffEntry {
  if (!overrides.some((item) => item.entryId === entry.id)) return entry;
  return {
    ...entry,
    advantages: visible(phrasesOfKind(entry, "advantage", overrides)),
    disadvantages: visible(phrasesOfKind(entry, "disadvantage", overrides)),
  };
}

/**
 * Overrides that move one phrase a step up (-1) or down (+1). Every phrase of the list gets a
 * position so the saved order does not depend on the template order staying the same.
 */
export function reorderOverrides(
  entry: TradeoffEntry,
  phrases: readonly LibraryPhrase[],
  overrides: readonly ArgumentOverride[],
  phraseId: string,
  step: -1 | 1,
): ArgumentOverride[] {
  const moving = phrases.find((phrase) => phrase.id === phraseId);
  if (!moving) return [];
  const list = phrases.filter((phrase) => phrase.kind === moving.kind);
  const from = list.indexOf(moving);
  const to = from + step;
  if (to < 0 || to >= list.length) return [];
  const ordered = [...list];
  [ordered[from], ordered[to]] = [ordered[to]!, ordered[from]!];
  const existing = new Map(overrides.map((item) => [item.phraseId, item]));
  return ordered.map((phrase, position) => ({
    phraseId: phrase.id,
    entryId: entry.id,
    kind: phrase.kind,
    text: existing.get(phrase.id)?.text ?? (phrase.custom ? phrase.text : null),
    hidden: phrase.hidden,
    position,
    custom: phrase.custom,
  }));
}

/** Next free id for a phrase the clinic adds, in the shape the database accepts. */
export function customPhraseId(entryId: string, existingIds: readonly string[]): string {
  const prefix = `${entryId}.C`;
  const used = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter(Number.isInteger);
  return `${prefix}${Math.max(0, ...used) + 1}`;
}

/**
 * The override that saves a change to one phrase, keeping what the clinic already changed.
 * Text equal to the template is stored as null, so later template corrections still apply.
 */
export function phraseOverride(
  entryId: string,
  phrase: LibraryPhrase,
  overrides: readonly ArgumentOverride[],
  change: { text?: string; hidden?: boolean },
): ArgumentOverride {
  const current = overrides.find((item) => item.phraseId === phrase.id);
  const text = change.text?.trim() ?? current?.text ?? (phrase.custom ? phrase.text : null);
  return {
    phraseId: phrase.id,
    entryId,
    kind: phrase.kind,
    text: text === phrase.templateText ? null : text,
    hidden: change.hidden ?? phrase.hidden,
    position: current?.position ?? null,
    custom: phrase.custom,
  };
}
