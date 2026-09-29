/**
 * Medicines a dental clinic prescribes day to day, with the usual adult regimen
 * as a starting point. Choosing one fills the whole line; every field stays
 * editable because the dentist decides the final regimen for each patient.
 */

export interface MedicationPreset {
  /** Active ingredient as written on the prescription. */
  name: string;
  /** Presentations offered in the "Dosis" dropdown; the first one is the default. */
  strengths: readonly string[];
  pharmaceuticalForm: string;
  route: string;
  unitsPerDose: string;
  frequency: string;
  duration: string;
  instructions?: string;
  group: "Antibiótico" | "Analgésico / antiinflamatorio" | "Antiséptico" | "Protector gástrico";
}

export const DENTAL_MEDICATIONS: readonly MedicationPreset[] = [
  {
    name: "Amoxicilina",
    strengths: ["750 mg", "500 mg", "1 g"],
    pharmaceuticalForm: "Comprimidos",
    route: "Oral",
    unitsPerDose: "1 comprimido",
    frequency: "Cada 8 horas",
    duration: "7 días",
    group: "Antibiótico",
  },
  {
    name: "Amoxicilina / ácido clavulánico",
    strengths: ["875 mg / 125 mg", "500 mg / 125 mg"],
    pharmaceuticalForm: "Comprimidos",
    route: "Oral",
    unitsPerDose: "1 comprimido",
    frequency: "Cada 8 horas",
    duration: "7 días",
    instructions: "Tomar al inicio de las comidas",
    group: "Antibiótico",
  },
  {
    name: "Clindamicina",
    strengths: ["300 mg", "150 mg"],
    pharmaceuticalForm: "Cápsulas",
    route: "Oral",
    unitsPerDose: "1 cápsula",
    frequency: "Cada 8 horas",
    duration: "7 días",
    instructions: "Alternativa en alérgicos a penicilina",
    group: "Antibiótico",
  },
  {
    name: "Azitromicina",
    strengths: ["500 mg"],
    pharmaceuticalForm: "Comprimidos",
    route: "Oral",
    unitsPerDose: "1 comprimido",
    frequency: "Cada 24 horas",
    duration: "3 días",
    group: "Antibiótico",
  },
  {
    name: "Metronidazol",
    strengths: ["500 mg", "250 mg"],
    pharmaceuticalForm: "Comprimidos",
    route: "Oral",
    unitsPerDose: "1 comprimido",
    frequency: "Cada 8 horas",
    duration: "7 días",
    instructions: "No tomar alcohol durante el tratamiento",
    group: "Antibiótico",
  },
  {
    name: "Ibuprofeno",
    strengths: ["600 mg", "400 mg"],
    pharmaceuticalForm: "Comprimidos",
    route: "Oral",
    unitsPerDose: "1 comprimido",
    frequency: "Cada 8 horas",
    duration: "3 días",
    instructions: "Tomar con alimentos",
    group: "Analgésico / antiinflamatorio",
  },
  {
    name: "Dexketoprofeno",
    strengths: ["25 mg"],
    pharmaceuticalForm: "Comprimidos",
    route: "Oral",
    unitsPerDose: "1 comprimido",
    frequency: "Cada 8 horas",
    duration: "3 días",
    group: "Analgésico / antiinflamatorio",
  },
  {
    name: "Naproxeno",
    strengths: ["550 mg"],
    pharmaceuticalForm: "Comprimidos",
    route: "Oral",
    unitsPerDose: "1 comprimido",
    frequency: "Cada 12 horas",
    duration: "3 días",
    instructions: "Tomar con alimentos",
    group: "Analgésico / antiinflamatorio",
  },
  {
    name: "Paracetamol",
    strengths: ["1 g", "650 mg"],
    pharmaceuticalForm: "Comprimidos",
    route: "Oral",
    unitsPerDose: "1 comprimido",
    frequency: "Cada 8 horas",
    duration: "3 días",
    instructions: "Si dolor",
    group: "Analgésico / antiinflamatorio",
  },
  {
    name: "Metamizol",
    strengths: ["575 mg"],
    pharmaceuticalForm: "Cápsulas",
    route: "Oral",
    unitsPerDose: "1 cápsula",
    frequency: "Cada 8 horas",
    duration: "3 días",
    instructions: "Si dolor",
    group: "Analgésico / antiinflamatorio",
  },
  {
    name: "Tramadol / paracetamol",
    strengths: ["37,5 mg / 325 mg"],
    pharmaceuticalForm: "Comprimidos",
    route: "Oral",
    unitsPerDose: "1 comprimido",
    frequency: "Cada 8 horas",
    duration: "3 días",
    instructions: "Si dolor intenso",
    group: "Analgésico / antiinflamatorio",
  },
  {
    name: "Clorhexidina",
    strengths: ["0,12 %", "0,20 %"],
    pharmaceuticalForm: "Colutorio",
    route: "Bucal",
    unitsPerDose: "15 ml",
    frequency: "Cada 12 horas",
    duration: "10 días",
    instructions: "Enjuagar 30 segundos y no enjuagar con agua después",
    group: "Antiséptico",
  },
  {
    name: "Omeprazol",
    strengths: ["20 mg"],
    pharmaceuticalForm: "Cápsulas",
    route: "Oral",
    unitsPerDose: "1 cápsula",
    frequency: "Cada 24 horas",
    duration: "Mientras tome el antiinflamatorio",
    instructions: "En ayunas",
    group: "Protector gástrico",
  },
];

