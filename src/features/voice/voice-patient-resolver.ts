export interface VoicePatientCandidate {
  id: string;
  firstName: string;
  lastName: string;
  recordNumber?: string | null;
}

export interface VoicePatientResolution {
  id: string;
  label: string;
  recordNumber?: string;
  score: number;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: string): string {
  return normalize(value).replace(/\s+/g, "");
}

const DIGIT_WORDS: Readonly<Record<string, number>> = {
  cero: 0,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
};
const TEEN_WORDS: Readonly<Record<string, number>> = {
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
};
const TENS_WORDS: Readonly<Record<string, number>> = {
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
};
const HUNDRED_WORDS: Readonly<Record<string, number>> = {
  cien: 100,
  ciento: 100,
  doscientos: 200,
  trescientos: 300,
  cuatrocientos: 400,
  quinientos: 500,
  seiscientos: 600,
  setecientos: 700,
  ochocientos: 800,
  novecientos: 900,
};
const RECORD_FILLER = new Set([
  "ficha",
  "numero",
  "expediente",
  "historia",
  "paciente",
  "el",
  "la",
]);

function cardinalFromWords(tokens: readonly string[]): number | undefined {
  let total = 0;
  let index = 0;
  const hundred = HUNDRED_WORDS[tokens[index] ?? ""];
  if (hundred !== undefined) {
    total += hundred;
    index += 1;
  }
  if (index === tokens.length) return total > 0 ? total : undefined;
  const word = tokens[index] ?? "";
  if (word in TEEN_WORDS && index === tokens.length - 1) return total + (TEEN_WORDS[word] ?? 0);
  if (word in DIGIT_WORDS && index === tokens.length - 1) return total + (DIGIT_WORDS[word] ?? 0);
  const tens = TENS_WORDS[word];
  if (tens === undefined) return undefined;
  total += tens;
  if (index === tokens.length - 1) return total;
  if (tokens[index + 1] !== "y" || index + 3 !== tokens.length) return undefined;
  const unit = DIGIT_WORDS[tokens[index + 2] ?? ""];
  return unit !== undefined && unit > 0 ? total + unit : undefined;
}

/** Record number dictated as digits or words ("cero cero uno cero cuatro", "ciento cuatro"). */
function spokenRecordNumber(normalizedQuery: string): number | undefined {
  const tokens = normalizedQuery.split(" ").filter((token) => token && !RECORD_FILLER.has(token));
  if (!tokens.length) return undefined;
  if (tokens.every((token) => /^\d+$/.test(token))) return Number(tokens.join(""));
  if (tokens.every((token) => token in DIGIT_WORDS)) {
    return Number(tokens.map((token) => DIGIT_WORDS[token]).join(""));
  }
  return cardinalFromWords(tokens);
}

function recordValue(record: string): number | undefined {
  return /^\d+$/.test(record) ? Number(record) : undefined;
}

function patientLabel(patient: VoicePatientCandidate): string {
  return `${patient.firstName} ${patient.lastName}`.trim();
}

function scoreCandidate(query: string, patient: VoicePatientCandidate): number {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;

  const fullName = normalize(patientLabel(patient));
  const reversedName = normalize(`${patient.lastName} ${patient.firstName}`);
  const record = normalize(patient.recordNumber ?? "");
  const compactQuery = compact(query);
  const compactName = compact(fullName);
  const compactReversed = compact(reversedName);

  if (record && (normalizedQuery === record || compactQuery === compact(record))) return 1;
  const spoken = spokenRecordNumber(normalizedQuery);
  if (spoken !== undefined && record && recordValue(record) === spoken) return 1;
  if (spoken !== undefined) return 0;
  if (normalizedQuery === fullName || normalizedQuery === reversedName) return 1;
  if (compactQuery === compactName || compactQuery === compactReversed) return 0.99;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const nameTokens = new Set(fullName.split(" ").filter(Boolean));
  const matchedTokens = queryTokens.filter((token) => nameTokens.has(token)).length;
  if (matchedTokens === queryTokens.length && queryTokens.length >= 2) return 0.94;

  // Whole-word matching: "ana" must not match "Mariana".
  const padded = (value: string) => ` ${value} `;
  const paddedQuery = padded(normalizedQuery);
  if (padded(fullName).startsWith(paddedQuery) || padded(reversedName).startsWith(paddedQuery)) {
    return 0.9;
  }
  if (padded(fullName).includes(paddedQuery) || padded(reversedName).includes(paddedQuery)) {
    return 0.86;
  }

  if (queryTokens.length === 1 && matchedTokens === 1) return 0.72;
  return 0;
}

export function resolveVoicePatient(
  query: string,
  patients: readonly VoicePatientCandidate[],
): VoicePatientResolution[] {
  return patients
    .map((patient) => ({
      id: patient.id,
      label: patientLabel(patient),
      ...(patient.recordNumber ? { recordNumber: patient.recordNumber } : {}),
      score: scoreCandidate(query, patient),
    }))
    .filter((candidate) => candidate.score >= 0.7)
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label, "es"));
}

const OVERRIDE_MIN_SCORE = 0.9;

/**
 * With a patient already open, a spoken full name may still refer to someone
 * else; writing the order to the open chart would be a silent wrong-patient error.
 * Only a strong, unambiguous match overrides the open patient.
 */
export function pickPatientOverride(
  query: string,
  openPatientId: string,
  patients: readonly VoicePatientCandidate[],
): VoicePatientResolution | undefined {
  const [best, second] = resolveVoicePatient(query, patients);
  if (!best || best.id === openPatientId || best.score < OVERRIDE_MIN_SCORE) return undefined;
  const words = normalize(query).split(" ").filter(Boolean).length;
  if (words < 2 && best.score < 1) return undefined;
  if (second && second.id !== openPatientId && best.score - second.score < 0.08) return undefined;
  return best;
}
