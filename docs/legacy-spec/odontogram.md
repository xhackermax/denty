# Especificación legacy · Odontograma

Fuente: `apps/legacy-preview/denty-app.bundle.js` y `app.js`. Este documento conserva la lógica que debe portarse antes de retirar el legacy. Reglas destacadas: FDI, 5 caras, estados por familia, entidades v3, puentes y conectores, visualización periodontal y traducción odontograma→plan.

## Funciones extraídas del legacy

### `odontogramToothKind`

```js
function odontogramToothKind(tooth){
  const n=Number(String(tooth).slice(1));
  if([1,2].includes(n)) return 'incisor';
  if(n===3) return 'canine';
  if([4,5].includes(n)) return 'premolar';
  return 'molar';
}
```

### `occlusalSurfaceForTooth`

```js
function occlusalSurfaceForTooth(tooth){ return ['incisor','canine'].includes(odontogramToothKind(tooth)) ? 'I' : 'O'; }
```

### `normalizeSurfaceForTooth`

```js
function normalizeSurfaceForTooth(tooth, surface){
  const s=String(surface||'').toUpperCase();
  if(s==='P' || s==='L') return 'P';
  if(s==='O' || s==='I') return occlusalSurfaceForTooth(tooth);
  return SURFACES.includes(s) ? s : '';
}
```

### `wholeToothStateFamily`

```js
function wholeToothStateFamily(code){
  const s=String(code||'');
  if(s.startsWith('crown')) return 'crown';
  if(s.startsWith('endo')) return 'endo';
  if(s.startsWith('post')) return 'post';
  if(s.startsWith('implant')) return 'implant';
  if(s.startsWith('prosthesis')) return 'prosthesis';
  if(s.startsWith('removable')) return 'removable';
  return s;
}
```

### `bridgeConnectorSpansForArc`

```js
function bridgeConnectorSpansForArc(entities=[], teethOrder=[]){
  const order=(Array.isArray(teethOrder)?teethOrder:[]).map(String);
  return (Array.isArray(entities)?entities:[])
    .filter(entity=>entity?.active!==false && entity?.type==='bridge')
    .map(entity=>{
      const indices=[...new Set((entity.teeth||[]).map(tooth=>order.indexOf(String(tooth))).filter(index=>index>=0))].sort((a,b)=>a-b);
      if(indices.length<2) return null;
      const components=Array.isArray(entity.components)?entity.components:[];
      return {
        id:entity.id,
        startColumn:indices[0]+2,
        endColumn:indices.at(-1)+3,
        teeth:indices.map(index=>order[index]),
        pontics:components.filter(component=>component.role==='pontic' && order.includes(String(component.tooth))).map(component=>String(component.tooth)),
        status:String(entity.status||'planned')
      };
    })
    .filter(Boolean);
}
```

### `toothGeometry`

```js
function toothGeometry(kind, tooth=''){
  const upper = FDI_UPPER.includes(String(tooth));
  switch(kind){
    case 'incisor':
      return {
        outline:'M16 17 C16 11 20 8 25 8 C30 8 34 11 34 17 C35 24 32 32 29 36 C29 44 29 53 28 62 C27 70 26 76 25 79 C24 76 23 70 22 62 C21 53 21 44 21 36 C18 32 15 24 16 17 Z',
        rootLines:['M25 36 C25 49 25 64 25 78'],
        crown:'',
        roots:[],
        detail:''
      };
    case 'canine':
      return {
        outline:'M16 21 C17 15 21 10 25 5 C29 10 33 15 34 21 C36 29 32 37 29 41 C30 50 30 60 28 69 C27 76 26 80 25 80 C24 80 23 76 22 69 C20 60 20 50 21 41 C18 37 14 29 16 21 Z',
        rootLines:['M25 41 C25 54 25 68 25 79'],
        crown:'',
        roots:[],
        detail:''
      };
    case 'premolar':
      return {
        outline: upper
          ? 'M12 21 C13 14 19 10 24 12 C25 13 25 13 26 12 C31 10 37 14 38 21 C40 29 36 37 31 40 C32 48 34 59 32 68 C31 75 29 79 27 79 C25 76 25 65 25 56 C24 65 23 76 21 79 C18 79 17 74 17 68 C16 59 18 48 19 40 C14 37 10 29 12 21 Z'
          : 'M12 21 C13 14 19 10 24 12 C25 13 25 13 26 12 C31 10 37 14 38 21 C40 29 36 37 31 40 C31 48 31 58 30 67 C29 75 27 79 25 80 C23 79 21 75 20 67 C19 58 19 48 19 40 C14 37 10 29 12 21 Z',
        rootLines: upper ? ['M24 41 C22 53 21 67 21 79','M26 41 C28 53 29 67 27 79'] : ['M25 41 C25 54 25 68 25 79'],
        crown:'',
        roots:[],
        detail:''
      };
    case 'molar':
    default:
      return {
        outline: upper
          ? 'M8 23 C10 15 17 10 23 12 C25 13 25 13 27 12 C34 10 41 15 42 23 C45 32 40 40 34 43 C37 49 40 59 40 67 C40 74 37 79 33 76 C30 72 29 61 28 52 C27 47 26 45 25 44 C24 50 24 63 23 72 C22 79 19 81 17 77 C15 72 17 60 19 51 C17 56 15 67 13 75 C12 79 9 78 9 72 C8 63 12 50 16 43 C10 40 5 32 8 23 Z'
          : 'M8 23 C10 15 17 10 23 12 C25 13 25 13 27 12 C34 10 41 15 42 23 C45 32 40 40 34 43 C37 52 38 64 35 73 C33 79 29 80 27 74 C26 66 26 55 25 46 C24 55 24 66 23 74 C21 80 17 79 15 73 C12 64 13 52 16 43 C10 40 5 32 8 23 Z',
        rootLines: upper
          ? ['M18 44 C15 55 13 66 12 77','M25 44 C24 56 23 69 21 80','M28 44 C31 56 34 68 33 78','M20 43 C22 47 28 47 31 43']
          : ['M18 44 C16 55 16 67 17 78','M32 44 C34 55 34 67 32 78','M20 43 C22 47 28 47 31 43'],
        crown:'',
        roots:[],
        detail:''
      };
  }
}
```

