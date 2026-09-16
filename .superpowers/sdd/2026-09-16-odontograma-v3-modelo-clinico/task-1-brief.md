### Task 1: V3 Migration And Entity Core

**Files:**
- Modify: `apps/legacy-preview/logic.js`
- Test: `tests/verify_odontogram_v3_model.mjs`

**Interfaces:**
- Consumes: existing `defaultDb`, `migrateDb`, `ensureOdontogram`, `setToothLegendState`, `id`, `today`, `normalizeText`.
- Produces:
  - `ensureOdontogramV3(db, patientId) -> Array<object>`
  - `odontogramEntitiesForPatient(db, patientId, filters={}) -> Array<object>`
  - `createOdontogramEntity(db, patientId, input) -> object`
  - `updateOdontogramEntity(db, patientId, entityId, patch) -> object`
  - `deactivateOdontogramEntity(db, patientId, entityId, reason='') -> object`
  - `syncLegacyOdontogramFromEntities(db, patientId) -> object`

- [ ] **Step 1: Write the failing test**

Create `tests/verify_odontogram_v3_model.mjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests\verify_odontogram_v3_model.mjs`

Expected: FAIL because V3 exports do not exist.

- [ ] **Step 3: Implement migration fields**

In `defaultDb`, add:

```js
odontogramEntities: {},
odontogramSnapshots: {},
```

In `migrateDb`, normalize:

```js
db.odontogramEntities = current.odontogramEntities && typeof current.odontogramEntities === 'object' && !Array.isArray(current.odontogramEntities) ? current.odontogramEntities : {};
db.odontogramSnapshots = current.odontogramSnapshots && typeof current.odontogramSnapshots === 'object' && !Array.isArray(current.odontogramSnapshots) ? current.odontogramSnapshots : {};
```

Do not add these object maps to the array id scan. IDs for entities should be allocated through `id(db)` at creation time.

- [ ] **Step 4: Implement core helpers**

Add after existing odontogram helpers in `logic.js`:

```js
const ODONTO_ENTITY_TYPES = new Set(['bridge','implant_restoration','removable_prosthesis','orthodontics','pediatric','periodontal_chart','snapshot']);
const ODONTO_ENTITY_STATUS = new Set(['planned','provisional','active','review','failed','completed','surgery_done','uncovered','restored','delivered','adjustment','repair','try_in','retention','paused','monitor','baseline','active_disease','maintenance','stable']);

function normalizeTeeth(input){
  return [...new Set([...(Array.isArray(input)?input:String(input||'').split(/[,\s-]+/))].map(String).map(x=>x.trim()).filter(Boolean))];
}
function normalizeComponents(input){
  return Array.isArray(input) ? input.map(c=>({ ...c, tooth:c.tooth!=null?String(c.tooth):'', role:String(c.role||c.type||'component'), status:String(c.status||'planned') })) : [];
}
function patientEntityBucket(db, patientId){
  if(!db.odontogramEntities || typeof db.odontogramEntities!=='object' || Array.isArray(db.odontogramEntities)) db.odontogramEntities = {};
  const key=String(Number(patientId)||patientId||'demo');
  if(!Array.isArray(db.odontogramEntities[key])) db.odontogramEntities[key]=[];
  return db.odontogramEntities[key];
}
export function ensureOdontogramV3(db, patientId){ return patientEntityBucket(db, patientId); }
export function odontogramEntitiesForPatient(db, patientId, filters={}){
  return patientEntityBucket(db, patientId).filter(e=>e.active!==false).filter(e=>!filters.type || e.type===filters.type);
}
export function createOdontogramEntity(db, patientId, input={}){
  const type=String(input.type||'').trim();
  if(!ODONTO_ENTITY_TYPES.has(type)) throw new Error('Tipo de entidad odontologica no valido');
  const teeth=normalizeTeeth(input.teeth);
  if(!teeth.length && !['removable_prosthesis','orthodontics','periodontal_chart'].includes(type)) throw new Error('Faltan dientes o zona');
  if(type==='bridge'){
    const abutments=normalizeComponents(input.components).filter(c=>c.role==='abutment');
    if(teeth.length<2) throw new Error('Un puente necesita al menos dos dientes');
    if(!abutments.length) throw new Error('Un puente necesita al menos un pilar');
  }
  const now=new Date().toISOString();
  const entity={id:id(db),patient_id:Number(patientId)||patientId,type,status:ODONTO_ENTITY_STATUS.has(input.status)?input.status:'planned',teeth,arch:input.arch||'',components:normalizeComponents(input.components),metadata:{...(input.metadata||{})},source:input.source||'odontogram_v3',active:input.active!==false,created_at:now,updated_at:now};
  patientEntityBucket(db, patientId).push(entity);
  return entity;
}
export function updateOdontogramEntity(db, patientId, entityId, patch={}){
  const entity=patientEntityBucket(db, patientId).find(e=>Number(e.id)===Number(entityId));
  if(!entity) throw new Error('Entidad odontologica no encontrada');
  if(patch.teeth) entity.teeth=normalizeTeeth(patch.teeth);
  if(patch.components) entity.components=normalizeComponents(patch.components);
  if(patch.status) entity.status=String(patch.status);
  if(patch.arch!=null) entity.arch=String(patch.arch);
  if(patch.metadata) entity.metadata={...(entity.metadata||{}),...(patch.metadata||{})};
  entity.updated_at=new Date().toISOString();
  return entity;
}
export function deactivateOdontogramEntity(db, patientId, entityId, reason=''){
  const entity=patientEntityBucket(db, patientId).find(e=>Number(e.id)===Number(entityId));
  if(!entity) throw new Error('Entidad odontologica no encontrada');
  entity.active=false; entity.deactivated_at=new Date().toISOString(); entity.deactivated_reason=reason; entity.updated_at=entity.deactivated_at;
  return entity;
}
function legacyCodeForEntity(entity){
  if(entity.type==='bridge') return entity.status==='planned'?'prosthesis_pending':entity.status==='review'||entity.status==='failed'?'prosthesis_bad':'prosthesis';
  if(entity.type==='implant_restoration') return entity.status==='planned'?'implant_indicated':entity.status==='review'||entity.status==='failed'?'implant_review':'implant';
  if(entity.type==='removable_prosthesis') return entity.status==='planned'?'removable_pending':entity.status==='repair'||entity.status==='failed'?'removable_bad':'removable';
  if(entity.type==='orthodontics') return 'prosthesis_pending';
  if(entity.type==='pediatric') return entity.status==='completed'?'healthy':'filling_pending';
  return '';
}
export function syncLegacyOdontogramFromEntities(db, patientId){
  const od=ensureOdontogram(db, patientId);
  for(const entity of odontogramEntitiesForPatient(db, patientId)){
    const code=legacyCodeForEntity(entity);
    if(!code) continue;
    for(const tooth of entity.teeth||[]) if(od[String(tooth)]) setToothLegendState(db, patientId, String(tooth), code);
  }
  return od;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests\verify_odontogram_v3_model.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/legacy-preview/logic.js tests/verify_odontogram_v3_model.mjs
git commit -m "Add odontogram v3 entity core"
```


