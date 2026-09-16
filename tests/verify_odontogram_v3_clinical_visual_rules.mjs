import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  bridgeConnectorSpansForArc,
  createOdontogramEntity,
  defaultDb,
  ensureOdontogram,
  FDI_LOWER,
  odontogramEntitiesForPatient,
  setToothLegendState,
} from '../apps/legacy-preview/logic.js';

const db = defaultDb();
db.patients.push({ id: 1, first_name: 'Ana', last_name: 'Reglas', archived: false });

setToothLegendState(db, 1, '36', 'caries', 'O');
assert.throws(
  () => setToothLegendState(db, 1, '36', 'implant_indicated'),
  /caries activa/i,
  'no se puede marcar implante en un diente con caries activa',
);
assert.throws(
  () =>
    createOdontogramEntity(db, 1, {
      type: 'implant_restoration',
      status: 'planned',
      teeth: ['36'],
      components: [
        { role: 'implant', tooth: '36', status: 'planned' },
        { role: 'abutment', tooth: '36', status: 'planned' },
        { role: 'crown', tooth: '36', status: 'planned' },
      ],
    }),
  /caries activa/i,
  'la entidad V3 de implante tambien respeta la incompatibilidad clinica',
);
assert.equal(odontogramEntitiesForPatient(db, 1, { type: 'implant_restoration' }).length, 0);

const db2 = defaultDb();
db2.patients.push({ id: 2, first_name: 'Luis', last_name: 'Implante', archived: false });
setToothLegendState(db2, 2, '46', 'implant');
assert.throws(
  () => setToothLegendState(db2, 2, '46', 'caries', 'O'),
  /implante registrado/i,
  'no se puede anadir caries activa sobre un diente ya marcado como implante',
);
assert.equal(Object.values(ensureOdontogram(db2, 2)['46'].surfaces).includes('caries'), false);

const bridgeDb = defaultDb();
bridgeDb.patients.push({ id: 3, first_name: 'Eva', last_name: 'Puente', archived: false });
const bridge = createOdontogramEntity(bridgeDb, 3, {
  type: 'bridge',
  status: 'planned',
  teeth: ['35', '36', '37'],
  components: [
    { role: 'abutment', tooth: '35', status: 'planned' },
    { role: 'pontic', tooth: '36', status: 'planned' },
    { role: 'abutment', tooth: '37', status: 'planned' },
  ],
});
const spans = bridgeConnectorSpansForArc(odontogramEntitiesForPatient(bridgeDb, 3), FDI_LOWER);
assert.deepEqual(spans, [
  { id: bridge.id, startColumn: 14, endColumn: 17, teeth: ['35', '36', '37'], pontics: ['36'], status: 'planned' },
]);

const app = readFileSync('apps/legacy-preview/app.js', 'utf8');
const css = readFileSync('apps/legacy-preview/styles/styles.css', 'utf8');

for (const token of [
  'renderBridgeConnectors',
  'data-bridge-span',
  'odonto-bridge-connector',
  'removable-root-ghost',
]) {
  assert.ok(app.includes(token), `falta token visual ${token}`);
}

for (const selector of ['.odonto-bridge-connector', '.removable-root-ghost']) {
  assert.ok(css.includes(selector), `falta estilo ${selector}`);
}

console.log('verify_odontogram_v3_clinical_visual_rules: OK');
