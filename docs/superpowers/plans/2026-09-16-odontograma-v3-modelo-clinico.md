# Odontograma V3 Modelo Clinico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Odontograma V3 as a shared clinical entity model for visual odontogram, voice commands and clinical plan.

**Architecture:** Add a compatible V3 entity layer in `apps/legacy-preview/logic.js` without removing legacy `whole_states`, `surfaces` or periodontal data. Voice and clinical planning consume the same V3 helper functions. The UI exposes V3 controls and summaries while existing restorative and periodontal views continue to work.

**Tech Stack:** Vanilla JavaScript legacy preview, localStorage persistence, Node ESM assertion tests, Next static wrapper.

**Spec:** `docs/superpowers/specs/2026-09-16-odontograma-v3-modelo-clinico-design.md`

## Global Constraints

- Do not remove or invalidate existing `whole_states`, `surfaces`, periodontal or position data.
- V3 entities are stored under `db.odontogramEntities[patientId]`.
- Snapshots are stored under `db.odontogramSnapshots[patientId]`.
- Voice and clinical plan must use V3 helpers for complex entities, not parallel custom shapes.
- Every new behavior must have a failing test before implementation.
- After changes to legacy preview runtime, run `node apps/legacy-preview/build-static-bundle.mjs` and `pnpm --filter @denty/web sync:legacy`.
- The final build must pass `pnpm --filter @denty/web build`.

---

## File Structure

- `apps/legacy-preview/logic.js`: V3 model, migration, entity CRUD, legacy sync, snapshots, periodontal summary and clinical item generation.
- `apps/legacy-preview/voice-router.js`: parse and execute complex odontogram entity voice commands.
- `apps/legacy-preview/app.js`: visible Odontograma V3 controls, entity summary cards, snapshots and quick creation modals.
- `apps/legacy-preview/styles/styles.css`: compact styling for entity badges, bridge bars, component chips, removable/ortho bands, periodontal summary and snapshot diff cards.
- `apps/legacy-preview/denty-app.bundle.js`: generated bundle.
- `apps/web/public/denty-app.bundle.js`: synced generated bundle.
- `apps/web/public/styles/styles.css`: synced styles.
- `apps/web/src/lib/legacy-shell.ts`: synced legacy shell if changed by sync script.
- `docs/ODONTOGRAMA-V3.md`: user-facing technical documentation.
- `tests/verify_odontogram_v3_model.mjs`: migration, CRUD and legacy sync.
- `tests/verify_odontogram_v3_clinical_plan.mjs`: clinical item generation from entities.
- `tests/verify_odontogram_v3_voice.mjs`: voice parse/execute for complex entities.
- `tests/verify_odontogram_v3_snapshots_perio.mjs`: snapshots, before/after diff and periodontal visual summary.
- `tests/verify_odontogram_v3_ui.mjs`: UI tokens/styles are present.

---

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

### Task 2: Entity To Clinical Plan Integration

**Files:**
- Modify: `apps/legacy-preview/logic.js`
- Test: `tests/verify_odontogram_v3_clinical_plan.mjs`

**Interfaces:**
- Consumes: `createOdontogramEntity`, existing `createClinicalPlanItem`, `clinicalPlanGraph`.
- Produces:
  - `odontogramEntityToClinicalItems(db, patientId, entityId) -> Array<object>`

- [ ] **Step 1: Write the failing test**

Create `tests/verify_odontogram_v3_clinical_plan.mjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests\verify_odontogram_v3_clinical_plan.mjs`

Expected: FAIL because `odontogramEntityToClinicalItems` does not exist.

- [ ] **Step 3: Extend clinical treatment canonicalization**

In `canonicalClinicalTreatment`, add before the generic implant/prosthesis checks:

```js
if(/pilar.*implante|abutment/.test(n)) return 'pilar sobre implante';
```

In `procedureMatchForClinical`, add:

