/** Supabase Auth rejects passwords shorter than this by default. */
export const MIN_INITIAL_PATIENT_PASSWORD_LENGTH = 6;

/**
 * First-access password for a patient portal account: the patient's DNI/NIE
 * written the way it appears on the card, without spaces, dots or dashes and
 * in upper case ("12.345.678-z" → "12345678Z"). Returns null when the record
 * has no usable document, so the caller can ask for a manual password instead.
 */
export function initialPatientPassword(dni: string | null | undefined): string | null {
  const normalized = (dni ?? "").replace(/[\s.\-_/]/g, "").toUpperCase();
  if (!/^[A-Z0-9]+$/.test(normalized)) return null;
  if (!/\d/.test(normalized)) return null;
  return normalized.length >= MIN_INITIAL_PATIENT_PASSWORD_LENGTH ? normalized : null;
}