### `toothMarkers`

```js
function toothMarkers(tooth, record){
  const states=toothWholeStates(record);
  const status=record.status||states.at(-1)||'healthy', surfaces=record.surfaces||{}, tone=statusTone(status), kind=toothKind(tooth);
  const g=toothGeometry(kind, tooth);
  const lower=FDI_LOWER.includes(String(tooth));
  const rotate=lower?'':' transform="rotate(180 25 40)"';
  const missing=states.includes('missing');
  const stateFor=family=>states.find(code=>String(code).startsWith(family))||'';
  const crownState=stateFor('crown'), implantState=stateFor('implant'), bridgeState=stateFor('prosthesis'), removableState=stateFor('removable'), endoState=stateFor('endo'), postState=stateFor('post');
  const surfaceRed=Object.values(surfaces).includes('caries');
  const surfaceFillingState=Object.values(surfaces).find(v=>String(v).startsWith('filling'))||'';
  const semClass=code=>statusVisualSemantics(code||'healthy').className;
  const missingAttrs = missing?' stroke-dasharray="4 4" opacity=".55"':'';
  const rootLines = (!removableState ? (g.rootLines||[]) : []).map(d=>`<path class="root-split" d="${d}"${missingAttrs}/>`).join('');
  const rootShade = !removableState ? `<path class="root-shade" d="M18 42 C20 52 20 65 22 78 M32 42 C30 52 30 65 28 78"${missingAttrs}/>` : '';
  const removableClipId = `removable-root-clip-${String(tooth).replace(/[^0-9A-Za-z_-]/g,'')}`;
  const removableDefs = removableState ? `<defs><clipPath id="${removableClipId}"><rect x="0" y="0" width="50" height="41"/></clipPath></defs>` : '';
  const removableOutlineClip = removableState ? ` clip-path="url(#${removableClipId})"` : '';
  const removableRootGhost = removableState ? `<g class="removable-root-ghost treatment-mark ${semClass(removableState)}" aria-hidden="true">${(g.rootLines||[]).map(d=>`<path d="${d}"/>`).join('') || '<path d="M20 42 C18 54 18 68 21 78"/><path d="M30 42 C32 54 32 68 29 78"/>'}</g>` : '';
  const crownVisualState = bridgeState || crownState;
  const crownVisualClass = bridgeState ? 'bridge-crown' : 'single-crown';
  return `<svg class="tooth-svg apk-tooth minimal-tooth anatomical-tooth continuous-tooth" viewBox="0 0 50 82" aria-hidden="true">${removableDefs}<g${rotate}><path class="tooth-outline tone-${tone}" d="${g.outline}"${removableOutlineClip}${missingAttrs}/>${removableRootGhost}${missing?'':rootShade}${rootLines}${crownVisualState?`<path class="crown-cap ${crownVisualClass} treatment-mark ${semClass(crownVisualState)}" d="M15 23 C21 17 29 17 35 23 L32 36 C28 33 22 33 18 36 Z"/>`:''}${surfaceFillingState?`<circle class="surface-fill-dot treatment-mark ${semClass(surfaceFillingState)}" cx="25" cy="25" r="4.8"/>`:''}${surfaceRed?`<circle class="surface-red-dot treatment-mark semantic-pending" cx="25" cy="24" r="4.8"/>`:''}${endoState?`<path class="endo-mark treatment-mark ${semClass(endoState)}" d="M23.5 35 L26.5 35 L26 72 L24 72 Z"/>`:''}${postState?`<path class="post-mark treatment-mark ${semClass(postState)}" d="M22 30 L28 30 L27 54 L23 54 Z"/>`:''}${implantState?`<g class="implant-mark treatment-mark ${semClass(implantState)}"><path d="M19 42 H31 M20 49 H30 M21 56 H29 M22 63 H28"/><path d="M19 40 L23 72 H27 L31 40"/></g>`:''}${states.includes('extraction')?'<path class="extract-mark semantic-pending" d="M13 15 L37 45 M37 15 L13 45"/>':''}</g></svg>`;
}
```

