const SEQUENTIAL = /^(?:DNT-)?([0-9]{1,12})$/i;

// Existing imported numbers and previously generated DNT numbers share one clinic sequence.
// The number is text so leading zeros are preserved; no "DNT-" prefix is generated.
export function nextRecordNumber(existing: readonly string[]): string {
  let max = 0;
  for (const value of existing) {
    const match = SEQUENTIAL.exec(value.trim());
    if (match?.[1]) max = Math.max(max, Number(match[1]));
  }
  return String(max + 1).padStart(5, "0");
}

// Imports from old Denty versions may contain DNT-000123. Normalize these on write,
// without changing numeric or non-Denty identifiers imported from other clinics.
export function normalizeImportedRecordNumber(value: string): string {
  const cleaned = value.trim();
  const match = /^DNT-([0-9]{1,12})$/i.exec(cleaned);
  return match?.[1] ? String(Number(match[1])).padStart(5, "0") : cleaned;
}
