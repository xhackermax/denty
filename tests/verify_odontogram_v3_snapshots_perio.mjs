import assert from 'node:assert/strict';
import {
  defaultDb,
  ensureOdontogram,
  setToothLegendState,
  createOdontogramSnapshot,
  compareOdontogramSnapshots,
  periodontalVisualSummary
} from '../apps/legacy-preview/logic.js';

const db = defaultDb();
db.patients.push({ id: 1, first_name: 'Ana', last_name: 'Perio', archived: false });
const od = ensureOdontogram(db, 1);
od['36'].periodontal.depths.mv = '6';
od['36'].periodontal.depths.v = '5';
od['36'].periodontal.bleeding.mv = true;
od['36'].periodontal.plaque.v = true;

const baseline = createOdontogramSnapshot(db, 1, 'baseline');
setToothLegendState(db, 1, '36', 'crown_pending');
const after = createOdontogramSnapshot(db, 1, 'review');
const diff = compareOdontogramSnapshots(baseline, after);

assert.ok(diff.changedTeeth.includes('36'));
assert.ok(diff.addedStates.some(x => x.tooth === '36' && x.code === 'crown_pending'));

const summary = periodontalVisualSummary(db, 1);
assert.equal(summary.max_depth, 6);
assert.ok(summary.bleeding_percent > 0);
assert.ok(summary.plaque_percent > 0);
assert.equal(summary.severity, 'severe');

console.log('verify_odontogram_v3_snapshots_perio: OK');
