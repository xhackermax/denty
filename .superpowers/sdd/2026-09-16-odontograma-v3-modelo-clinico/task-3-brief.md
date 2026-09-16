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


