# Especificación legacy · Consentimientos

Fuente: legacy actual. Se conserva el autocompletado por clínica/doctor/sede, versionado y texto documental como comportamiento de referencia. La firma y auditoría deben vivir en flujos tipados y accesibles.

## Funciones extraídas del legacy

### `consentTemplate`

```js
function consentTemplate(id,title,objective,risks='molestias, dolor, inflamacion, sangrado, infeccion, sensibilidad, fracaso parcial o necesidad de tratamientos complementarios segun evolucion clinica'){
  return {id,title,version:3,active:true,signers:['Paciente','Profesional'],text:`${title.toUpperCase()}\n\nProcedimiento informado: ${objective}.\n\nEl profesional ha explicado el diagnostico, la indicacion, las fases previsibles, los beneficios esperados y las limitaciones razonables del tratamiento.\n\nRiesgos y posibles complicaciones: ${risks}. Tambien se ha explicado que ningun tratamiento sanitario garantiza un resultado absoluto y que pueden requerirse controles, ajustes, medicacion o actuaciones adicionales.\n\nAlternativas: no realizar el tratamiento, aplazarlo, optar por tratamiento conservador, quirurgico, protesico, farmacologico o derivacion cuando proceda, con los riesgos de cada alternativa.\n\nCuidados: seguir las instrucciones entregadas, acudir a revisiones, avisar ante dolor intenso, inflamacion, sangrado persistente, fiebre, movilidad, fractura o cualquier signo inesperado.\n\nDeclaro haber recibido informacion suficiente, haber podido preguntar y aceptar el procedimiento indicado.`};
}
```

### `consentDoctorFor`

```js
function consentDoctorFor(db){
  const userName=String(db.currentUser?.name||'').trim();
  const byUser=(db.employees||[]).find(e=>normalizeText(e.name)===normalizeText(userName));
  return byUser || (db.employees||[]).find(e=>e.active!==false&&normalizeText(e.role).includes('odont')) || (db.employees||[])[0] || {name:userName||'Profesional responsable',site_id:null,site:''};
}
```

### `consentSiteFor`

```js
function consentSiteFor(db, doctor){
  return (db.sites||[]).find(s=>Number(s.id)===Number(doctor?.site_id)) || (db.sites||[]).find(s=>Number(s.id)===Number(db.settings?.clinicProfile?.default_site_id)) || (db.sites||[])[0] || {name:db.settings?.clinicProfile?.name||'Clinica',address:''};
}
```

### `renderConsentDocumentText`

```js
function renderConsentDocumentText(db, consent, patientId){
  const p=(db.patients||[]).find(x=>Number(x.id)===Number(patientId));
  const doctor=consentDoctorFor(db);
  const site=consentSiteFor(db, doctor);
  const patientName=patientFullName(p);
  const doctorName=doctor?.name||db.currentUser?.name||'Profesional responsable';
  const siteName=[site?.name, site?.address].filter(Boolean).join(' - ') || db.settings?.clinicProfile?.name || 'Clinica';
  return `DATOS DEL CONSENTIMIENTO\nPaciente: ${patientName}\nDoctor/a responsable: ${doctorName}\nCentro/Sede: ${siteName}\nFecha: ${formatConsentDate()}\n\n${consent?.text||''}\n\nFirma del paciente: pendiente de firma digital.`;
}
```

### `renderConsentsSettingsEditor`

```js
function renderConsentsSettingsEditor(){
  const editing=state.settingsEditType==='consent', r=editing?settingsRecord('consent'):null;
  const rows=(db.consents||[]).map(c=>`<div class="admin-row"><span><strong>${esc(c.title)}</strong><small>v${Number(c.version||1)} · ${(c.signers||[]).map(esc).join(' + ')} · ${c.active!==false?'activo':'inactivo'}</small></span><div class="admin-row-actions"><button class="ghost mini" data-settings-edit="consent:${c.id}">Editar</button><button class="ghost mini" data-settings-toggle="consent:${c.id}">${c.active!==false?'Desactivar':'Activar'}</button></div></div>`).join('');
  const form=editing?`<form id="consentAdminForm" class="admin-form"><input type="hidden" name="id" value="${r?.id||''}"><div class="form-grid"><label class="field">Título<input name="title" required value="${esc(r?.title||'')}"></label><label class="field">Versión<input name="version" type="number" min="1" value="${Number(r?.version||1)}"></label><label class="field admin-span-2">Firmantes<input name="signers" value="${esc((r?.signers||['Paciente']).join(', '))}" placeholder="Paciente, Profesional"></label><label class="field admin-span-2">Texto completo<textarea name="text" class="admin-textarea-tall">${esc(r?.text||'')}</textarea></label><label class="check-row"><input name="active" type="checkbox" ${r?.active!==false?'checked':''}><span>Plantilla activa</span></label></div><div class="toolbar"><button class="primary">Guardar consentimiento</button><button type="button" class="ghost" data-settings-cancel>Cancelar</button></div></form>`:'<div class="toolbar"><button class="primary" data-settings-new="consent">+ Nuevo consentimiento</button></div>';
  return settingsEditorShell('Consentimientos','Las plantillas modificadas se usarán al crear nuevos documentos.',`<div class="admin-list admin-scroll">${rows}</div>${form}`);
}
```
