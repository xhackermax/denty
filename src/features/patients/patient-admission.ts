import { dentitionStageForBirthDate, type DentitionStage } from "@/domain/odontogram";
import type { CreatePatient } from "@/shared/api";

export interface AdmissionOption {
  value: string;
  label: string;
}

export interface PatientMedicalProfile {
  allergies: string[];
  medications: string[];
  conditions: string[];
  dentalRisks: string[];
  notes: string;
  dentitionStage: DentitionStage;
}

export interface PatientAdmissionDraft {
  firstName: string;
  lastName: string;
  birthDate: string;
  dni?: string;
  phone?: string;
  email?: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  dentalRisks: string[];
  notes: string;
}

export type PatientAdmissionPayload = CreatePatient & {
  medicalProfile: PatientMedicalProfile;
};

export const dentalMedicalAdmissionOptions = {
  allergies: [
    { value: "no_known_allergies", label: "Sin alergias conocidas" },
    { value: "penicillin", label: "Penicilina / amoxicilina / betalactámicos" },
    { value: "macrolides", label: "Macrólidos: azitromicina / claritromicina" },
    { value: "clindamycin", label: "Clindamicina" },
    { value: "sulfonamides", label: "Sulfamidas" },
    { value: "nsaid", label: "AINEs: ibuprofeno / naproxeno / AAS" },
    { value: "paracetamol", label: "Paracetamol" },
    { value: "local_anesthetic", label: "Anestésicos locales" },
    { value: "latex", label: "Látex" },
    { value: "chlorhexidine", label: "Clorhexidina" },
    { value: "iodine", label: "Yodo / povidona yodada" },
    { value: "metals", label: "Níquel / metales dentales" },
    { value: "other_allergy", label: "Otra alergia relevante" },
  ],
  medications: [
    {
      value: "anticoagulants",
      label:
        "Anticoagulantes: Sintrom / warfarina / apixabán / rivaroxabán / dabigatrán / edoxabán",
    },
    { value: "antiplatelets", label: "Antiagregantes: Adiro/AAS / clopidogrel" },
    { value: "bisphosphonates", label: "Bisfosfonatos / denosumab (Prolia, Xgeva)" },
    { value: "corticosteroids", label: "Corticoides crónicos" },
    { value: "immunosuppressants", label: "Inmunosupresores / biológicos" },
    { value: "chemotherapy", label: "Quimioterapia / tratamientos antineoplásicos" },
    { value: "antihypertensives", label: "Antihipertensivos" },
    { value: "statins", label: "Estatinas / tratamiento para colesterol" },
    { value: "diabetes_meds", label: "Metformina / insulina / otros antidiabéticos" },
    { value: "glp1_meds", label: "Agonistas GLP-1: semaglutida / tirzepatida y similares" },
    { value: "thyroid_meds", label: "Levotiroxina / medicación tiroidea" },
    { value: "antiepileptics", label: "Antiepilépticos" },
    {
      value: "psychiatric_meds",
      label: "Antidepresivos / ansiolíticos / antipsicóticos",
    },
    { value: "inhalers", label: "Inhaladores para asma / EPOC" },
    { value: "contraceptives", label: "Anticonceptivos hormonales" },
    { value: "no_medication", label: "No toma medicación habitual" },
  ],
  conditions: [
    { value: "diabetes", label: "Diabetes (tipo no especificado)" },
    { value: "diabetes_type_1", label: "Diabetes tipo 1" },
    { value: "diabetes_type_2", label: "Diabetes tipo 2" },
    { value: "hypertension", label: "Hipertensión arterial" },
    { value: "heart_disease", label: "Cardiopatía / infarto / angina" },
    { value: "arrhythmia", label: "Arritmia" },
    { value: "heart_failure", label: "Insuficiencia cardiaca" },
    { value: "pacemaker", label: "Marcapasos o desfibrilador" },
    {
      value: "endocarditis_risk",
      label: "Válvula protésica / antecedente o riesgo de endocarditis",
    },
    { value: "pregnancy", label: "Embarazo" },
    { value: "breastfeeding", label: "Lactancia" },
    { value: "epilepsy", label: "Epilepsia / convulsiones" },
    { value: "asthma", label: "Asma" },
    { value: "copd", label: "EPOC" },
    { value: "kidney_disease", label: "Enfermedad renal / diálisis" },
    { value: "liver_disease", label: "Enfermedad hepática / cirrosis" },
    { value: "viral_hepatitis", label: "Hepatitis B o C" },
    { value: "thyroid_disease", label: "Enfermedad tiroidea: hipo/hipertiroidismo" },
    { value: "immunosuppression", label: "Inmunosupresión" },
    { value: "hiv", label: "VIH" },
    { value: "autoimmune", label: "Enfermedad autoinmune / reumatológica" },
    { value: "organ_transplant", label: "Trasplante de órgano" },
    { value: "cancer", label: "Cáncer / antecedente oncológico" },
    { value: "radiotherapy_head_neck", label: "Radioterapia en cabeza o cuello" },
    { value: "osteoporosis", label: "Osteoporosis / enfermedad ósea" },
    { value: "bleeding_disorder", label: "Trastorno de coagulación / sangrado" },
    { value: "prosthetic_joint", label: "Prótesis articular" },
    { value: "none_relevant", label: "Sin antecedentes relevantes conocidos" },
  ],
  dentalRisks: [
    { value: "dental_anxiety", label: "Ansiedad / miedo dental" },
    { value: "bruxism", label: "Bruxismo / apretamiento" },
    { value: "periodontal_history", label: "Antecedente de periodontitis" },
    { value: "high_caries_risk", label: "Alto riesgo de caries" },
    { value: "xerostomia", label: "Xerostomía / boca seca" },
    { value: "sleep_apnea", label: "Apnea obstructiva del sueño" },
    { value: "smoker", label: "Tabaco" },
    { value: "vaping", label: "Vapeo / cigarrillo electrónico" },
    { value: "alcohol", label: "Consumo de alcohol relevante" },
    { value: "orthodontic_history", label: "Tratamiento ortodóntico previo" },
  ],
} satisfies Record<string, readonly AdmissionOption[]>;

function compactOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function localDateToMadridIso(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return `${value}T00:00:00.000+02:00`;
}

export function suggestedDentitionForBirthDate(
  birthDate: string,
  today?: string,
): DentitionStage {
  return dentitionStageForBirthDate(birthDate || undefined, today);
}

export function buildAdmissionPayload(draft: PatientAdmissionDraft): PatientAdmissionPayload {
  const birthDateIso = localDateToMadridIso(draft.birthDate);
  const payload: PatientAdmissionPayload = {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    medicalProfile: {
      allergies: [...draft.allergies],
      medications: [...draft.medications],
      conditions: [...draft.conditions],
      dentalRisks: [...draft.dentalRisks],
      notes: draft.notes.trim(),
      dentitionStage: suggestedDentitionForBirthDate(draft.birthDate),
    },
  };
  const dni = compactOptional(draft.dni ?? "");
  const phone = compactOptional(draft.phone ?? "");
  const email = compactOptional(draft.email ?? "");
  if (dni) payload.dni = dni;
  if (phone) payload.phone = phone;
  if (email) payload.email = email;
  if (birthDateIso) payload.birthDate = birthDateIso;
  return payload;
}

export function optionLabels(
  group: keyof typeof dentalMedicalAdmissionOptions,
  values: readonly string[],
): string[] {
  const labels = new Map(
    dentalMedicalAdmissionOptions[group].map((option) => [option.value, option.label]),
  );
  return values.map((value) => labels.get(value) ?? value);
}
