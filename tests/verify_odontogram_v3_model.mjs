import assert from 'node:assert/strict';
import {
  defaultDb,
  migrateDb,
  ensureOdontogram,
  ensureOdontogramV3,
  createOdontogramEntity,
  updateOdontogramEntity,
  deactivateOdontogramEntity,
  odontogramEntitiesForPatient,
  syncLegacyOdontogramFromEntities,
  toothWholeStates
} from '../apps/legacy-preview/logic.js';

const db = migrateDb(defaultDb());
db.patients.push({ id: 1, first_name: 'Ana', last_name: 'Puente', archived: false });

assert.ok(db.odontogramEntities && typeof db.odontogramEntities === 'object', 'migration creates odontogramEntities');
assert.ok(db.odontogramSnapshots && typeof db.odontogramSnapshots === 'object', 'migration creates odontogramSnapshots');
assert.deepEqual(ensureOdontogramV3(db, 1), []);

const bridge = createOdontogramEntity(db, 1, {
  type: 'bridge',
  status: 'planned',
  teeth: ['13', '14', '15', '16'],
  components: [
    { tooth: '13', role: 'abutment', status: 'planned' },
    { tooth: '14', role: 'pontic', status: 'planned' },
    { tooth: '15', role: 'pontic', status: 'planned' },
    { tooth: '16', role: 'abutment', status: 'planned' }
  ],
  metadata: { material: 'zirconio' },
  source: 'test'
});

assert.equal(bridge.type, 'bridge');
assert.equal(bridge.teeth.join(','), '13,14,15,16');
assert.equal(bridge.components.filter(x => x.role === 'abutment').length, 2);
assert.equal(odontogramEntitiesForPatient(db, 1, { type: 'bridge' }).length, 1);

const updated = updateOdontogramEntity(db, 1, bridge.id, { status: 'active', metadata: { material: 'metal-ceramica' } });
assert.equal(updated.status, 'active');
assert.equal(updated.metadata.material, 'metal-ceramica');

syncLegacyOdontogramFromEntities(db, 1);
const od = ensureOdontogram(db, 1);
for (const tooth of ['13', '14', '15', '16']) {
  assert.ok(toothWholeStates(od[tooth]).includes('prosthesis'), `tooth ${tooth} has legacy prosthesis`);
}

const inactive = deactivateOdontogramEntity(db, 1, bridge.id, 'duplicated');
assert.equal(inactive.active, false);
assert.equal(inactive.deactivated_reason, 'duplicated');
assert.equal(odontogramEntitiesForPatient(db, 1).length, 0);

console.log('verify_odontogram_v3_model: OK');
