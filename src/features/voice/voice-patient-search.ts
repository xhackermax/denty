import type { VoicePatientCandidate } from "./voice-patient-resolver";

const FILLER_WORDS = new Set([
  "a",
  "al",
  "de",
  "del",
  "el",
  "la",
  "las",
  "los",
  "y",
  "paciente",
  "ficha",
  "senor",
  "señor",
  "senora",
  "señora",
]);
const MAX_SEARCHES = 3;

/**
 * Asks the server for every patient that could match a spoken name. The server
 * matches one field at a time and keeps accents, so each word is searched on its
 * own, exactly as spoken; the caller scores the union with resolveVoicePatient.
 */
export async function searchVoicePatients(
  query: string,
  list: (term: string) => Promise<readonly VoicePatientCandidate[]>,
): Promise<VoicePatientCandidate[]> {
  const words = query
    .toLocaleLowerCase("es")
    .split(/[\s,.;:]+/)
    .filter((word) => word && !FILLER_WORDS.has(word) && (word.length >= 2 || /\d/.test(word)));
  const terms = [...new Set(words)]
    .sort((left, right) => right.length - left.length)
    .slice(0, MAX_SEARCHES);
  if (!terms.length) return [];
  const pages = await Promise.all(terms.map((term) => list(term)));
  const byId = new Map<string, VoicePatientCandidate>();
  for (const patient of pages.flat()) byId.set(patient.id, patient);
  return [...byId.values()];
}