```js
if(t==='pilar sobre implante') return by('pilar directo a implante','pilar');
```

In `clinicalDependencyExplanation`, add:

```js
if(a==='implante'&&b==='pilar sobre implante') return 'El pilar se coloca despues del implante y de la fase clinica indicada.';
if(a==='pilar sobre implante'&&b==='corona sobre implante') return 'La corona sobre implante se coloca despues del pilar protesico.';
```

- [ ] **Step 4: Implement entity to clinical items**

Add after `createClinicalPlanItem` or near entity helpers:

```js
function entityClinicalSourceKey(entity, suffix){ return `odontogram_entity:${entity.id}:${suffix}`; }
function createEntityPlanItem(db, entity, input, previous=null){
  return createClinicalPlanItem(db,{patient_id:entity.patient_id,tooth:(input.tooth||entity.teeth?.[0]||''),treatment:input.treatment,title:input.title,source:'odontogram_entity',source_key:entityClinicalSourceKey(entity,input.key),depends_on:previous?[previous.id]:[],duration:input.duration||40,visits:input.visits||1,clinician_note:input.note||''});
}
export function odontogramEntityToClinicalItems(db, patientId, entityId){
  const entity=patientEntityBucket(db, patientId).find(e=>Number(e.id)===Number(entityId)&&e.active!==false);
  if(!entity) throw new Error('Entidad odontologica no encontrada');
  const out=[];
  let previous=null;
  if(entity.type==='implant_restoration'){
    const specs=[
      {key:'implant',treatment:'implante',title:`Implante ${entity.teeth.join(', ')}`,duration:50},
      {key:'abutment',treatment:'pilar sobre implante',title:`Pilar sobre implante ${entity.teeth.join(', ')}`,duration:25},
      {key:'crown',treatment:'corona sobre implante',title:`Corona sobre implante ${entity.teeth.join(', ')}`,duration:40}
    ];
    for(const spec of specs){ previous=createEntityPlanItem(db,entity,spec,previous); out.push(previous); }
  }else if(entity.type==='bridge'){
    const abutments=(entity.components||[]).filter(c=>c.role==='abutment').map(c=>c.tooth).filter(Boolean);
    const pontics=(entity.components||[]).filter(c=>c.role==='pontic').map(c=>c.tooth).filter(Boolean);
    out.push(createEntityPlanItem(db,entity,{key:'bridge-prep',treatment:'puente fijo',title:`Preparacion de pilares ${abutments.join(', ')}`,duration:60,note:`Ponticos: ${pontics.join(', ')}`}));
    out.push(createEntityPlanItem(db,entity,{key:'bridge-seat',treatment:'puente fijo',title:`Cementado de puente ${entity.teeth.join('-')}`,duration:45},out.at(-1)));
  }else if(entity.type==='removable_prosthesis'){
    out.push(createEntityPlanItem(db,entity,{key:'removable-records',treatment:'protesis removible',title:`Registros protesis removible ${entity.arch||'arco'}`,duration:40}));
    out.push(createEntityPlanItem(db,entity,{key:'removable-delivery',treatment:'protesis removible',title:`Entrega protesis removible ${entity.arch||'arco'}`,duration:40},out.at(-1)));
  }else if(entity.type==='orthodontics'){
    out.push(createEntityPlanItem(db,entity,{key:'orthodontics-start',treatment:'ortodoncia',title:`Inicio ortodoncia ${entity.arch||'ambos arcos'}`,duration:50}));
  }else if(entity.type==='pediatric'){
    out.push(createEntityPlanItem(db,entity,{key:'pediatric-care',treatment:entity.metadata?.treatment||'odontopediatria',title:entity.metadata?.title||`Tratamiento odontopediatrico ${entity.teeth.join(', ')}`,duration:35}));
  }else if(entity.type==='periodontal_chart'){
    out.push(createEntityPlanItem(db,entity,{key:'periodontal-control',treatment:'tratamiento periodontal',title:'Control periodontal',duration:45}));
  }
  return out;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests\verify_odontogram_v3_clinical_plan.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/legacy-preview/logic.js tests/verify_odontogram_v3_clinical_plan.mjs
git commit -m "Connect odontogram v3 entities to clinical plan"
```

