import fs from 'node:fs';

const source = fs.readFileSync('src/features/patients/patient-admission.ts', 'utf8');
const block = source.match(/export interface PatientMedicalProfile\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
if (!block) throw new Error('PatientMedicalProfile interface not found');
for (const field of ['allergies', 'medications', 'conditions', 'dentalRisks']) {
  const readonlyPattern = new RegExp(`${field}\\s*:\\s*readonly\\s+string\\[\\]`);
  if (readonlyPattern.test(block)) {
    throw new Error(`${field} must be mutable string[] so it is assignable to UpdatePatient.medicalProfile`);
  }
}
console.log('Medical history build contract regression OK');
