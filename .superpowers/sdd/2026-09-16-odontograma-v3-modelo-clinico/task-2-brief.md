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