### Task 3: Voice Commands Create V3 Entities

**Files:**
- Modify: `apps/legacy-preview/voice-router.js`
- Test: `tests/verify_odontogram_v3_voice.mjs`

**Interfaces:**
- Consumes: `createOdontogramEntity`, `syncLegacyOdontogramFromEntities`, `odontogramEntityToClinicalItems`.
- Produces:
  - New voice intent `odontogram.entity.create`.
  - Complex entity parsing for bridge, implant restoration, removable prosthesis, orthodontics and pediatric.

- [ ] **Step 1: Write the failing test**

Create `tests/verify_odontogram_v3_voice.mjs`:

```js
import assert from 'node:assert/strict';
import { defaultDb, odontogramEntitiesForPatient } from '../apps/legacy-preview/logic.js';
import { parseVoiceCommand, validateStructuredCommand, executeVoiceCommand } from '../apps/legacy-preview/voice-router.js';

const db = defaultDb();
db.patients.push({ id: 1, first_name: 'Ana', last_name: 'Voz', archived: false });

const bridgeCommand = parseVoiceCommand('puente de 13 a 16 con pilares 13 y 16 y ponticos 14 15');
assert.equal(bridgeCommand.intent, 'odontogram.entity.create');
assert.equal(bridgeCommand.slots.type, 'bridge');
assert.deepEqual(bridgeCommand.slots.teeth, ['13','14','15','16']);
assert.equal(validateStructuredCommand(bridgeCommand).ok, true);
const bridgeResult = executeVoiceCommand(db, bridgeCommand, { patientId: 1 });
assert.equal(bridgeResult.handled, true);
assert.equal(odontogramEntitiesForPatient(db, 1, { type: 'bridge' }).length, 1);

const implantCommand = parseVoiceCommand('implante 36 colocado falta pilar y corona');
assert.equal(implantCommand.intent, 'odontogram.entity.create');
assert.equal(implantCommand.slots.type, 'implant_restoration');
const implantResult = executeVoiceCommand(db, implantCommand, { patientId: 1 });
assert.equal(implantResult.entity.type, 'implant_restoration');
assert.ok(implantResult.createdClinicalItems.length >= 3);

const removableCommand = parseVoiceCommand('protesis removible superior parcial');
assert.equal(removableCommand.intent, 'odontogram.entity.create');
assert.equal(removableCommand.slots.type, 'removable_prosthesis');
assert.equal(removableCommand.slots.arch, 'upper');

const orthoCommand = parseVoiceCommand('ortodoncia con alineadores superior e inferior');
assert.equal(orthoCommand.slots.type, 'orthodontics');
assert.equal(orthoCommand.slots.arch, 'both');

const pediatricCommand = parseVoiceCommand('pulpotomia 75');
assert.equal(pediatricCommand.slots.type, 'pediatric');
assert.deepEqual(pediatricCommand.slots.teeth, ['75']);

console.log('verify_odontogram_v3_voice: OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests\verify_odontogram_v3_voice.mjs`

Expected: FAIL because intent and parser do not exist.

- [ ] **Step 3: Import V3 helpers**

At top of `voice-router.js`, add:

```js
createOdontogramEntity,
syncLegacyOdontogramFromEntities,
odontogramEntityToClinicalItems,
expandFdiRange
```

- [ ] **Step 4: Add intent and validation**

Add `'odontogram.entity.create'` to `VOICE_INTENTS`.

In `validateStructuredCommand`, add:

