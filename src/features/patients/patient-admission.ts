import { dentitionStageForBirthDate, type DentitionStage } from "@/domain/odontogram";
import type { CreatePatient } from "@/shared/api";

export interface AdmissionOption {
  value: string;
  label: string;
}

export interface PatientMedicalProfile {
  allergies: readonly string[];
  medications: readonly string[];
  conditions: readonly string[];
  dentalRisks: readonly string[];
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
  allergies: readonly string[];
  medications: readonly string[];
  conditions: readonly string[];
  dentalRisks: readonly string[];
  notes: string;
}

export type PatientAdmissionPayload = CreatePatient & {
  medicalProfile: PatientMedicalProfile;
};

export const dentalMedicalAdmissionOptions = {
  allergies: [
    { value: "penicillin", label: "Penicilina / betalactámicos" },
    { value: "nsaid", label: "AINEs: ibuprofeno, naproxeno, aspirina" },
    { value: "local_anesthetic", label: "Anestésicos locales" },
    { value: "latex", label: "Látex" },
    { value: "chlorhexidine", label: "Clorhexidina" },
    { value: "iodine", label: "Yodo / povidona" },
    { value: "metals", label: "Metales dentales" },
    { value: "other_allergy", label: "Otra alergia relevante" },
  ],
  medications: [
    { value: "anticoagulants", label: "Anticoagulantes: Sintrom, warfarina, DOAC" },
    { value: "antiplatelets", label: "Antiagregantes: aspirina, clopidogrel" },
    { value: "bisphosphonates", label: "Bisfosfonatos / denosumab" },
    { value: "corticosteroids", label: "Corticoides crónicos" },
    { value: "immunosuppressants", label: "Inmunosupresores / biológicos" },
    { value: "antihypertensives", label: "Antihipertensivos" },
    { value: "diabetes_meds", label: "Insulina / antidiabéticos" },
    { value: "psychiatric_meds", label: "Ansiolíticos, antidepresivos o neurolépticos" },
    { value: "contraceptives", label: "Anticonceptivos hormonales" },
    { value: "no_medication", label: "No toma medicación habitual" },
  ],
  conditions: [
    { value: "diabetes", label: "Diabetes" },
    { value: "hypertension", label: "Hipertensión arterial" },
    { value: "heart_disease", label: "Cardiopatía / infarto / angina" },
    { value: "pacemaker", label: "Marcapasos o desfibrilador" },
    { value: "endocarditis_risk", label: "Riesgo de endocarditis / válvula protésica" },
    { value: "pregnancy", label: "Embarazo o lactancia" },
    { value: "epilepsy", label: "Epilepsia" },
    { value: "asthma", label: "Asma / EPOC" },
    { value: "kidney_disease", label: "Enfermedad renal" },
    { value: "liver_disease", label: "Enfermedad hepática" },
    { value: "immunosuppression", label: "Inmunosupresión" },
    { value: "radiotherapy_head_neck", label: "Radioterapia en cabeza o cuello" },
    { value: "osteoporosis", label: "Osteoporosis" },
    { value: "bleeding_disorder", label: "Trastorno de coagulación" },
    { value: "none_relevant", label: "Sin antecedentes relevantes" },
  ],
  dentalRisks: [
    { value: "dental_anxiety", label: "Ansiedad dental" },
    { value: "bruxism", label: "Bruxismo / apretamiento" },
    { value: "periodontal_history", label: "Antecedente periodontal" },
    { value: "high_caries_risk", label: "Alto riesgo de caries" },
    { value: "xerostomia", label: "Xerostomía / boca seca" },
    { value: "sleep_apnea", label: "Apnea del sueño" },
    { value: "smoker", label: "Tabaco" },
    { value: "alcohol", label: "Alcohol relevante" },
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