### `surfaceSvg`

```js
function surfaceSvg(tooth, record){ const map=record.surfaces||{}; const get=s=>map[normalizeSurfaceForTooth(tooth,s)]||''; const cls=s=>{ const v=get(s); return v?`filled ${statusTone(v)}`:''; }; const occ=normalizeSurfaceForTooth(tooth,'O'); return `<svg class="surface-map" viewBox="0 0 54 54" aria-label="Superficies ${tooth}"><circle class="surface-shell" cx="27" cy="27" r="23"/><path class="surface-seg ${cls('V')}" data-surface-tooth="${tooth}" data-surface="V" d="M11 10 Q27 1 43 10 L35 19 Q27 14 19 19 Z"><title>${tooth} Vestibular</title></path><path class="surface-seg ${cls('P')}" data-surface-tooth="${tooth}" data-surface="P" d="M11 44 Q27 53 43 44 L35 35 Q27 40 19 35 Z"><title>${tooth} Palatino/Lingual</title></path><path class="surface-seg ${cls('M')}" data-surface-tooth="${tooth}" data-surface="M" d="M10 11 Q1 27 10 43 L19 35 Q14 27 19 19 Z"><title>${tooth} Mesial</title></path><path class="surface-seg ${cls('D')}" data-surface-tooth="${tooth}" data-surface="D" d="M44 11 Q53 27 44 43 L35 35 Q40 27 35 19 Z"><title>${tooth} Distal</title></path><circle class="surface-seg ${cls(occ)}" data-surface-tooth="${tooth}" data-surface="${occ}" cx="27" cy="27" r="9"><title>${tooth} ${occ==='I'?'Incisal':'Oclusal'}</title></circle></svg>`; }
```

### `statusVisualSemantics`

```js
function statusVisualSemantics(code){
  const s=String(code||'healthy');
  if(s==='healthy') return {kind:'healthy', className:'semantic-healthy'};
  if(s==='missing') return {kind:'missing', className:'semantic-missing'};
  if(s==='extraction'||s==='caries'||s.endsWith('_pending')||s.endsWith('_indicated')) return {kind:'pending', className:'semantic-pending'};
  if(s.endsWith('_bad')||s==='implant_review'||s==='filling_bad') return {kind:'redo', className:'semantic-redo'};
  return {kind:'done', className:'semantic-done'};
}
```

### `legendItems`

```js
function legendItems(){
  return ODONTO_LEGEND_MAIN.map(base=>{
    const idx=Number(state.odontoLegendState?.[base]||0);
    const code=legendVariant(base,idx);
    const selected=state.odontoToolBase===base;
    const cycles=!!ODONTO_LEGEND_CYCLES[base];
    const stateText=legendStateText(base,idx)||legendLabel(base,idx);
    return `<button type="button" class="clinical-legend-card refined ${selected?'selected':''} tone-${statusTone(code)}" data-legend-base="${base}" data-od-code="${code}">${legendClinicalIcon(base,code)}<span class="legend-copy"><b>${esc(ODONTO_LEGEND_META[base]?.title||legendLabel(base,idx))}</b><small class="state-line">${cycles?'Toque repetido - ':''}${esc(stateText)}</small><span class="legend-chip-row"><em class="legend-state-chip tone-${statusTone(code)}">${esc(stateText)}</em><em class="legend-applies-chip">${esc(legendApplicationLabel(base))}</em></span></span>${stateDots(base,idx)}</button>`;
  }).join('');
}
```

### `periodontalVisualSummary`

```js
function periodontalVisualSummary(db, patientId){
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

### `odontogramEntityToClinicalItems`

```js
function odontogramEntityToClinicalItems(db, patientId, entityId){
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