```js
if(command.intent==='odontogram.entity.create'){
  const allowed=new Set(['bridge','implant_restoration','removable_prosthesis','orthodontics','pediatric','periodontal_chart']);
  if(!allowed.has(slots.type)) return {ok:false,error:'odontogram_entity_type_invalid'};
  if(slots.teeth!=null && !Array.isArray(slots.teeth)) return {ok:false,error:'odontogram_entity_teeth_invalid'};
}
```

- [ ] **Step 5: Implement parser helpers**

Add before `odontogramCommand`:

```js
function extractAllTeeth(text){ return [...new Set([...String(text||'').matchAll(/\b([1-8][1-8])\b/g)].map(m=>m[1]))]; }
function extractFdiRangeFromSpeech(text){
  const m=String(text||'').match(/\b([1-4][1-8])\s*(?:a|al|hasta|-)\s*([1-4][1-8])\b/i);
  return m ? (expandFdiRange(m[1],m[2])||[m[1],m[2]]) : [];
}
function archFromSpeech(text){
  const n=ntext(text);
  const upper=/superior|maxilar/.test(n), lower=/inferior|mandib/.test(n);
  return upper&&lower?'both':upper?'upper':lower?'lower':'';
}
function bridgeEntityCommand(text){
  const n=ntext(text);
  if(!/puente|protesis fija/.test(n)) return null;
  const range=extractFdiRangeFromSpeech(text), teeth=range.length?range:extractAllTeeth(text).filter(t=>/^[1-4][1-8]$/.test(t));
  if(teeth.length<2) return null;
  const afterPillars=(String(text).match(/pilares?\s+(.+?)(?:\s+y\s+ponticos|\s+ponticos|$)/i)||[])[1]||'';
  const afterPontics=(String(text).match(/ponticos?\s+(.+)$/i)||[])[1]||'';
  const pillars=extractAllTeeth(afterPillars);
  const pontics=extractAllTeeth(afterPontics);
  const components=teeth.map(tooth=>({tooth,role:pillars.includes(tooth)?'abutment':pontics.includes(tooth)?'pontic':'pontic',status:'planned'}));
  if(!components.some(c=>c.role==='abutment')){ components[0].role='abutment'; components[components.length-1].role='abutment'; }
  return result('odontogram.entity.create',{type:'bridge',teeth,components,status:'planned',metadata:{}},.94,{requires_confirmation:false});
}
function implantEntityCommand(text){
  const n=ntext(text), tooth=extractTooth(text);
  if(!tooth || !/implante/.test(n)) return null;
  const placed=/colocad|realizad|hech/.test(n);
  const components=[
    {tooth,role:'implant',status:placed?'completed':'planned'},
    {tooth,role:'abutment',status:/falta.*pilar|pilar.*pendiente/.test(n)?'planned':'planned'},
    {tooth,role:'crown',status:/falta.*corona|corona.*pendiente/.test(n)?'planned':'planned'}
  ];
  return result('odontogram.entity.create',{type:'implant_restoration',teeth:[tooth],components,status:placed?'surgery_done':'planned',metadata:{}},.94);
}
function removableEntityCommand(text){
  const n=ntext(text);
  if(!/removible/.test(n)) return null;
  return result('odontogram.entity.create',{type:'removable_prosthesis',teeth:extractAllTeeth(text),arch:archFromSpeech(text)||'upper',components:[{role:'base',status:'planned'}],status:'planned',metadata:{design:/parcial/.test(n)?'parcial':/completa/.test(n)?'completa':'removible'}},.92);
}
function orthodonticsEntityCommand(text){
  const n=ntext(text);
  if(!/ortodon|alineador|bracket/.test(n)) return null;
  return result('odontogram.entity.create',{type:'orthodontics',teeth:extractAllTeeth(text),arch:archFromSpeech(text)||'both',components:[{role:/alineador/.test(n)?'aligner':'brackets',status:'planned'}],status:'planned',metadata:{appliance:/alineador/.test(n)?'alineadores':'brackets'}},.92);
}
function pediatricEntityCommand(text){
  const n=ntext(text), teeth=extractAllTeeth(text).filter(t=>/^[5-8][1-8]$/.test(t));
  if(!teeth.length || !/pulpotomia|pulpectomia|mantenedor|odontopedi/.test(n)) return null;
  return result('odontogram.entity.create',{type:'pediatric',teeth,status:'planned',components:[{tooth:teeth[0],role:/pulpotomia/.test(n)?'pulpotomy':'pediatric_treatment',status:'planned'}],metadata:{treatment:/pulpotomia/.test(n)?'pulpotomia':'odontopediatria'}},.93);
}
function odontogramEntityCommand(text){
  return bridgeEntityCommand(text)||implantEntityCommand(text)||removableEntityCommand(text)||orthodonticsEntityCommand(text)||pediatricEntityCommand(text);
}
```

