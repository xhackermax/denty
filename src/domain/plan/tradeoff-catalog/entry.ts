import type {
  TradeoffEntry,
  TradeoffKind,
  TradeoffSpecialtyId,
  TreatmentArgument,
} from "./types.ts";

function phrases(
  entryId: string,
  kind: TradeoffKind,
  texts: readonly string[],
): TreatmentArgument[] {
  const prefix = kind === "advantage" ? "A" : "D";
  return texts.map((text, index) => ({ id: `${entryId}.${prefix}${index + 1}`, kind, text }));
}

function build(
  source: TradeoffEntry["source"],
  specialty: TradeoffSpecialtyId,
  id: string,
  name: string,
  advantages: readonly string[],
  disadvantages: readonly string[],
): TradeoffEntry {
  return {
    id,
    source,
    specialty,
    name,
    advantages: phrases(id, "advantage", advantages),
    disadvantages: phrases(id, "disadvantage", disadvantages),
  };
}

export const matrixEntry = build.bind(null, "matrix");
export const bankEntry = build.bind(null, "bank");
