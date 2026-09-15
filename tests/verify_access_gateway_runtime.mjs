import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('apps/legacy-preview/index.html','utf8');
const app=fs.readFileSync('apps/legacy-preview/app.js','utf8');
const bundle=fs.readFileSync('apps/legacy-preview/denty-app.bundle.js','utf8');

const extract=(re,label)=>{
  const m=app.match(re); assert.ok(m,`${label} no encontrado`); return m[0];
};
const source=[
  extract(/const ACCOUNT_PORTALS = \{[\s\S]*?\n\};/,'ACCOUNT_PORTALS'),
  extract(/function safeSessionGet\([\s\S]*?\n\}/,'safeSessionGet'),
  extract(/function safeSessionSet\([\s\S]*?\n\}/,'safeSessionSet'),
  extract(/function safeSessionRemove\([\s\S]*?\n\}/,'safeSessionRemove'),
  extract(/function setSessionUser\([\s\S]*?\n\}/,'setSessionUser'),
  extract(/function safePortalStorage\([\s\S]*?\n\}/,'safePortalStorage'),
  extract(/function showAccountChooser\([\s\S]*?\n\}/,'showAccountChooser'),
  extract(/function populatePatientAccountSelect\([\s\S]*?\n\}/,'populatePatientAccountSelect'),
  extract(/function showAccountAccess\([\s\S]*?\n\}/,'showAccountAccess'),
  extract(/function applyPortalRole\([\s\S]*?\n\}/,'applyPortalRole'),
  extract(/function enterSelectedPortal\([\s\S]*?\n\}/,'enterSelectedPortal'),
  extract(/function bindClick\([\s\S]*?\n\}/,'bindClick'),
  extract(/function bindAccountGateway\([\s\S]*?\n\}/,'bindAccountGateway'),
].join('\n');

function el(id=''){
  const classes=new Set();
  return {id,hidden:false,textContent:'',innerHTML:'',value:'',disabled:false,dataset:{},attributes:{},onclick:null,onchange:null,
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
    click(){ this.onclick?.(); },
    setAttribute(k,v){ this.attributes[k]=v; },
  };
}
const ids=['accountGateway','accountChooser','accountAccessStage','accountAccessIcon','accountAccessTitle','accountAccessDescription','accountAccessStatus','accountAccessHint','accountPatientPicker','accountPatientSelect','accountContinue','accountBack','appShell'];
const elements=Object.fromEntries(ids.map(id=>[id,el(id)]));
elements.accountAccessStage.hidden=true;
const buttons=['admin','user','patient'].map(type=>{const b=el();b.dataset.accountType=type;return b;});
const storage=new Map();
const context={
  document:{title:'',querySelector:sel=>sel.startsWith('#')?elements[sel.slice(1)]||null:null,querySelectorAll:sel=>sel==='[data-account-type]'?buttons:[]},
  sessionStorage:{setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),getItem:k=>storage.get(k)||null},
  window:{scrollTo:()=>{}},
  console,
};
vm.createContext(context);
vm.runInContext(`
  const $=(sel)=>document.querySelector(sel); const $$=(sel)=>Array.from(document.querySelectorAll(sel));
  let selectedPortal=null; let selectedPortalPatientId=null; let pinUnlocked=true;
  let sharedCurrentUserSeed={id:11,name:'Administrador clinico',role:'admin'}; let sessionUser=null;
  const SESSION_USER_KEY='denty.sessionUser'; const SESSION_PATIENT_KEY='denty.portalPatientId';
  const state={view:'today',patientId:null,patientPortalTab:'inicio'};
  const db={patients:[{id:1,first_name:'Maria',last_name:'Prueba',ficha:'P-1',archived:false}],users:[{id:11,name:'Administrador clinico',role:'admin',active:true},{id:12,name:'Odontologo',role:'dentist',active:true}],currentUser:null};
  function activePatients(){return db.patients.filter(p=>!p.archived);} function patient(id){return db.patients.find(p=>Number(p.id)===Number(id));}
  function patientFullName(p){return [p?.first_name,p?.last_name].filter(Boolean).join(' ');} function esc(v){return String(v??'');}
  function persist(){} function syncNav(){} function render(){} function toast(){} function isAdminOnlyView(view){ return ['settings','staff','import'].includes(view); }
  ${source}; bindAccountGateway();
`,context);

buttons[0].click();
assert.equal(elements.accountChooser.hidden,true);
assert.equal(elements.accountAccessStage.hidden,false);
assert.match(elements.accountAccessTitle.textContent,/Administrador/);
elements.accountContinue.click();
assert.equal(elements.accountGateway.hidden,true);
assert.equal(elements.appShell.attributes['aria-hidden'],'false');
assert.equal(vm.runInContext('db.currentUser.role', context), 'admin');
assert.match(storage.get('denty.sessionUser'),/admin/,'admin debe permanecer en sessionStorage');

// Volver al selector simula usar el mismo navegador con otra cuenta.
vm.runInContext('showAccountChooser()',context);
buttons[1].click();
elements.accountContinue.click();
assert.equal(vm.runInContext('db.currentUser.role', context), 'dentist');

vm.runInContext('showAccountChooser()',context);
buttons[2].click();
assert.equal(elements.accountPatientPicker.hidden,false,'el selector de paciente debe mostrarse solo para cuenta paciente');
elements.accountPatientSelect.value='1';
elements.accountPatientSelect.onchange?.();
elements.accountContinue.click();
assert.equal(vm.runInContext('db.currentUser.role', context), 'patient');
assert.equal(vm.runInContext('state.patientId', context), 1);
assert.equal(storage.get('denty.portalPatientId'),'1');
assert.equal(elements.appShell.classList.contains('patient-portal-mode'),true);

const checks=[
  ['single gateway implementation',!html.includes('data-denty-gateway-bootstrap')],
  ['app guards sessionStorage',/function safePortalStorage[\s\S]{0,500}try\s*\{/.test(app)],
  ['page loads generated bundle deferred',html.includes('src="./denty-app.bundle.js" defer')&&bundle.includes('window.DentyAppReady=true')],
  ['assets are relative',html.includes('href="./styles/styles.css"')&&html.includes('src="./assets/denty-logo.png"')],
  ['patient selector exists',html.includes('id="accountPatientSelect"')]
];
for(const [name,ok] of checks){assert.ok(ok,name);console.log('✓',name);}
console.log('✓ gateway click simulation: Administrador / Usuario / Paciente con sesion separada');
console.log(`${checks.length+1}/${checks.length+1} runtime gateway checks passed`);