In `parseVoiceCommand`, before periodontal and simple odontogram:

```js
const odEntity=odontogramEntityCommand(raw); if(odEntity) return odEntity;
```

- [ ] **Step 6: Execute V3 entity command**

In `executeVoiceCommand`, before `odontogram.set`:

```js
if(cmd.intent==='odontogram.entity.create'){
  const entity=createOdontogramEntity(db, patient.id, s);
  syncLegacyOdontogramFromEntities(db, patient.id);
  const createdClinicalItems=odontogramEntityToClinicalItems(db, patient.id, entity.id);
  return {handled:true,intent:cmd.intent,patient,entity,createdClinicalItems,message:`Entidad odontologica creada: ${entity.type}`};
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node tests\verify_odontogram_v3_voice.mjs`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/legacy-preview/voice-router.js tests/verify_odontogram_v3_voice.mjs
git commit -m "Route voice commands to odontogram v3 entities"
```

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

### Task 5: Odontograma V3 UI Controls

**Files:**
- Modify: `apps/legacy-preview/app.js`
- Modify: `apps/legacy-preview/styles/styles.css`
- Test: `tests/verify_odontogram_v3_ui.mjs`

**Interfaces:**
- Consumes: V3 helpers from Tasks 1-4.
- Produces: visible V3 entity controls, summary and snapshot actions.

- [ ] **Step 1: Write the failing UI test**

Create `tests/verify_odontogram_v3_ui.mjs`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('apps/legacy-preview/app.js', 'utf8');
const css = readFileSync('apps/legacy-preview/styles/styles.css', 'utf8');

for (const token of [
  'odontogram-v3-panel',
  'data-odonto-v3="bridge"',
  'data-odonto-v3="implant_restoration"',
  'data-odonto-v3="removable_prosthesis"',
  'data-odonto-v3="orthodontics"',
  'data-odonto-v3="pediatric"',
  'createOdontogramSnapshot',
  'periodontalVisualSummary',
  'bindOdontogramV3'
]) assert.ok(app.includes(token), `falta token UI ${token}`);

for (const selector of [
  '.odontogram-v3-panel',
  '.odonto-entity-card',
  '.odonto-bridge-bar',
  '.odonto-component-chip',
  '.odonto-snapshot-diff',
  '.perio-visual-summary'
]) assert.ok(css.includes(selector), `falta estilo ${selector}`);

console.log('verify_odontogram_v3_ui: OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests\verify_odontogram_v3_ui.mjs`

Expected: FAIL because UI tokens do not exist.

- [ ] **Step 3: Import V3 helpers in app.js**

Add to the import list:

```js
ensureOdontogramV3, createOdontogramEntity, odontogramEntitiesForPatient,
syncLegacyOdontogramFromEntities, odontogramEntityToClinicalItems,
createOdontogramSnapshot, compareOdontogramSnapshots, periodontalVisualSummary
```

- [ ] **Step 4: Add render helpers**

Add near odontogram render functions:

