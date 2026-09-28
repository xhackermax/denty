import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createPatientPayload,
  parsePatientCsv,
  parsePatientJson,
  parsePatientXlsx,
  validatePatientImportRows,
} from '../src/features/patients/patient-import.ts';

const csv = parsePatientCsv('Ficha;Nombre;Apellidos;DNI;Fecha nacimiento\n0012;Luis;Pérez;;01/02/1980');
assert.deepEqual(csv, [{ firstName: 'Luis', lastName: 'Pérez', birthDate: '1980-02-01', legacyRecordNumber: '0012' }]);

const json = parsePatientJson(JSON.stringify([{ recordNumber: '0013', firstName: 'Marta', lastName: 'Sanz', birthDate: '1985-05-12' }]));
assert.equal(json[0]?.legacyRecordNumber, '0013');
assert.equal(json[0]?.birthDate, '1985-05-12');

const file = await readFile(new URL('../src/test/fixtures/patients-import-stage4.xlsx', import.meta.url));
const xlsx = await parsePatientXlsx(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
assert.equal(xlsx.length, 2);
assert.deepEqual(xlsx[0], {
  firstName: 'Ana',
  lastName: 'Ruiz',
  email: 'ana@example.test',
  birthDate: '1994-09-23',
  legacyRecordNumber: '0042',
});
assert.deepEqual(validatePatientImportRows(xlsx), []);
assert.deepEqual(createPatientPayload(xlsx[0]), {
  firstName: 'Ana',
  lastName: 'Ruiz',
  recordNumber: '0042',
  email: 'ana@example.test',
  birthDate: '1994-09-23',
  declaredSource: 'OTHER',
  declaredSourceDetail: 'Importación de pacientes',
});

const duplicateIssues = validatePatientImportRows([
  { firstName: 'A', lastName: 'Uno', legacyRecordNumber: '77' },
  { firstName: 'B', lastName: 'Dos', legacyRecordNumber: '77' },
]);
assert.equal(duplicateIssues.length, 1);
assert.equal(duplicateIssues[0]?.field, 'recordNumber');

console.log('stage4-import-runtime: ok');
