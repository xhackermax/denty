import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('apps/legacy-preview/app.js', 'utf8');

assert.match(app, /id="patientFileInput"/, 'la pestaña Archivos debe tener un input real de archivos');
assert.match(app, /type="file"/, 'el input de Archivos debe ser de tipo file');
assert.match(app, /accept="[^"]*(image\/\*)[^"]*(application\/pdf)[^"]*"/, 'debe aceptar fotografias/imagenes y PDF');
assert.match(app, /\.dcm|dicom|cbct/i, 'debe contemplar radiografias, DICOM o CBCT');
assert.match(app, /async function importPatientFiles/, 'debe existir un flujo de importacion de archivos');
assert.match(app, /data_url/, 'debe guardar una vista/archivo local en la preview');
assert.match(app, /original_name/, 'debe conservar el nombre original del archivo');
assert.match(app, /category/, 'debe guardar categoria clinica del archivo');
assert.match(app, /patientFileCategory/, 'debe permitir elegir categoria antes de importar');

console.log('verify_patient_files_upload: OK');
