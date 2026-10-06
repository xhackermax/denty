import type { PrescriptionLine } from "./dental-vademecum";

export type PediatricMedication =
  | "Paracetamol"
  | "Ibuprofeno"
  | "Amoxicilina"
  | "Amoxicilina / ácido clavulánico";

export interface PediatricDoseInput {
  medication: PediatricMedication;
  weightKg: number;
  ageMonths: number;
  heightCm?: number;
}

export interface PediatricDoseResult {
  medication: PediatricMedication;
  allowed: boolean;
  doseMg: number;
  volumeMl?: number;
  strength: string;
  pharmaceuticalForm: string;
  frequency: string;
  duration: string;
  maxDailyMg: number;
  instructions: string;
  warning?: string;
}

interface PediatricRule {
  doseMgPerKg: number;
  dosesPerDay: number;
  maxDailyMg: number;
  concentrationMgPerMl?: number;
  strengthLabel: string;
  pharmaceuticalForm: string;
  frequency: string;
  duration: string;
  instructions: string;
  minAgeMonths?: number;
  minWeightKg?: number;
}

const RULES: Record<PediatricMedication, PediatricRule> = {
  Paracetamol: {
    doseMgPerKg: 15,
    dosesPerDay: 4,
    maxDailyMg: 3000,
    concentrationMgPerMl: 100,
    strengthLabel: "100 mg/ml",
    pharmaceuticalForm: "Solución oral",
    frequency: "Cada 6 horas",
    duration: "3 días",
    instructions: "Si dolor o fiebre. Revisar dosis máxima diaria.",
  },
  Ibuprofeno: {
    doseMgPerKg: 10,
    dosesPerDay: 3,
    maxDailyMg: 1200,
    concentrationMgPerMl: 20,
    strengthLabel: "20 mg/ml",
    pharmaceuticalForm: "Suspensión oral",
    frequency: "Cada 8 horas",
    duration: "3 días",
    instructions: "Tomar con alimentos. Evitar si alergia a AINEs o deshidratación.",
    minAgeMonths: 3,
    minWeightKg: 5,
  },
  Amoxicilina: {
    doseMgPerKg: 50 / 3,
    dosesPerDay: 3,
    maxDailyMg: 3000,
    strengthLabel: "Dosis calculada por kg",
    pharmaceuticalForm: "Suspensión oral",
    frequency: "Cada 8 horas",
    duration: "7 días",
    instructions: "Completar el tratamiento. Verificar presentación comercial.",
  },
  "Amoxicilina / ácido clavulánico": {
    doseMgPerKg: 40 / 3,
    dosesPerDay: 3,
    maxDailyMg: 3000,
    strengthLabel: "Dosis calculada por amoxicilina",
    pharmaceuticalForm: "Suspensión oral",
    frequency: "Cada 8 horas",
    duration: "7 días",
    instructions: "Tomar al inicio de las comidas. Verificar presentación comercial.",
  },
};

function roundDose(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value);
}

function bmiWarning(weightKg: number, heightCm?: number): string | undefined {
  if (!heightCm || heightCm <= 0) return undefined;
  const meters = heightCm / 100;
  const bmi = weightKg / (meters * meters);
  return bmi >= 30
    ? `IMC alto (${formatDecimal(bmi)}). Revisar si conviene ajustar por peso ideal o criterio pediátrico.`
    : undefined;
}

export function calculatePediatricDose(input: PediatricDoseInput): PediatricDoseResult {
  const rule = RULES[input.medication];
  const underAge = rule.minAgeMonths !== undefined && input.ageMonths < rule.minAgeMonths;
  const underWeight = rule.minWeightKg !== undefined && input.weightKg < rule.minWeightKg;
  const calculatedDailyMg = input.weightKg * rule.doseMgPerKg * rule.dosesPerDay;
  const maxDailyMg = Math.min(rule.maxDailyMg, roundDose(calculatedDailyMg));
  const doseMg = roundDose(Math.min(input.weightKg * rule.doseMgPerKg, maxDailyMg / rule.dosesPerDay));
  const volumeMl = rule.concentrationMgPerMl
    ? roundDose(doseMg / rule.concentrationMgPerMl)
    : undefined;
  const warnings = [
    underAge || underWeight
      ? `No recomendado por debajo de ${rule.minAgeMonths ?? 0} meses o ${rule.minWeightKg ?? 0} kg.`
      : undefined,
    bmiWarning(input.weightKg, input.heightCm),
  ].filter((warning): warning is string => Boolean(warning));

  return {
    medication: input.medication,
    allowed: !underAge && !underWeight,
    doseMg,
    ...(volumeMl !== undefined ? { volumeMl } : {}),
    strength: rule.strengthLabel,
    pharmaceuticalForm: rule.pharmaceuticalForm,
    frequency: rule.frequency,
    duration: rule.duration,
    maxDailyMg,
    instructions: rule.instructions,
    ...(warnings.length ? { warning: warnings.join(" ") } : {}),
  };
}

export function pediatricLineFromDose(dose: PediatricDoseResult): PrescriptionLine {
  const volume = dose.volumeMl !== undefined ? ` (${formatDecimal(dose.volumeMl)} ml de ${dose.strength})` : "";
  return {
    activeIngredient: dose.medication,
    strength: `${formatDecimal(dose.doseMg)} mg${volume}`,
    pharmaceuticalForm: dose.pharmaceuticalForm,
    route: "Oral",
    unitsPerDose: "1 toma",
    frequency: dose.frequency,
    duration: dose.duration,
    packageCount: "1 envase",
    instructions: dose.warning ? `${dose.instructions} ${dose.warning}` : dose.instructions,
  };
}
