const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const NSAIDS =
  /\b(?:ibuprofeno?|dexketoprofeno?|ketoprofeno?|naproxeno?|diclofenaco?|aceclofenaco?|ketorolaco?|indometacina|meloxicam|piroxicam|celecoxib|etoricoxib|acido acetilsalicilico|aspirina|enantyum|espidifen|neobrufen|brufen)\b/;
export function isNsaidMedication(name: string): boolean {
  return NSAIDS.test(fold(name));
}
export function hasNsaidAllergy(profile: unknown): boolean {
  if (!profile || typeof profile !== "object" || !("allergies" in profile)) return false;
  const allergies = profile.allergies;
  return (
    Array.isArray(allergies) &&
    allergies.some(
      (value) =>
        typeof value === "string" &&
        (/\baines?\b|antiinflamatorios?|non.?steroidal|\bnsaids?\b/.test(fold(value)) ||
          isNsaidMedication(value)),
    )
  );
}
export function prescriptionAllergyConflicts(
  profile: unknown,
  ingredients: readonly string[],
): string[] {
  return hasNsaidAllergy(profile) ? ingredients.filter(isNsaidMedication) : [];
}