export const PHARMACEUTICAL_FORMS = [
  "Comprimidos",
  "Cápsulas",
  "Sobres",
  "Suspensión oral",
  "Colutorio",
  "Gel bucal",
  "Solución inyectable",
] as const;

export const ROUTES = ["Oral", "Bucal", "Tópica", "Sublingual", "Intramuscular"] as const;

export const UNITS_PER_DOSE = [
  "1 comprimido",
  "2 comprimidos",
  "1 cápsula",
  "1 sobre",
  "5 ml",
  "10 ml",
  "15 ml",
  "Aplicar una capa fina",
] as const;

export const FREQUENCIES = [
  "Cada 4 horas",
  "Cada 6 horas",
  "Cada 8 horas",
  "Cada 12 horas",
  "Cada 24 horas",
  "Dosis única",
  "1 hora antes del tratamiento",
  "Si dolor",
] as const;

export const DURATIONS = [
  "1 día",
  "3 días",
  "5 días",
  "7 días",
  "10 días",
  "14 días",
  "Hasta finalizar el envase",
  "Mientras tome el antiinflamatorio",
] as const;

export const INSTRUCTIONS = [
  "Tomar con alimentos",
  "Tomar al inicio de las comidas",
  "En ayunas",
  "Si dolor",
  "No tomar alcohol durante el tratamiento",
  "Completar el tratamiento aunque desaparezcan los síntomas",
  "Enjuagar 30 segundos y no enjuagar con agua después",
] as const;

export const PACKAGE_COUNTS = ["1 envase", "2 envases", "3 envases"] as const;

/** Usual combinations: one click adds every line. */
export const PRESCRIPTION_PROTOCOLS: readonly {
  label: string;
  medications: readonly string[];
}[] = [
  { label: "Dolor", medications: ["Ibuprofeno", "Paracetamol"] },
  { label: "Infección", medications: ["Amoxicilina", "Ibuprofeno"] },
  { label: "Alérgico a penicilina", medications: ["Clindamicina", "Ibuprofeno"] },
  { label: "Post-extracción", medications: ["Amoxicilina", "Ibuprofeno", "Clorhexidina"] },
  {
    label: "Cirugía / implante",
    medications: ["Amoxicilina / ácido clavulánico", "Ibuprofeno", "Clorhexidina"],
  },
];

export interface PrescriptionLine {
  activeIngredient: string;
  strength: string;
  pharmaceuticalForm: string;
  route: string;
  unitsPerDose: string;
  frequency: string;
  duration: string;
  /** Number of packages to dispense (RD 1718/2010). */
  packageCount: string;
  instructions: string;
}

export function emptyPrescriptionLine(): PrescriptionLine {
  return {
    activeIngredient: "",
    strength: "",
    pharmaceuticalForm: "",
    route: "",
    unitsPerDose: "",
    frequency: "",
    duration: "",
    packageCount: PACKAGE_COUNTS[0],
    instructions: "",
  };
}

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function findMedicationPreset(name: string): MedicationPreset | undefined {
  const key = fold(name);
  return DENTAL_MEDICATIONS.find((medication) => fold(medication.name) === key);
}

/** The full line for a medicine of the vademécum, ready to adjust. */
export function lineFromPreset(preset: MedicationPreset): PrescriptionLine {
  return {
    activeIngredient: preset.name,
    strength: preset.strengths[0] ?? "",
    pharmaceuticalForm: preset.pharmaceuticalForm,
    route: preset.route,
    unitsPerDose: preset.unitsPerDose,
    frequency: preset.frequency,
    duration: preset.duration,
    packageCount: PACKAGE_COUNTS[0],
    instructions: preset.instructions ?? "",
  };
}

/** A line can be prescribed when every mandatory field has a value. */
export function isCompleteLine(line: PrescriptionLine): boolean {
  return [
    line.activeIngredient,
    line.strength,
    line.pharmaceuticalForm,
    line.unitsPerDose,
    line.frequency,
    line.duration,
    line.packageCount,
  ].every((value) => value.trim().length > 0);
}
