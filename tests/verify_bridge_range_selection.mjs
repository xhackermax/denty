import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  bridgeTeethFromEndpoints,
  createBridgeFromEndpoints,
  defaultDb,
  ensureOdontogram,
  odontogramEntitiesForPatient,
  prostheticConnectorSpansForArc,
  setToothLegendState,
  syncLegacyOdontogramFromEntities,
  toothWholeStates,
  FDI_LOWER,
  FDI_UPPER,
} from '../apps/legacy-preview/logic.js';

assert.deepEqual(
  bridgeTeethFromEndpoints('34', '36'),
  ['34', '35', '36'],
  'seleccionar inicio 34 y final 36 debe incluir automáticamente 35',
);
assert.deepEqual(
  bridgeTeethFromEndpoints('36', '34'),
  ['36', '35', '34'],
  'el puente debe poder seleccionarse en cualquiera de las dos direcciones',
);
assert.throws(
  () => bridgeTeethFromEndpoints('14', '34'),
  /misma arcada/i,
  'no se puede crear un puente cruzando maxilar y mandibula',
);

// Puente sobre implantes con póntico intermedio.
const implantDb = defaultDb();
implantDb.patients.push({ id: 501, first_name: 'Iris', last_name: 'Implantes', archived: false });
setToothLegendState(implantDb, 501, '34', 'implant');
setToothLegendState(implantDb, 501, '35', 'missing');
setToothLegendState(implantDb, 501, '36', 'implant');
const implantBridge = createBridgeFromEndpoints(implantDb, 501, '34', '36', { status: 'planned', source: 'test' });
assert.deepEqual(implantBridge.teeth, ['34', '35', '36']);
assert.deepEqual(
  implantBridge.components.map(({ tooth, role }) => ({ tooth, role })),
  [
    { tooth: '34', role: 'abutment' },
    { tooth: '35', role: 'pontic' },
    { tooth: '36', role: 'abutment' },
  ],
  'los extremos implantarios son pilares y el ausente intermedio es póntico',
);
syncLegacyOdontogramFromEntities(implantDb, 501);
const implantOd = ensureOdontogram(implantDb, 501);
assert.ok(toothWholeStates(implantOd['34']).includes('implant'));
assert.ok(toothWholeStates(implantOd['36']).includes('implant'));
assert.ok(toothWholeStates(implantOd['35']).includes('prosthesis_pending'));
const implantSpan = prostheticConnectorSpansForArc(
  odontogramEntitiesForPatient(implantDb, 501),
  implantOd,
  FDI_LOWER,
).find(x => x.id === implantBridge.id);
assert.ok(implantSpan, 'el puente implantosoportado debe producir un tramo visual');
assert.deepEqual(implantSpan.teeth, ['34', '35', '36']);
assert.equal(implantSpan.support, 'implant');
assert.deepEqual(implantSpan.pontics, ['35']);

// Mismo flujo para puente sobre dientes naturales.
const naturalDb = defaultDb();
naturalDb.patients.push({ id: 502, first_name: 'Nora', last_name: 'Natural', archived: false });
setToothLegendState(naturalDb, 502, '15', 'missing');
const naturalBridge = createBridgeFromEndpoints(naturalDb, 502, '14', '16', { status: 'active', source: 'test' });
assert.deepEqual(naturalBridge.teeth, ['14', '15', '16']);
assert.deepEqual(
  naturalBridge.components.map(({ tooth, role }) => ({ tooth, role })),
  [
    { tooth: '14', role: 'abutment' },
    { tooth: '15', role: 'pontic' },
    { tooth: '16', role: 'abutment' },
  ],
);
syncLegacyOdontogramFromEntities(naturalDb, 502);
const naturalOd = ensureOdontogram(naturalDb, 502);
const naturalSpan = prostheticConnectorSpansForArc(
  odontogramEntitiesForPatient(naturalDb, 502),
  naturalOd,
  FDI_UPPER,
).find(x => x.id === naturalBridge.id);
assert.ok(naturalSpan);
assert.equal(naturalSpan.support, 'tooth');
assert.deepEqual(naturalSpan.pontics, ['15']);

// Un diente intermedio presente puede actuar como pilar adicional.
const multiSupportDb = defaultDb();
multiSupportDb.patients.push({ id: 503, first_name: 'Tres', last_name: 'Pilares', archived: false });
const multiSupport = createBridgeFromEndpoints(multiSupportDb, 503, '14', '16', { status: 'planned' });
assert.deepEqual(multiSupport.components.map(c => c.role), ['abutment', 'abutment', 'abutment']);

const app = readFileSync('apps/legacy-preview/app.js', 'utf8');
for (const token of [
  'odontoBridgeSelection',
  'createBridgeFromEndpoints',
  'Selecciona el inicio del puente',
  'Selecciona el final del puente',
]) {
  assert.ok(app.includes(token), `falta interacción por rango: ${token}`);
}
assert.ok(!app.includes("prompt('Dientes del puente separados por coma'"), 'el puente ya no debe pedir una lista manual de dientes');

console.log('verify_bridge_range_selection: OK');
