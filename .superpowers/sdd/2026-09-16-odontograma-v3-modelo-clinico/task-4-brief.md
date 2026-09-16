### Task 4: Snapshots And Periodontal Visual Summary

**Files:**
- Modify: `apps/legacy-preview/logic.js`
- Test: `tests/verify_odontogram_v3_snapshots_perio.mjs`

**Interfaces:**
- Consumes: `ensureOdontogram`, `ensureOdontogramV3`, `setToothLegendState`.
- Produces:
  - `createOdontogramSnapshot(db, patientId, label='review') -> object`
  - `compareOdontogramSnapshots(before, after) -> object`
  - `periodontalVisualSummary(db, patientId) -> object`

- [ ] **Step 1: Write the failing test**

Create `tests/verify_odontogram_v3_snapshots_perio.mjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests\verify_odontogram_v3_snapshots_perio.mjs`

Expected: FAIL because snapshot and summary exports do not exist.

- [ ] **Step 3: Implement snapshots**

Add in `logic.js`:

```js
function patientSnapshotBucket(db, patientId){
  if(!db.odontogramSnapshots || typeof db.odontogramSnapshots!=='object' || Array.isArray(db.odontogramSnapshots)) db.odontogramSnapshots={};
  const key=String(Number(patientId)||patientId||'demo');
  if(!Array.isArray(db.odontogramSnapshots[key])) db.odontogramSnapshots[key]=[];
  return db.odontogramSnapshots[key];
}
function compactOdontogramState(db, patientId){
  const od=ensureOdontogram(db, patientId), out={};
  for(const tooth of FDI_ALL){
    out[tooth]={whole_states:toothWholeStates(od[tooth]),surfaces:{...(od[tooth].surfaces||{})},periodontal:clone(od[tooth].periodontal||{})};
  }
  return out;
}
export function createOdontogramSnapshot(db, patientId, label='review'){
  const snap={id:id(db),snapshot_id:`snap-${Date.now()}-${Math.random().toString(16).slice(2)}`,patient_id:Number(patientId)||patientId,label,captured_at:new Date().toISOString(),odontogram:compactOdontogramState(db, patientId),entities:clone(odontogramEntitiesForPatient(db, patientId)),clinicalPlanItemIds:(db.clinicalPlanItems||[]).filter(x=>Number(x.patient_id)===Number(patientId)&&x.active!==false).map(x=>x.id)};
  patientSnapshotBucket(db, patientId).push(snap);
  return snap;
}
export function compareOdontogramSnapshots(before, after){
  const changedTeeth=[], addedStates=[], removedStates=[], changedSurfaces=[];
  const teeth=[...new Set([...Object.keys(before?.odontogram||{}),...Object.keys(after?.odontogram||{})])];
  for(const tooth of teeth){
    const b=before.odontogram?.[tooth]||{}, a=after.odontogram?.[tooth]||{};
    const bs=new Set(b.whole_states||[]), as=new Set(a.whole_states||[]);
    for(const code of as) if(!bs.has(code)) addedStates.push({tooth,code});
    for(const code of bs) if(!as.has(code)) removedStates.push({tooth,code});
    const surfaceKeys=[...new Set([...Object.keys(b.surfaces||{}),...Object.keys(a.surfaces||{})])];
    for(const surface of surfaceKeys) if((b.surfaces||{})[surface] !== (a.surfaces||{})[surface]) changedSurfaces.push({tooth,surface,before:(b.surfaces||{})[surface]||'',after:(a.surfaces||{})[surface]||''});
    if(addedStates.some(x=>x.tooth===tooth)||removedStates.some(x=>x.tooth===tooth)||changedSurfaces.some(x=>x.tooth===tooth)) changedTeeth.push(tooth);
  }
  return {changedTeeth:[...new Set(changedTeeth)],addedStates,removedStates,changedSurfaces,entityDelta:{before:before.entities?.length||0,after:after.entities?.length||0}};
}
```

- [ ] **Step 4: Implement periodontal visual summary**

Add:

```js
export function periodontalVisualSummary(db, patientId){
  const od=ensureOdontogram(db, patientId);
  let max=0,totalSites=0,bleeding=0,plaque=0,suppuration=0;
  for(const tooth of FDI_ALL){
    const p=od[tooth]?.periodontal||{};
    for(const site of PERIO_SITES){
      const depth=Number(p.depths?.[site]||0);
      if(depth>max) max=depth;
      totalSites++;
      if(p.bleeding?.[site]) bleeding++;
      if(p.plaque?.[site]) plaque++;
      if(p.suppuration?.[site]) suppuration++;
    }
  }
  const bleeding_percent=totalSites?Math.round(bleeding/totalSites*100):0;
  const plaque_percent=totalSites?Math.round(plaque/totalSites*100):0;
  const severity=max>=6||suppuration?'severe':max>=5||bleeding_percent>=25?'moderate':max>=4?'mild':'stable';
  return {max_depth:max,bleeding_percent,plaque_percent,suppuration_sites:suppuration,severity};
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests\verify_odontogram_v3_snapshots_perio.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/legacy-preview/logic.js tests/verify_odontogram_v3_snapshots_perio.mjs
git commit -m "Add odontogram snapshots and periodontal summary"
```


