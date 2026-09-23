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
  if (normalizedQuery === fullName || normalizedQuery === reversedName) return 1;
  if (compactQuery === compactName || compactQuery === compactReversed) return 0.99;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const nameTokens = new Set(fullName.split(" ").filter(Boolean));
  const matchedTokens = queryTokens.filter((token) => nameTokens.has(token)).length;
  if (matchedTokens === queryTokens.length && queryTokens.length >= 2) return 0.94;

  if (fullName.startsWith(normalizedQuery) || reversedName.startsWith(normalizedQuery)) return 0.9;
  if (fullName.includes(normalizedQuery) || reversedName.includes(normalizedQuery)) return 0.86;

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