```js
function renderOdontogramV3Panel(pid){
  const entities=odontogramEntitiesForPatient(db,pid);
  const summary=periodontalVisualSummary(db,pid);
  return `<section class="odontogram-v3-panel"><div class="section-title"><div><h2>Odontograma V3</h2><p>Entidades clinicas compartidas por voz, plan y agenda.</p></div><button class="ghost mini" id="createOdontoSnapshot">Snapshot</button></div><div class="odonto-v3-actions"><button data-odonto-v3="bridge">Puente</button><button data-odonto-v3="implant_restoration">Implante + pilar + corona</button><button data-odonto-v3="removable_prosthesis">Removible</button><button data-odonto-v3="orthodontics">Ortodoncia</button><button data-odonto-v3="pediatric">Odontopediatria</button></div><div class="perio-visual-summary severity-${summary.severity}"><strong>Periodontal</strong><span>Max ${summary.max_depth} mm · sangrado ${summary.bleeding_percent}% · placa ${summary.plaque_percent}%</span></div><div class="odonto-v3-entities">${entities.length?entities.map(renderOdontoEntityCard).join(''):'<div class="empty-state">Sin entidades V3 todavia.</div>'}</div></section>`;
}
function renderOdontoEntityCard(entity){
  const teeth=(entity.teeth||[]).join(' - ') || entity.arch || 'zona';
  const bridge=entity.type==='bridge'?`<div class="odonto-bridge-bar">${(entity.components||[]).map(c=>`<span class="${c.role}">${esc(c.tooth||c.role)}</span>`).join('')}</div>`:'';
  const chips=(entity.components||[]).map(c=>`<span class="odonto-component-chip">${esc(c.role)}${c.tooth?' '+esc(c.tooth):''}</span>`).join('');
  return `<article class="odonto-entity-card type-${esc(entity.type)}"><div><strong>${esc(entity.type.replace(/_/g,' '))}</strong><small>${esc(teeth)} · ${esc(entity.status)}</small></div>${bridge}<div class="odonto-component-row">${chips}</div><button class="ghost mini" data-entity-plan="${entity.id}">Plan clinico</button></article>`;
}
```

In `renderRestorativeMode`, insert `${renderOdontogramV3Panel(pid)}` before the legend section.

- [ ] **Step 5: Add binding**

Add:

```js
function bindOdontogramV3(){
  $$('[data-odonto-v3]').forEach(btn=>btn.onclick=()=>{
    const pid=state.patientId||activePatients()[0]?.id;
    if(!pid) return toast('Elige paciente');
    const type=btn.dataset.odontoV3;
    let input={type,status:'planned',teeth:[state.selectedTooth||'36'],components:[],metadata:{},source:'ui'};
    if(type==='bridge'){
      const raw=prompt('Dientes del puente separados por coma', '13,14,15')||'';
      const teeth=raw.split(/[,\s]+/).map(x=>x.trim()).filter(Boolean);
      input={...input,teeth,components:teeth.map((tooth,i)=>({tooth,role:i===0||i===teeth.length-1?'abutment':'pontic',status:'planned'}))};
    }else if(type==='implant_restoration'){
      const tooth=prompt('Diente/zona del implante', state.selectedTooth||'36')||'36';
      input={...input,teeth:[tooth],components:[{tooth,role:'implant',status:'planned'},{tooth,role:'abutment',status:'planned'},{tooth,role:'crown',status:'planned'}]};
    }else if(type==='removable_prosthesis'){
      input={...input,teeth:[],arch:prompt('Arco: upper/lower/both','upper')||'upper',components:[{role:'base',status:'planned'}],metadata:{design:'parcial'}};
    }else if(type==='orthodontics'){
      input={...input,teeth:[],arch:'both',components:[{role:'aligner',status:'planned'}],metadata:{appliance:'alineadores'}};
    }else if(type==='pediatric'){
      const tooth=prompt('Diente temporal', '75')||'75';
      input={...input,teeth:[tooth],components:[{tooth,role:'pulpotomy',status:'planned'}],metadata:{treatment:'pulpotomia'}};
    }
    try{ snapshot('odontogram.v3.create',pid); const entity=createOdontogramEntity(db,pid,input); syncLegacyOdontogramFromEntities(db,pid); persist(); render(); toast('Entidad V3 creada: '+entity.type); }
    catch(err){ toast(err?.message||'No se pudo crear la entidad'); }
  });
  $$('[data-entity-plan]').forEach(btn=>btn.onclick=()=>{
    const pid=state.patientId||activePatients()[0]?.id;
    try{ snapshot('odontogram.v3.plan',pid); const items=odontogramEntityToClinicalItems(db,pid,Number(btn.dataset.entityPlan)); persist(); render(); toast(items.length+' item(s) enviados al plan clinico'); }
    catch(err){ toast(err?.message||'No se pudo crear plan clinico'); }
  });
  $('#createOdontoSnapshot')?.addEventListener('click',()=>{
    const pid=state.patientId||activePatients()[0]?.id;
    if(!pid) return;
    snapshot('odontogram.v3.snapshot',pid);
    const snap=createOdontogramSnapshot(db,pid,prompt('Nombre del snapshot','review')||'review');
    const bucket=db.odontogramSnapshots?.[String(pid)]||[];
    const previous=bucket.length>1?bucket[bucket.length-2]:null;
    const diff=previous?compareOdontogramSnapshots(previous,snap):null;
    persist(); render(); toast(diff?`Snapshot guardado: ${diff.changedTeeth.length} diente(s) cambiados`:'Snapshot guardado');
  });
}
```

