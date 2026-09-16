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
  return `<section class="odontogram-v3-panel"><div class="section-title"><div><h2>Odontograma V3</h2><p>Entidades clinicas compartidas por voz, plan y agenda.</p></div><button class="ghost mini" id="createOdontoSnapshot">Snapshot</button></div><div class="odonto-v3-actions"><button data-odonto-v3="bridge">Puente</button><button data-odonto-v3="implant_restoration">Implante + pilar + corona</button><button data-odonto-v3="removable_prosthesis">Removible</button><button data-odonto-v3="orthodontics">Ortodoncia</button><button data-odonto-v3="pediatric">Odontopediatria</button></div><div class="perio-visual-summary severity-${summary.severity}"><strong>Periodontal</strong><span>Max ${summary.max_depth} mm Â· sangrado ${summary.bleeding_percent}% Â· placa ${summary.plaque_percent}%</span></div><div class="odonto-v3-entities">${entities.length?entities.map(renderOdontoEntityCard).join(''):'<div class="empty-state">Sin entidades V3 todavia.</div>'}</div></section>`;
}
function renderOdontoEntityCard(entity){
  const teeth=(entity.teeth||[]).join(' - ') || entity.arch || 'zona';
  const bridge=entity.type==='bridge'?`<div class="odonto-bridge-bar">${(entity.components||[]).map(c=>`<span class="${c.role}">${esc(c.tooth||c.role)}</span>`).join('')}</div>`:'';
  const chips=(entity.components||[]).map(c=>`<span class="odonto-component-chip">${esc(c.role)}${c.tooth?' '+esc(c.tooth):''}</span>`).join('');
  return `<article class="odonto-entity-card type-${esc(entity.type)}"><div><strong>${esc(entity.type.replace(/_/g,' '))}</strong><small>${esc(teeth)} Â· ${esc(entity.status)}</small></div>${bridge}<div class="odonto-component-row">${chips}</div><button class="ghost mini" data-entity-plan="${entity.id}">Plan clinico</button></article>`;
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


