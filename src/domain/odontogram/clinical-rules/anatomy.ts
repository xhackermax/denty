import { toothType } from "../index.ts";

export function isPrimaryTooth(tooth: string | undefined): boolean {
  return Boolean(tooth && /^[5-8][1-5]$/.test(tooth));
}

export function isUpperPosteriorTooth(tooth: string | undefined): boolean {
  return Boolean(tooth && /^[12][4-8]$/.test(tooth));
}

export function isFurcationEligibleTooth(tooth: string | undefined): boolean {
  if (!tooth) return false;
  if (isPrimaryTooth(tooth)) return /^[5-8][4-5]$/.test(tooth);
  return toothType(tooth) === "molar";
}

export function typicalMaximumCanalCount(tooth: string | undefined): number | null {
  if (!tooth) return null;
  const type = toothType(tooth);
  if (type === "molar") return 4;
  if (type === "premolar") return 3;
  return 2;
}
