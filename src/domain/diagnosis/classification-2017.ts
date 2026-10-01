import type { PeriodontalReading } from "../periodontal";
import { summarizePeriodontal } from "../periodontal";
export interface ClassificationEvidence {
  periodontalToothLoss?: number;
  functionalComplexity?: boolean;
  boneLossAgeRatio?: number;
  smokingPerDay?: number;
  diabetesHbA1c?: number;
}
export function suggestPeriodontalDiagnosis(
  readings: readonly PeriodontalReading[],
  evidence: ClassificationEvidence = {},
) {
  if (!readings.length) return null;
  const summary = summarizePeriodontal(readings);
  const affected = new Set(
    readings
      .filter((r) => ["MV", "DV", "MP", "DP"].includes(r.site) && r.probingDepth + r.recession >= 1)
      .map((r) => r.tooth),
  );
  const nonAdjacent = [...affected].some((a) =>
    [...affected].some((b) => a[0] !== b[0] || Math.abs(Number(a[1]) - Number(b[1])) > 1),
  );
  const value: "periodontitis" | "gingivitis" | "healthy" =
    affected.size >= 2 && nonAdjacent
      ? "periodontitis"
      : summary.bleedingPct >= 10
        ? "gingivitis"
        : "healthy";
  const detail: {
    bopPct: number;
    stage?: "I" | "II" | "III" | "IV";
    grade?: "A" | "B" | "C";
    extent?: "localized" | "generalized";
  } = { bopPct: summary.bleedingPct };
  if (value === "periodontitis") {
    detail.stage =
      (evidence.periodontalToothLoss ?? 0) >= 5 || evidence.functionalComplexity
        ? "IV"
        : summary.maxCAL >= 5 || summary.maxPD >= 6 || (evidence.periodontalToothLoss ?? 0) > 0
          ? "III"
          : summary.maxCAL >= 3
            ? "II"
            : "I";
    if (evidence.boneLossAgeRatio !== undefined)
      detail.grade =
        evidence.boneLossAgeRatio > 1 ? "C" : evidence.boneLossAgeRatio < 0.25 ? "A" : "B";
    if ((evidence.smokingPerDay ?? 0) >= 10 || (evidence.diabetesHbA1c ?? 0) >= 7)
      detail.grade = "C";
    else if ((evidence.smokingPerDay ?? 0) > 0 || evidence.diabetesHbA1c !== undefined)
      detail.grade = detail.grade === "C" ? "C" : "B";
    const teeth = new Set(readings.map((r) => r.tooth));
    if (teeth.size >= 20)
      detail.extent = affected.size / teeth.size >= 0.3 ? "generalized" : "localized";
  }
  return { value, detail, requiresConfirmation: true as const };
}
