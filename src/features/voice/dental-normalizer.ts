import lexicon from "./dental-lexicon.generated.json";

/**
 * Rewrites real chairside speech (Spain + Latin America) into the canonical
 * words the rule-based interpreter understands, using the lexicon generated
 * from the Denty NLU dictionary (scripts/nlu/build-dental-lexicon.mjs):
 * "calza en cuatro seis por fuera" → "obturacion en 46 vestibular".
 * Only used for clinical extraction; notes and names keep the original text.
 */

const QUADRANT_BY_SIDE: Readonly<Record<string, number>> = {
  "arriba derecha": 1,
  "arriba izquierda": 2,
  "abajo izquierda": 3,
  "abajo derecha": 4,
  "superior derecha": 1,
  "superior izquierda": 2,
  "inferior izquierda": 3,
  "inferior derecha": 4,
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[¿?¡!;:«»"]+/g, " ")
    .replace(/,/g, " , ")
    .replace(/\s+/g, " ")
    .trim();
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

function phrasePattern(forms: readonly string[]): RegExp {
  return new RegExp(`(?<![a-z0-9])(?:${forms.map(escape).join("|")})(?![a-z0-9])`, "g");
}

function replaceMap(text: string, map: Readonly<Record<string, string | number>>): string {
  const forms = Object.keys(map);
  if (!forms.length) return text;
  return text.replace(phrasePattern(forms), (match) => String(map[match] ?? match));
}

function replaceAll(text: string, forms: readonly string[], canonical: string): string {
  return forms.length ? text.replace(phrasePattern(forms), canonical) : text;
}

const DIGIT = Object.keys(lexicon.singleDigits).join("|");
const digitValue = (word: string) =>
  /^\d$/.test(word) ? word : (lexicon.singleDigits as Record<string, string>)[word];

function isFdi(value: string): boolean {
  return /^(?:[1-4][1-8]|[5-8][1-5])$/.test(value);
}

/** "treinta y seis", "dos seis", "1.6", "el ocho de arriba a la derecha" → FDI digits. */
function normalizeTeeth(text: string): string {
  let result = replaceMap(text, lexicon.numberWords);
  // Spoken digit pairs and dotted FDI: "dos seis", "1.6", "1-6".
  result = result.replace(
    new RegExp(`(?<![a-z0-9.,])(${DIGIT}|[1-8])(?:\\s+|\\.|-)(${DIGIT}|[1-8])(?![a-z0-9.])`, "g"),
    (match, first: string, second: string, offset: number, whole: string) => {
      const before = whole.slice(Math.max(0, offset - 8), offset);
      if (/\ba\s+las?\s*$/.test(before)) return match; // "a las dos seis" is a time
      const fdi = `${digitValue(first)}${digitValue(second)}`;
      return isFdi(fdi) ? fdi : match;
    },
  );
  // Position + quadrant: "el ocho de arriba a la derecha" / "... abajo a la izquierda que es la seis".
  const side =
    "(arriba|abajo|superior|inferior)\\s+(?:a\\s+la\\s+|del?\\s+lado\\s+)?(derecha|derecho|izquierda|izquierdo)";
  const position = `(${DIGIT}|[1-8])`;
  result = result.replace(
    new RegExp(`\\b(?:el|la)\\s+${position}\\s+(?:de\\s+)?${side}`, "g"),
    (match, pos: string, vertical: string, horizontal: string) =>
      quadrantTooth(pos, vertical, horizontal) ?? match,
  );
  result = result.replace(
    new RegExp(`\\b${side}\\s+(?:que\\s+es\\s+)?(?:el|la)\\s+${position}\\b`, "g"),
    (match, vertical: string, horizontal: string, pos: string) =>
      quadrantTooth(pos, vertical, horizontal) ?? match,
  );
  return result;
}

function quadrantTooth(position: string, vertical: string, horizontal: string): string | null {
  const quadrant = QUADRANT_BY_SIDE[`${vertical} ${horizontal.replace(/o$/, "a")}`];
  const digit = digitValue(position);
  return quadrant && digit ? `el ${quadrant}${digit}` : null;
}

const FDI_NUMBER = "(?:[1-4][1-8]|[5-8][1-5])";
// "el 16 no, el 26" / "16, digo 26": the first tooth was a slip. "el 16 no tiene…" is not.
const TOOTH_CORRECTION = new RegExp(
  `\\b${FDI_NUMBER}\\s*,?\\s+(?:no|digo|mejor)\\s*,?\\s+(?:en\\s+)?(?:(?:el|la)\\s+)?(?=${FDI_NUMBER}\\b)`,
  "g",
);

/** "caries en 26 distal, no perdón, mesial" → "caries en 26 mesial". */
function applySelfCorrection(spoken: string): string {
  const text = spoken.replace(TOOTH_CORRECTION, "");
  const markers = phrasePattern(lexicon.correctionMarkers);
  const matches = [...text.matchAll(markers)];
  const last = matches.at(-1);
  if (!last || last.index === undefined) return text;
  let left = text.slice(0, last.index);
  const right = text.slice(last.index + last[0].length);
  const surfaceWords = /\b(?:mesial|distal|oclusal|incisal|vestibular|lingual|palatino)\b/g;
  if (surfaceWords.test(right)) left = left.replace(surfaceWords, " ");
  if (/\b(?:[1-4][1-8]|[5-8][1-5])\b/.test(right)) {
    left = left.replace(/\b(?:[1-4][1-8]|[5-8][1-5])\b/g, " ");
  }
  return `${left} ${right}`;
}

/** True when the speaker corrected themselves mid-sentence ("no, perdón, mesial"). */
export function hasSelfCorrection(raw: string): boolean {
  const text = normalizeTeeth(fold(raw));
  TOOTH_CORRECTION.lastIndex = 0;
  return phrasePattern(lexicon.correctionMarkers).test(text) || TOOTH_CORRECTION.test(text);
}

// "no tiene caries", "sin caries": a finding said to be absent must never be recorded.
// The joined token no longer reads as the word "caries" further down.
const NEGATED_CARIES =
  /\b(?:no\s+(?:tiene|hay|presenta|veo|tiene\s+ninguna)|sin)\s+(?:ninguna\s+)?(?:caries|lesion\s+de\s+caries)\b/g;

export function canonicalizeDentalSpeech(raw: string): string {
  let text = fold(raw);
  text = text.replace(NEGATED_CARIES, " sincaries ");
  text = text.replace(phrasePattern(lexicon.fillers), " ");
  text = normalizeTeeth(text);

  // Spoken compounds become the abbreviation the surface parser reads ("mod", "mo", "do").
  text = replaceMap(
    text,
    Object.fromEntries(
      Object.entries(lexicon.surfaceCompounds).map(([form, code]) => [form, code.toLowerCase()]),
    ),
  );
  text = replaceMap(text, lexicon.treatments);
  text = replaceAll(text, lexicon.caries, "caries");
  text = replaceAll(text, lexicon.unsatisfactory, "defectuoso");
  text = replaceAll(text, lexicon.completed, "realizado");
  text = replaceAll(text, lexicon.healthy, "sano");
  text = replaceAll(text, lexicon.missing, "ausente");
  // Missing teeth said naturally: "no está el 18", "el paciente no tiene el 18",
  // "el 18 falta", "quita el 18 del odontograma".
  text = text
    .replace(/\bno\s+(?:esta|tiene)\s+(?:el\s+|la\s+)?(\d{2})\b/g, "$1 ausente")
    .replace(/\bfaltan?(?:\s+el|\s+la)?\s+(\d{2})\b/g, "$1 ausente")
    .replace(/\b(\d{2})\s+falta\b/g, "$1 ausente")
    .replace(/\bquita\s+(?:el\s+|la\s+)?(\d{2})\s+del\s+odontograma\b/g, "$1 ausente");
  // Surfaces last: "por fuera", "cara externa", "palatal"…
  text = replaceMap(text, {
    ...Object.fromEntries(
      Object.entries(lexicon.surfaces).map(([form, code]) => [form, SURFACE_WORD[code] ?? form]),
    ),
  });
  text = applySelfCorrection(text);
  return text
    .replace(/\s*,\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SURFACE_WORD: Readonly<Record<string, string>> = {
  M: "mesial",
  D: "distal",
  O: "oclusal",
  I: "incisal",
  V: "vestibular",
  L: "lingual",
  P: "palatino",
};
