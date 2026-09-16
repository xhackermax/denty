import assert from 'node:assert/strict';
import {
  defaultDb,
  createOdontogramEntity,
  odontogramEntityToClinicalItems,
  clinicalPlanGraph
} from '../apps/legacy-preview/logic.js';

const db = defaultDb();
db.patients.push({ id: 1, first_name: 'Ana', last_name: 'Implante', archived: false });

const implant = createOdontogramEntity(db, 1, {
  type: 'implant_restoration',
  status: 'planned',
  teeth: ['36'],
  components: [
    { role: 'implant', tooth: '36', status: 'planned' },
    { role: 'abutment', tooth: '36', status: 'planned' },
    { role: 'crown', tooth: '36', status: 'planned' }
  ],
  metadata: { system: 'preview' }
});

const items = odontogramEntityToClinicalItems(db, 1, implant.id);
assert.equal(items.length, 3);
assert.equal(items[0].treatment, 'implante');
assert.equal(items[1].treatment, 'pilar sobre implante');
assert.equal(items[2].treatment, 'corona sobre implante');
assert.deepEqual(items[1].depends_on, [items[0].id]);
assert.deepEqual(items[2].depends_on, [items[1].id]);

const graph = clinicalPlanGraph(db, 1);
assert.equal(graph.items[0].id, items[0].id);
assert.equal(graph.items.at(-1).id, items[2].id);

const bridge = createOdontogramEntity(db, 1, {
  type: 'bridge',
  status: 'planned',
  teeth: ['13', '14', '15'],
  components: [
    { role: 'abutment', tooth: '13' },
    { role: 'pontic', tooth: '14' },
    { role: 'abutment', tooth: '15' }
  ]
});
const bridgeItems = odontogramEntityToClinicalItems(db, 1, bridge.id);
assert.ok(bridgeItems.some(x => x.treatment === 'puente fijo'));
assert.ok(bridgeItems.some(x => x.title.includes('pilares')));

console.log('verify_odontogram_v3_clinical_plan: OK');