Call `bindOdontogramV3()` from `bindOdonto()`.

- [ ] **Step 6: Add styles**

Append to `styles.css`:

```css
.odontogram-v3-panel{display:grid;gap:12px;border:1px solid var(--line);background:#fff;border-radius:18px;padding:14px;margin:14px 0}
.odonto-v3-actions{display:flex;gap:8px;flex-wrap:wrap}
.odonto-v3-actions button{border:1px solid #d8e1e4;background:#fff;border-radius:12px;padding:8px 10px;font-size:12px;font-weight:850;color:#27414b}
.odonto-v3-entities{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.odonto-entity-card{border:1px solid #d9e4e7;border-radius:14px;background:#f8fafb;padding:12px;display:grid;gap:8px}
.odonto-entity-card strong{text-transform:capitalize}
.odonto-bridge-bar{display:flex;align-items:center;gap:4px;height:28px}
.odonto-bridge-bar span{display:grid;place-items:center;min-width:30px;height:24px;border-radius:8px;background:#dceef7;color:#184859;font-size:11px;font-weight:900}
.odonto-bridge-bar span.abutment{background:#cfe7dc;color:#145333}
.odonto-bridge-bar span.pontic{background:#e8edf1;color:#485b63;border-style:dashed}
.odonto-component-row{display:flex;gap:6px;flex-wrap:wrap}
.odonto-component-chip{display:inline-flex;border:1px solid #d2dde1;border-radius:999px;padding:4px 8px;background:#fff;font-size:11px;font-weight:800;color:#51656d}
.perio-visual-summary{display:flex;justify-content:space-between;gap:10px;align-items:center;border-radius:14px;padding:10px 12px;background:#eef7f8;color:#24515b;font-size:12px}
.perio-visual-summary.severity-severe{background:#feecec;color:#8a2424}
.perio-visual-summary.severity-moderate{background:#fff5dc;color:#75540c}
.perio-visual-summary.severity-mild{background:#eef6ff;color:#24517e}
.odonto-snapshot-diff{border:1px solid #d8e1e4;border-radius:14px;padding:10px;background:#fff}
```

- [ ] **Step 7: Run UI test**

