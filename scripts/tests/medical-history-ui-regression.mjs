import fs from "node:fs";

const profile = fs.readFileSync("src/features/patients/patient-profile.tsx", "utf8");
const history = fs.existsSync("src/features/patients/patient-medical-history.tsx")
  ? fs.readFileSync("src/features/patients/patient-medical-history.tsx", "utf8")
  : "";
const admission = fs.readFileSync("src/features/patients/patient-admission.ts", "utf8");
const contracts = fs.readFileSync("src/shared/api/contracts.ts", "utf8");

const failures = [];
if (!profile.includes("PatientMedicalHistory")) failures.push("patient profile must render PatientMedicalHistory");
if (!history.includes("Historia médica")) failures.push("medical history section title is missing");
for (const label of ["Alergias", "Medicación habitual", "Enfermedades y condiciones", "Riesgos odontológicos"]) {
  if (!history.includes(label)) failures.push(`medical history editor is missing ${label}`);
}
if (!history.includes("TagsInput")) failures.push("medical history must allow custom free-text entries");
for (const token of [
  "macrolides",
  "clindamycin",
  "anticoagulants",
  "bisphosphonates",
  "glp1_meds",
  "thyroid_meds",
  "diabetes_type_1",
  "diabetes_type_2",
  "pregnancy",
  "breastfeeding",
  "thyroid_disease",
]) {
  if (!admission.includes(`value: "${token}"`)) failures.push(`Spain anamnesis catalog missing ${token}`);
}
if (!contracts.includes("medicalProfile: medicalProfileSchema.optional()")) {
  failures.push("patient response schema must preserve medicalProfile");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("medical-history-ui-regression: ok");