Run: `node tests\verify_odontogram_v3_ui.mjs`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/legacy-preview/app.js apps/legacy-preview/styles/styles.css tests/verify_odontogram_v3_ui.mjs
git commit -m "Add odontogram v3 interface controls"
```

### Task 6: Bundle, Documentation, Final Verification And Push

**Files:**
- Create: `docs/ODONTOGRAMA-V3.md`
- Modify generated: `apps/legacy-preview/denty-app.bundle.js`, `apps/web/public/denty-app.bundle.js`, `apps/web/public/styles/styles.css`, possibly `apps/web/src/lib/legacy-shell.ts`

**Interfaces:**
- Consumes: Tasks 1-5.
- Produces: shipped local build and GitHub update.

- [ ] **Step 1: Write documentation**

Create `docs/ODONTOGRAMA-V3.md`:

```md
# Odontograma V3

Odontograma V3 anade entidades clinicas compartidas por odontograma, voz y plan clinico.

## Entidades

- `bridge`: puente con dientes, pilares y ponticos.
- `implant_restoration`: implante, pilar y corona relacionados.
- `removable_prosthesis`: protesis por arco.
- `orthodontics`: tratamiento ortodontico por arco y componentes.
- `pediatric`: tratamientos de odontopediatria.
- `periodontal_chart`: resumen visual periodontal.
- `snapshot`: corte temporal para comparar antes y ahora.

## Compatibilidad

El odontograma legacy sigue funcionando. Las entidades V3 sincronizan estados legacy cuando es necesario, pero no borran datos anteriores.

## Voz y plan clinico

La voz crea entidades V3 para tratamientos complejos. El plan clinico deriva items desde esas mismas entidades para evitar modelos paralelos.
```

- [ ] **Step 2: Run all Odontograma V3 tests**

Run:

```bash
node tests\verify_odontogram_v3_model.mjs
node tests\verify_odontogram_v3_clinical_plan.mjs
node tests\verify_odontogram_v3_voice.mjs
node tests\verify_odontogram_v3_snapshots_perio.mjs
node tests\verify_odontogram_v3_ui.mjs
node tests\verify_visual_odontogram.mjs
node tests\verify_multi_treatment_odontogram.mjs
node tests\verify_odontogram_back_to_patient.mjs
node tests\verify_patient_portal_treatment_panel.mjs
```

Expected: all PASS.

- [ ] **Step 3: Rebuild legacy bundle**

Run:

```bash
node apps\legacy-preview\build-static-bundle.mjs
pnpm --filter @denty/web sync:legacy
```

Expected: bundle generated and web public assets synced.

- [ ] **Step 4: Build web**

Stop local dev servers on ports `8767` and `8766`, remove `apps/web/.next` and `apps/web/out`, then run:

```bash
pnpm --filter @denty/web build
```

Expected: Next build succeeds.

- [ ] **Step 5: Restart local server**

Run:

```powershell
pnpm exec next dev -H 127.0.0.1 -p 8767
```

from `apps/web`, or use the existing hidden-window start command.

Verify:

```powershell
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8767/?odontogram-v3=1 -TimeoutSec 15).StatusCode
```

Expected: `200`.

- [ ] **Step 6: Commit final generated/docs changes**

```bash
git add docs/ODONTOGRAMA-V3.md apps/legacy-preview/denty-app.bundle.js apps/web/public/denty-app.bundle.js apps/web/public/styles/styles.css apps/web/src/lib/legacy-shell.ts
git commit -m "Document and ship odontogram v3"
```

If there are no shell changes in `apps/web/src/lib/legacy-shell.ts`, omit it from the commit.

- [ ] **Step 7: Push**

```bash
git push origin main
```

Expected: GitHub `main` contains Odontograma V3.

## Self-Review

- Spec coverage: entity model, bridge roles, implant components, removable arch, orthodontics, pediatric, periodontal visual, snapshots, voice and clinical plan are covered by Tasks 1-5.
- Placeholder scan: no task contains unresolved placeholder language.
- Type consistency: helper names match the spec and are consumed consistently across tasks.
