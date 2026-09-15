import {
  DB_KEY, loadDb, saveDb, defaultDb, id, today, prettyDate, shortWeekdayName, patientFullName, initials, normalizeText,
  FDI_UPPER, FDI_LOWER, SURFACES, STATUS_LABELS, ODONTO_LEGEND_MAIN, ODONTO_LEGEND_CYCLES, ODONTO_LEGEND_META,
  ensureOdontogram, toothStatusNext, setToothPrimaryState, setToothLegendState, clearToothSurface, toothWholeStates, removeToothWholeState,
  setToothSurfaceState, markArcadeMissing, createPatient, archivePatient, restorePatient, patientDetailActions,
  legendVariant, legendLabel, legendStateText, legendNextIndex, statusTone, normalizeSurfaceForTooth,
  agendaByDoctors, agendaByHours, agendaCounters, appointmentAvailability, durationMinutes, addMinutes,
  agendaMoveAppointment, agendaResizeAppointment, agendaCreateBlock, agendaCancelAppointment,
  agendaWaitingListMatches, agendaRescheduleOptions, agendaCascadeSuggestions, agendaPlanClinicalSequence,
  createConsentDocument, signDocument, createAttendanceCertificateDocument, attendanceAppointmentIsEligible, createTreatmentPlan, treatmentPlanHierarchy, patientTreatmentRoute, schedulePlanStepToAgenda, csvRows, patientFromRow, runAction,
  clinicalPlanGraph, patientClinicalPlanProjection, createClinicalPlanItem, syncClinicalPlanFromOdontogram, syncClinicalPlanBudget,
  createMissingToothAlternatives, clinicalAlternativeContextLabel, updateClinicalAlternativeContext, approveClinicalAlternativeOption,
  setPatientAlternativePreference, setClinicalPlanItemStatus,
  validateStorageHealth, paymentAmountForBudget, isSettledPayment, ensurePatientPortalState, patientPortalDelayDays, patientPortalProjectedDate,
  patientPortalPaymentPlan, patientPortalHealth, patientPortalRescheduleCandidates, patientPortalWaitingRoom, patientPortalDentalFindings
} from './logic.js';
import { parseVoiceCommand, validateStructuredCommand, executeVoiceCommand } from './voice-router.js';

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const storage = (()=>{
  try{
    const s=window.localStorage, key='__denty_storage_probe__';
    s.setItem(key,'1'); s.removeItem(key); return s;
  }catch{
    const memory=new Map();
    return {getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
  }
})();
const SESSION_USER_KEY='denty.sessionUser';
const SESSION_PATIENT_KEY='denty.portalPatientId';
const SHARED_CHANNEL_NAME='denty-shared-state';
let db = loadDb(storage);
let sharedCurrentUserSeed={...(db.currentUser||{id:11,name:'Administrador clinico',role:'admin'})};
let sessionUser=readSessionJson(SESSION_USER_KEY);
if(sessionUser?.role) db.currentUser={...sessionUser};
let state = {view:'today', date: today(), patientId:Number(safeSessionGet(SESSION_PATIENT_KEY)||0)||null, patientTab:'resumen', patientPortalTab:'inicio', agendaView:'doctors', agendaQuickId:null, trash:false, selectedTooth:null, selectedSurface:null, settingsPanel:'clinic', settingsEditType:null, settingsEditId:null, odontoToolBase:'filling', odontoToolCode:'filling', odontoLegendState:{}, odontoFilter:'all', odontoMode:'restorative'};
let importRows = [];
let importMapping = {};
let recognition = null;
let voiceListening = false;
let lastCommandResult = null;
let longPressTimer = null;
let lastSnapshot = null;
let pinUnlocked = false;
let previousViewForMotion = '';
let paymentRuntime = {providerStatus:null, readers:[], readerStatus:{}, pollTimer:null, activePaymentId:null};
const previewGateway = {checkouts:new Map(), readers:[{id:'preview-reader-1',name:'Datáfono virtual de prueba',status:'ONLINE',device:{model:'Preview',identifier:'DENTY-PREVIEW'}}]};
let selectedPortal = safePortalStorage('get')||null;
let selectedPortalPatientId=Number(safeSessionGet(SESSION_PATIENT_KEY)||0)||null;
let sharedChannel=null;
let sharedReloadTimer=null;
const ACCOUNT_PORTALS = {
  admin:{title:'Cuenta Administrador',icon:'admin',description:'Acceso a la gestión completa de Denty y de la clínica.',status:'Acceso de administrador preparado',hint:'En la siguiente fase pedirá el usuario y la contraseña del administrador.'},
  user:{title:'Cuenta Usuario',icon:'user',description:'Acceso para odontólogos, higienistas, auxiliares, recepción y demás personal.',status:'Acceso de usuario preparado',hint:'El fichaje quedará ligado a la identidad que inicie sesión.'},
  patient:{title:'Cuenta Paciente',icon:'patient',description:'Acceso independiente para pacientes, separado de la aplicación clínica.',status:'Denty Paciente disponible en preview',hint:'Tratamiento, citas, pagos y documentos en un espacio separado. La autenticación segura llegará con el backend.'}
};
const ICON_MARKUP = {
  menu:'<path d="M4 7H20"></path><path d="M4 12H20"></path><path d="M4 17H20"></path>',
  search:'<circle cx="11" cy="11" r="5.5"></circle><path d="M16 16L20 20"></path>',
  undo:'<path d="M9 7L5 11L9 15"></path><path d="M6 11H13.5C17.1 11 19 9.2 19 6.5S17.2 2 14.4 2H11"></path>',
  voice:'<rect x="9" y="3.5" width="6" height="11" rx="3"></rect><path d="M6 11.5C6 14.8 8.7 17.5 12 17.5C15.3 17.5 18 14.8 18 11.5"></path><path d="M12 17.5V20"></path><path d="M9 20H15"></path>',
  switch:'<path d="M8 6H19"></path><path d="M16 3L20 6L16 9"></path><path d="M16 18H5"></path><path d="M8 15L4 18L8 21"></path>',
  plus:'<path d="M12 5V19"></path><path d="M5 12H19"></path>',
  close:'<path d="M6 6L18 18"></path><path d="M18 6L6 18"></path>',
  back:'<path d="M14 6L8 12L14 18"></path><path d="M9 12H20"></path>',
  admin:'<path d="M12 3L18 5.5V11.3C18 15.1 15.6 18.5 12 20.2C8.4 18.5 6 15.1 6 11.3V5.5L12 3Z"></path><path d="M12 8.2V14.5"></path><path d="M9.2 11.4H14.8"></path>',
  user:'<circle cx="12" cy="8" r="3"></circle><path d="M7 18C8.5 15.5 10.1 14.3 12 14.3C13.9 14.3 15.5 15.5 17 18"></path><path d="M18.3 6.7C19.8 7.6 20.5 9 20.5 10.8C20.5 12.7 19.7 14.4 18 15.8"></path><path d="M5.7 6.7C4.2 7.6 3.5 9 3.5 10.8C3.5 12.7 4.3 14.4 6 15.8"></path>',
  patient:'<path d="M8.2 5.3C8.2 3.7 9.7 2.5 12 2.5C14.3 2.5 15.8 3.7 15.8 5.3V10.1C15.8 12 14.5 13.6 12.7 14L11.3 14C9.5 13.6 8.2 12 8.2 10.1Z"></path><path d="M10.1 14V15.5"></path><path d="M13.9 14V15.5"></path><path d="M8.9 15.6C8.2 16.2 8.2 17.2 8.8 18L10.4 20.3C10.8 20.8 11.4 20.8 12 20.2L13.6 18C14.2 17.2 14.2 16.2 13.5 15.6Z"></path>',
  doctors:'<path d="M9 4.2H15"></path><path d="M12 3V14.5"></path><path d="M8 8.2H16"></path><path d="M9.2 14.5L7.2 18.8"></path><path d="M14.8 14.5L16.8 18.8"></path><path d="M6 18.8H18"></path>',
  sites:'<path d="M12 20C12 20 6.5 14.4 6.5 10.2C6.5 6.9 8.9 4.5 12 4.5C15.1 4.5 17.5 6.9 17.5 10.2C17.5 14.4 12 20 12 20Z"></path><circle cx="12" cy="10.1" r="2.1"></circle>',
  tariffs:'<path d="M5 8.5C6.5 6.3 8.4 5 11.2 5C13.2 5 14.8 5.7 16 7"></path><path d="M7.2 12H16.8"></path><path d="M8.8 15.5H15.2"></path><path d="M12 7V18"></path>',
  labs:'<path d="M10 3.5V8.5L6.2 16.4C5.6 17.7 6.5 19.2 8 19.2H16C17.5 19.2 18.4 17.7 17.8 16.4L14 8.5V3.5"></path><path d="M9 3.5H15"></path><path d="M8 12H16"></path>',
  templates:'<rect x="5" y="6" width="14" height="11" rx="2"></rect><path d="M8 6V4.5"></path><path d="M12 6V4.5"></path><path d="M16 6V4.5"></path><path d="M8.2 10.5H15.8"></path><path d="M8.2 13.5H13"></path>',
  consents:'<path d="M8 4.5H14L17 7.5V18.5C17 19.3 16.3 20 15.5 20H8.5C7.7 20 7 19.3 7 18.5V6C7 5.2 7.6 4.5 8 4.5Z"></path><path d="M14 4.5V7.5H17"></path><path d="M9.5 11H14.5"></path><path d="M9.5 14H14.5"></path><path d="M9.5 17H12.5"></path>',
  localai:'<path d="M9 4.5H15L18.5 8V15.5L15 19H9L5.5 15.5V8Z"></path><path d="M12 8V16"></path><path d="M8.8 10.2L12 12L15.2 10.2"></path><path d="M8.8 13.8L12 12L15.2 13.8"></path>',
  sync:'<path d="M7 8C8 5.7 10 4.5 12.5 4.5C14.9 4.5 17 5.8 18 8"></path><path d="M16 6L18.5 8L16 10"></path><path d="M17 16C16 18.3 14 19.5 11.5 19.5C9.1 19.5 7 18.2 6 16"></path><path d="M8 14L5.5 16L8 18"></path>',
  assistant:'<rect x="4" y="6.5" width="16" height="11" rx="2.5"></rect><path d="M7.5 10.5H7.5"></path><path d="M10.5 10.5H10.5"></path><path d="M13.5 10.5H13.5"></path><path d="M16.5 10.5H16.5"></path><path d="M6.5 14.2H11.5"></path>',
  mcp:'<circle cx="6.5" cy="12" r="1.7"></circle><circle cx="17.5" cy="7" r="1.7"></circle><circle cx="17.5" cy="17" r="1.7"></circle><path d="M8 11.3L15.8 7.7"></path><path d="M8 12.7L15.8 16.3"></path>',
  staff:'<circle cx="12" cy="12" r="7.5"></circle><path d="M12 8V12.2L14.8 14"></path><path d="M12 4.5V6"></path>',
  users:'<circle cx="9" cy="9" r="2.6"></circle><circle cx="15.5" cy="8.2" r="2.1"></circle><path d="M5.8 17.8C6.8 15.8 8 14.8 9.6 14.8C11.2 14.8 12.4 15.8 13.4 17.8"></path><path d="M13.6 17.1C14.2 15.8 15.2 15 16.4 15C17.3 15 18.1 15.5 18.8 16.5"></path>',
  servers:'<rect x="5" y="5" width="14" height="4.2" rx="1.2"></rect><rect x="5" y="10" width="14" height="4.2" rx="1.2"></rect><rect x="5" y="15" width="14" height="4.2" rx="1.2"></rect><path d="M8 7.1H8.1"></path><path d="M8 12.1H8.1"></path><path d="M8 17.1H8.1"></path>',
  docs:'<path d="M8 4.5H14L17 7.5V18.5C17 19.3 16.3 20 15.5 20H8.5C7.7 20 7 19.3 7 18.5V6C7 5.2 7.6 4.5 8 4.5Z"></path><path d="M14 4.5V7.5H17"></path><path d="M9.5 11H14.5"></path><path d="M9.5 14H14.5"></path><path d="M9.5 17H12.5"></path><path d="M4 8.5V18.5"></path>',
  backup:'<ellipse cx="12" cy="6" rx="5.5" ry="2.5"></ellipse><path d="M6.5 6V12C6.5 13.4 9 14.5 12 14.5C15 14.5 17.5 13.4 17.5 12V6"></path><path d="M12 14.5V19"></path><path d="M9.8 16.8L12 19L14.2 16.8"></path>',
  appearance:'<path d="M12 3.5C16.7 3.5 20 6.9 20 11.6C20 15.8 17.2 18.7 13.4 18.7C12.3 18.7 11.5 17.9 11.5 16.9C11.5 16.3 11.8 15.7 12.4 15.2C13 14.7 13.3 14.1 13.3 13.4C13.3 12 12.2 11 10.8 11C9.5 11 8.3 12 8.3 13.4C8.3 14.8 7.2 15.8 5.9 15.8C4 15.8 3 14 3 12.1C3 7.5 6.8 3.5 12 3.5Z"></path><path d="M8 7.8H8.1"></path><path d="M12 6.5H12.1"></path><path d="M15.6 8.3H15.7"></path>',
  clinic:'<circle cx="12" cy="12" r="3"></circle><path d="M12 4V6"></path><path d="M12 18V20"></path><path d="M4 12H6"></path><path d="M18 12H20"></path><path d="M6.6 6.6L8 8"></path><path d="M16 16L17.4 17.4"></path><path d="M16 8L17.4 6.6"></path><path d="M6.6 17.4L8 16"></path>',
  today:'<path d="M7 5.5V3.8"></path><path d="M17 5.5V3.8"></path><rect x="4.5" y="5.5" width="15" height="13" rx="2.2"></rect><path d="M4.5 9.5H19.5"></path><path d="M9.2 13.2H9.3"></path><path d="M12 13.2H12.1"></path><path d="M14.8 13.2H14.9"></path>',
  tasks:'<path d="M8.5 6H18"></path><path d="M8.5 12H18"></path><path d="M8.5 18H18"></path><path d="M5.2 6L6.3 7.2L7.8 5.4"></path><path d="M5.2 12L6.3 13.2L7.8 11.4"></path><path d="M5.2 18L6.3 19.2L7.8 17.4"></path>',
  jobs:'<rect x="5" y="6.5" width="14" height="10.5" rx="2.2"></rect><path d="M9 6.5V5.3C9 4.6 9.6 4 10.3 4H13.7C14.4 4 15 4.6 15 5.3V6.5"></path><path d="M9.5 11.8H14.5"></path>',
  finances:'<path d="M5 8.5C5 7.1 6.1 6 7.5 6H16.5C17.9 6 19 7.1 19 8.5V15.5C19 16.9 17.9 18 16.5 18H7.5C6.1 18 5 16.9 5 15.5Z"></path><path d="M5 10.5H19"></path><path d="M14.5 14.5H16.5"></path>',
  roadmap:'<path d="M12 20C12 20 6.5 17 6.5 11.8C6.5 8.1 9.4 5.5 12 5.5C14.6 5.5 17.5 8.1 17.5 11.8C17.5 17 12 20 12 20Z"></path><path d="M12 9.5L13.4 13.4L9.5 12"></path>',
  patients:'<path d="M8.2 5.3C8.2 3.7 9.7 2.5 12 2.5C14.3 2.5 15.8 3.7 15.8 5.3V10.1C15.8 12 14.5 13.6 12.7 14L11.3 14C9.5 13.6 8.2 12 8.2 10.1Z"></path><path d="M10.1 14V15.5"></path><path d="M13.9 14V15.5"></path><path d="M8.9 15.6C8.2 16.2 8.2 17.2 8.8 18L10.4 20.3C10.8 20.8 11.4 20.8 12 20.2L13.6 18C14.2 17.2 14.2 16.2 13.5 15.6Z"></path>',
  agenda:'<path d="M7 5.5V3.8"></path><path d="M17 5.5V3.8"></path><rect x="4.5" y="5.5" width="15" height="13" rx="2.2"></rect><path d="M4.5 9.5H19.5"></path><path d="M12 12.2V15.5"></path><path d="M12 12.2L14.2 10.8"></path>',
  more:'<circle cx="6.5" cy="12" r="1.3"></circle><circle cx="12" cy="12" r="1.3"></circle><circle cx="17.5" cy="12" r="1.3"></circle><path d="M6.5 16.5V18"></path><path d="M12 6V7.5"></path><path d="M17.5 16.5V18"></path>',
  inicio:'<path d="M4.5 10.5L12 4L19.5 10.5"></path><path d="M7.2 9.8V19H16.8V9.8"></path><path d="M10.2 19V14H13.8V19"></path>',
  treatment:'<path d="M8.2 5.3C8.2 3.7 9.7 2.5 12 2.5C14.3 2.5 15.8 3.7 15.8 5.3V10.1C15.8 12 14.5 13.6 12.7 14L11.3 14C9.5 13.6 8.2 12 8.2 10.1Z"></path><path d="M10.1 14V15.5"></path><path d="M13.9 14V15.5"></path><path d="M8.9 15.6C8.2 16.2 8.2 17.2 8.8 18L10.4 20.3C10.8 20.8 11.4 20.8 12 20.2L13.6 18C14.2 17.2 14.2 16.2 13.5 15.6Z"></path><path d="M10 16.7H14"></path>',
  pagos:'<path d="M5 8.5C5 7.1 6.1 6 7.5 6H16.5C17.9 6 19 7.1 19 8.5V15.5C19 16.9 17.9 18 16.5 18H7.5C6.1 18 5 16.9 5 15.5Z"></path><path d="M5 10.5H19"></path><path d="M14.5 14.5H16.5"></path>',
  documentos:'<path d="M8 4.5H14L17 7.5V18.5C17 19.3 16.3 20 15.5 20H8.5C7.7 20 7 19.3 7 18.5V6C7 5.2 7.6 4.5 8 4.5Z"></path><path d="M14 4.5V7.5H17"></path><path d="M9.5 11H14.5"></path><path d="M9.5 14H14.5"></path><path d="M9.5 17H12.5"></path>',
  ayuda:'<circle cx="12" cy="12" r="7.5"></circle><path d="M9.5 9.3C9.9 8.2 10.8 7.5 12 7.5C13.5 7.5 14.5 8.4 14.5 9.7C14.5 10.8 13.9 11.5 12.8 12.1C11.8 12.6 11.5 13 11.5 14"></path><path d="M12 17H12.1"></path>'
};
function iconSvg(name, extraClass=''){
  const markup=ICON_MARKUP[name] || ICON_MARKUP.clinic;
  const cls=['denty-icon', extraClass].filter(Boolean).join(' ');
  return `<span class="${cls}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${markup}</svg></span>`;
}
function setIcon(node, name, extraClass=''){
  if(!node) return;
  if(name) node.dataset.iconName=name;
  const iconName=node.dataset.iconName || name || 'clinic';
  node.innerHTML=iconSvg(iconName, extraClass);
}
function hydrateIcons(root=document){
  $$('[data-icon-name]', root).forEach(node=>setIcon(node, node.dataset.iconName, node.classList.contains('nav-icon')?'denty-icon--nav':''));
}
function iconLabel(name, label, {stacked=false, subtle=false}={}){
  const cls=`inline-icon-label${stacked?' stacked':''}${subtle?' subtle':''}`;
  return `<span class="${cls}">${iconSvg(name)}<span>${esc(label)}</span></span>`;
}
const PERIO_SITE_LABELS = [
  {key:'mv', label:'MV'},
  {key:'v', label:'V'},
  {key:'dv', label:'DV'},
  {key:'ml', label:'ML/P'},
  {key:'lp', label:'L/P'},
  {key:'dl', label:'DL/P'}
];
function sanitizePerioNumber(v){ const s=String(v??'').trim(); if(!s) return ''; const n=Number(s.replace(',', '.')); if(!Number.isFinite(n)) return ''; return String(Math.max(0, Math.min(20, n))); }
function selectedOdontoTooth(od){ const preferred=String(state.selectedTooth||'11'); return od[preferred] ? preferred : (Object.keys(od)[0]||'11'); }
function perioSummary(od){ let ge4=0, ge5=0, ge6=0; for(const t of Object.keys(od)){ const vals=Object.values(od[t]?.periodontal?.depths||{}).map(v=>Number(v)).filter(n=>Number.isFinite(n)); for(const n of vals){ if(n>=4) ge4++; if(n>=5) ge5++; if(n>=6) ge6++; } } return {ge4,ge5,ge6}; }

function safeSessionGet(key){ try{return sessionStorage.getItem(key);}catch{return null;} }
function safeSessionSet(key,value){ try{sessionStorage.setItem(key,String(value));}catch{} }
function safeSessionRemove(key){ try{sessionStorage.removeItem(key);}catch{} }
function readSessionJson(key){ try{ const raw=safeSessionGet(key); return raw?JSON.parse(raw):null; }catch{return null;} }
function setSessionUser(user){
  sessionUser=user?{...user}:null;
  if(sessionUser){ db.currentUser={...sessionUser}; safeSessionSet(SESSION_USER_KEY,JSON.stringify(sessionUser)); }
  else { db.currentUser={...sharedCurrentUserSeed}; safeSessionRemove(SESSION_USER_KEY); }
}
function publishSharedState(){ try{ sharedChannel?.postMessage({type:'db-updated',at:Date.now()}); }catch{} }
function persist(){
  const sharedPayload={...db,currentUser:{...sharedCurrentUserSeed}};
  saveDb(sharedPayload, storage);
  if(sessionUser) db.currentUser={...sessionUser};
  publishSharedState();
}
function reloadSharedDb(source='external'){
  const activeSession=sessionUser?{...sessionUser}:null;
  const refreshed=loadDb(storage);
  sharedCurrentUserSeed={...(refreshed.currentUser||sharedCurrentUserSeed)};
  db=refreshed;
  if(activeSession) db.currentUser=activeSession;
  const remembered=Number(state.patientId||selectedPortalPatientId||safeSessionGet(SESSION_PATIENT_KEY)||0);
  if(selectedPortal==='patient'){
    const chosen=db.patients.find(p=>Number(p.id)===remembered&&!p.archived) || db.patients.find(p=>!p.archived) || null;
    if(chosen){ state.patientId=Number(chosen.id); selectedPortalPatientId=Number(chosen.id); safeSessionSet(SESSION_PATIENT_KEY,chosen.id); }
    state.view='patientPortal';
  }
  const shell=$('#appShell');
  if(shell && !shell.classList.contains('account-gated')) render();
  return source;
}
function scheduleSharedReload(source){ clearTimeout(sharedReloadTimer); sharedReloadTimer=setTimeout(()=>reloadSharedDb(source),20); }
function initSharedStateSync(){
  if(typeof BroadcastChannel!=='undefined'){
    try{ sharedChannel=new BroadcastChannel('denty-shared-state'); sharedChannel.onmessage=event=>{ if(event?.data?.type==='db-updated') scheduleSharedReload('broadcast'); }; }catch{}
  }
  window.addEventListener('storage',event=>{ if(event.key===DB_KEY) scheduleSharedReload('storage'); });
}

function recordAudit(action, patientId=null, detail=''){
  db.auditLog = Array.isArray(db.auditLog) ? db.auditLog : [];
  db.auditLog.unshift({id:id(db), at:new Date().toISOString(), user:'local-preview', action, patient_id:patientId, detail});
  db.auditLog = db.auditLog.slice(0,120);
}
function confirmDanger(message, action='accion sensible'){
  return confirm(`${message}\n\nSe registrara en auditoria local: ${action}`);
}
function canAccess(area){ const role=sessionUser?.role||db.currentUser?.role||'admin'; return (db.rolePermissions?.[role]||[]).includes(area) || role==='admin'; }
function requirePin(action='accion sensible'){ if(pinUnlocked||!db.security?.pin_enabled) return true; const pin=prompt(`PIN administrador para ${action}`); if(pin && `${pin}-preview`===db.security.admin_pin_hash){ pinUnlocked=true; recordAudit('pin.unlock', null, action); persist(); return true; } toast('PIN incorrecto'); return false; }
function snapshot(action='snapshot', patientId=null){ lastSnapshot = JSON.stringify(db); recordAudit(action, patientId); }
function undo(){ if(!lastSnapshot) return toast('Nada que deshacer todavía'); db = JSON.parse(lastSnapshot); persist(); lastSnapshot=null; render(); toast('Deshecho'); }
function esc(s){ return String(s??'').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function toast(text){ const el=$('#toast'); if(!el) return; el.textContent=text; el.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove('show'),2300); }
function speak(text){ try{ if(!('speechSynthesis' in window)) return; const u=new SpeechSynthesisUtterance(text); u.lang='es-ES'; speechSynthesis.cancel(); speechSynthesis.speak(u); }catch{} }
function formData(form){ return Object.fromEntries(new FormData(form).entries()); }
function activePatients(){ return db.patients.filter(p=>!p.archived); }
function patient(id){ return db.patients.find(p=>Number(p.id)===Number(id)); }
function emp(id){ return db.employees.find(e=>Number(e.id)===Number(id)); }
function currentPatient(){ return patient(state.patientId) || activePatients()[0] || null; }
function applyPreviewRouteFromQuery(){
  const params=new URLSearchParams(window.location.search||'');
  if(params.has('patient-portal')){
    selectedPortal='patient';
    safePortalStorage('set','patient');
    const requested=Number(params.get('patient-portal')||safeSessionGet(SESSION_PATIENT_KEY)||0);
    const chosen=db.patients.find(p=>Number(p.id)===requested&&!p.archived) || activePatients()[0] || null;
    if(chosen){ state.patientId=Number(chosen.id); selectedPortalPatientId=Number(chosen.id); safeSessionSet(SESSION_PATIENT_KEY,chosen.id); }
    setSessionUser({id:`patient-${state.patientId||'preview'}`,name:chosen?patientFullName(chosen):'Paciente',role:'patient',patient_id:state.patientId||null});
    const p=portalPatient();
    state.view='patientPortal';
    state.patientId=p.id;
    state.patientPortalTab='inicio';
    const gateway=$('#accountGateway'), shell=$('#appShell');
    if(gateway) gateway.hidden=true;
    if(shell){ shell.classList.remove('account-gated'); if(selectedPortal==='patient') shell.classList.add('patient-portal-mode'); else shell.classList.remove('patient-portal-mode'); shell.setAttribute('aria-hidden','false'); }
    return;
  }
  if(!params.has('treatment-panel')) return;
  let p=currentPatient();
  if(!p){
    p=createPatient(db,{first_name:'Paciente',last_name:'Demo',phone:'',email:'',ficha:'DEMO'});
    persist();
  }
  state.view='patientDetail';
  state.patientId=p.id;
  state.patientTab='tratamiento';
}
const VIEW_PERMISSION={patients:'pacientes',patientDetail:'pacientes',agenda:'agenda',odontogram:'clinica',jobs:'clinica',finances:'finanzas',staff:'ajustes',templates:'documentos',assistant:'clinica',import:'ajustes'};
const ADMIN_ONLY_VIEWS = new Set(['settings','staff','import']);
function isAdminOnlyView(view){ return ADMIN_ONLY_VIEWS.has(view); }
function isAdminPortal(){ return selectedPortal==='admin' || sessionUser?.role==='admin'; }
function canOpenView(view){ if(selectedPortal==='patient') return view==='patientPortal'; const area=VIEW_PERMISSION[view]; if(isAdminOnlyView(view) && !isAdminPortal()) return false; return !area || canAccess(area); }
function setView(view, extras={}){ if(!canOpenView(view)){ closeDrawer(); toast(isAdminOnlyView(view)?'Solo administrador puede abrir esta seccion':'Tu usuario no tiene permiso para abrir esta seccion'); return; } state = {...state, ...extras, view}; if(view!=='agenda') state.agendaQuickId=null; closeDrawer(); render(); window.scrollTo({top:0,behavior:'smooth'}); }

function render(){
  syncNav();
  const main=$('#main');
  if(main) main.dataset.view=state.view;
  if(state.view!==previousViewForMotion) animatePageTransition(main);
  if(state.view==='today') main.innerHTML=renderToday();
  else if(state.view==='patients') main.innerHTML=renderPatients();
  else if(state.view==='patientDetail') main.innerHTML=renderPatientDetail();
  else if(state.view==='patientPortal') main.innerHTML=renderPatientPortal();
  else if(state.view==='agenda') main.innerHTML=renderAgenda();
  else if(state.view==='tasks') main.innerHTML=renderTasks();
  else if(state.view==='odontogram') main.innerHTML=renderOdontogram();
  else if(state.view==='assistant') main.innerHTML=renderAssistant();
  else if(state.view==='import') main.innerHTML=renderImport();
  else if(state.view==='templates') main.innerHTML=renderTemplates();
  else if(state.view==='staff') main.innerHTML=renderStaff();
  else if(state.view==='settings') main.innerHTML=renderSettings();
  else if(state.view==='jobs') main.innerHTML=renderJobsDashboard();
  else if(state.view==='finances') main.innerHTML=renderFinancesDashboard();
  else main.innerHTML=renderPlaceholder(state.view);
  addCinematicDepthScene(main);
  setupScrollReveal(main);
  bindScreen();
  hydrateIcons();
  window.dispatchEvent(new CustomEvent('denty:render'));
  previousViewForMotion=state.view;
}
function animatePageTransition(main){ if(!main) return; main.classList.remove('page-transition-enter'); void main.offsetWidth; main.classList.add('page-transition-enter'); }
function addCinematicDepthScene(main){ if(!main||state.view==='odontogram') return; const section=main.querySelector('section'); if(!section||section.querySelector('.cinematic-depth-scene')) return; section.insertAdjacentHTML('afterbegin','<div class="cinematic-depth-scene" aria-hidden="true"><span class="depth-plane depth-plane-a"></span><span class="depth-plane depth-plane-b"></span><span class="depth-line depth-line-a"></span><span class="depth-line depth-line-b"></span></div>'); }
function setupScrollReveal(root=document){ const nodes=$$('section > .card, section > article, .patient-card, .appt-card, .finance-row, .lab-work-card, .clinical-legend-card', root); nodes.forEach((el,i)=>{ el.classList.add('scroll-reveal'); el.style.setProperty('--reveal-delay', `${Math.min(i,10)*28}ms`); }); if(!('IntersectionObserver' in window)){ nodes.forEach(el=>el.classList.add('visible')); return; } const io=new IntersectionObserver(entries=>{ entries.forEach(entry=>{ if(entry.isIntersecting){ entry.target.classList.add('visible'); io.unobserve(entry.target); } }); },{threshold:.08, rootMargin:'0px 0px -30px 0px'}); nodes.forEach(el=>io.observe(el)); }
function syncNav(){
  $$('.bottom-nav button').forEach(b=>b.classList.toggle('active', b.dataset.go===state.view || (state.view==='patientDetail'&&b.dataset.go==='patients') || (state.view==='odontogram'&&b.dataset.go==='patients')));
  $$('[data-go]').forEach(el=>{ if(isAdminOnlyView(el.dataset.go)) el.hidden=!isAdminPortal(); });
}
function safePortalStorage(action, value=null){
  try{
    if(action==='set') sessionStorage.setItem('denty.selectedPortal',value);
    else if(action==='remove') sessionStorage.removeItem('denty.selectedPortal');
    else if(action==='get') return sessionStorage.getItem('denty.selectedPortal');
  }catch{}
  return null;
}
function showAccountChooser(){
  selectedPortal=null;
  safePortalStorage('remove');
  setSessionUser(null);
  const gateway=$('#accountGateway'), chooser=$('#accountChooser'), stage=$('#accountAccessStage'), picker=$('#accountPatientPicker'), shell=$('#appShell');
  if(gateway) gateway.hidden=false;
  if(chooser) chooser.hidden=false;
  if(stage) stage.hidden=true;
  if(picker) picker.hidden=true;
  if(shell){ shell.classList.add('account-gated'); shell.classList.remove('patient-portal-mode'); shell.setAttribute('aria-hidden','true'); }
  document.title='Denty · Acceso';
}
function populatePatientAccountSelect(){
  const select=$('#accountPatientSelect'); if(!select) return null;
  const patients=activePatients();
  select.innerHTML=patients.length?patients.map(p=>`<option value="${p.id}">${esc(patientFullName(p))}${p.ficha?` · ${esc(p.ficha)}`:''}</option>`).join(''):'<option value="">No hay pacientes disponibles</option>';
  const preferred=patients.find(p=>Number(p.id)===Number(selectedPortalPatientId||state.patientId)) || patients[0] || null;
  if(preferred){ select.value=String(preferred.id); selectedPortalPatientId=Number(preferred.id); }
  return preferred;
}
function showAccountAccess(type){
  const portal=ACCOUNT_PORTALS[type]; if(!portal) return;
  const chooser=$('#accountChooser'), stage=$('#accountAccessStage'), icon=$('#accountAccessIcon'), title=$('#accountAccessTitle'), description=$('#accountAccessDescription'), status=$('#accountAccessStatus'), hint=$('#accountAccessHint'), btn=$('#accountContinue');
  if(!chooser||!stage||!icon||!title||!description||!status||!hint||!btn) return;
  selectedPortal=type;
  safePortalStorage('set',type);
  chooser.hidden=true;
  stage.hidden=false;
  if(typeof setIcon==='function') setIcon(icon, portal.icon); else icon.textContent=portal.icon;
  title.textContent=portal.title;
  description.textContent=portal.description;
  status.textContent=portal.status;
  hint.textContent=portal.hint;
  const picker=$('#accountPatientPicker');
  if(picker) picker.hidden=type!=='patient';
  if(type==='patient'){
    const preferred=populatePatientAccountSelect();
    status.textContent=preferred?`Probar como ${patientFullName(preferred)}`:'No hay pacientes para abrir';
    hint.textContent=preferred?'Esta cuenta leerá exactamente la misma ficha que modifica la clínica.':'Crea primero un paciente desde la cuenta Administrador.';
  }
  btn.disabled=type==='patient'&&!activePatients().length;
  btn.textContent=selectedPortal==='patient'?'Entrar a Denty Paciente':'Continuar a Denty';
}
function applyPortalRole(type){
  if(type==='admin'){
    const admin=(db.users||[]).find(u=>u.active!==false&&u.role==='admin') || {id:11,name:'Administrador clinico',role:'admin'};
    setSessionUser({id:admin.id,name:admin.name,role:'admin'});
  } else if(selectedPortal==='user' || type==='user'){
    const user=(db.users||[]).find(u=>u.active!==false&&u.role!=='admin') || {id:12,name:'Usuario operativo',role:'dentist'};
    setSessionUser({id:user.id,name:user.name,role:user.role,employee_id:user.employee_id??null});
    if(isAdminOnlyView(state.view)) state.view='today';
    pinUnlocked=false;
  }
}
function enterSelectedPortal(){
  if(!selectedPortal) return showAccountChooser();
  if(selectedPortal==='patient'){
    const select=$('#accountPatientSelect');
    const patientId=Number(select?.value||selectedPortalPatientId||0);
    const p=patient(patientId);
    if(!p) return toast('Selecciona un paciente disponible');
    selectedPortalPatientId=patientId; state.patientId=patientId; state.view='patientPortal'; state.patientPortalTab='inicio';
    safeSessionSet(SESSION_PATIENT_KEY,patientId);
    setSessionUser({id:`patient-${patientId}`,name:patientFullName(p),role:'patient',patient_id:patientId});
  } else {
    applyPortalRole(selectedPortal);
    safeSessionRemove(SESSION_PATIENT_KEY);
  }
  const gateway=$('#accountGateway'), shell=$('#appShell');
  if(gateway) gateway.hidden=true;
  if(shell){ shell.classList.remove('account-gated'); if(selectedPortal==='patient') shell.classList.add('patient-portal-mode'); else shell.classList.remove('patient-portal-mode'); shell.setAttribute('aria-hidden','false'); }
  document.title=selectedPortal==='patient'?'Denty Paciente':'Denty Clínica';
  syncNav();
  if(typeof render==='function') render();
  window.scrollTo({top:0,behavior:'auto'});
}
function bindClick(selector, handler){ const el=$(selector); if(el) el.onclick=handler; return el; }
function bindAccountGateway(){
  $$('[data-account-type]').forEach(btn=>btn.onclick=()=>showAccountAccess(btn.dataset.accountType));
  bindClick('#accountBack',showAccountChooser);
  bindClick('#accountContinue',enterSelectedPortal);
  const patientSelect=$('#accountPatientSelect'); if(patientSelect) patientSelect.onchange=()=>{ selectedPortalPatientId=Number(patientSelect.value||0)||null; if(selectedPortalPatientId) safeSessionSet(SESSION_PATIENT_KEY,selectedPortalPatientId); };
  if(typeof hydrateIcons==='function') hydrateIcons();
  showAccountChooser();
}

function bindTop(){
  bindClick('#drawerOpen',openDrawer); bindClick('#drawerClose',closeDrawer); bindClick('#scrim',closeDrawer); bindClick('#accountSwitchBtn',showAccountChooser);
  bindClick('#quickAddBtn',()=>{ if(state.view==='agenda') openAppointmentModal(); else openPatientModal(); });
  bindClick('#searchToggle',()=>setView('patients')); bindClick('#undoBtn',undo);
  bindClick('#globalVoiceBtn',startSpeech);
  $$('[data-go]').forEach(el=>el.onclick=()=>setView(el.dataset.go, {settingsPanel:el.dataset.panel||state.settingsPanel}));
}
function openDrawer(){ const drawer=$('#drawer'), scrim=$('#scrim'); if(drawer){ drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false'); } if(scrim) scrim.classList.add('show'); }
function closeDrawer(){ const drawer=$('#drawer'), scrim=$('#scrim'); if(drawer){ drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); } if(scrim) scrim.classList.remove('show'); }

function renderToday(){
  const c=agendaCounters(db,today());
  const todays=agendaByDoctors(db,today()).flatMap(x=>x.appointments.map(a=>({...a,employee:x.employee}))).slice(0,4);
  return `<section><div class="page-head"><div><h1>Hoy</h1><p>${prettyDate(today())}</p></div><button class="primary" data-open-task>+ Tarea</button></div>
    <article class="card attention-card" data-go="assistant"><span class="big-check">✓</span><div><p>Siguiente acción</p><h2>${c.conflicts?'Revisar agenda':'Todo bajo control'}</h2><span>${c.conflicts?`${c.conflicts} cita(s) con aviso`:'No hay una acción urgente ahora mismo'}</span></div><b>›</b></article>
    <div class="stats-grid"><div class="stat-card"><p>Citas</p><b>${c.total}</b><span>${c.confirmed} confirmadas</span></div><div class="stat-card"><p>En espera</p><b>${c.waiting}</b></div><div class="stat-card"><p>Solapes</p><b>${c.overlaps}</b></div><div class="stat-card"><p>Pacientes</p><b>${activePatients().length}</b></div></div>
    <article class="card"><div class="section-title"><h2>Agenda de hoy</h2><button class="ghost" data-go="agenda">Abrir agenda</button></div>${todays.length?todays.map(apptCard).join(''):'<div class="empty-state">Sin citas hoy.</div>'}</article>
    <article class="card"><div class="section-title"><h2>Necesita atención</h2><button class="ghost" data-go="tasks">Ver todo</button></div><div class="empty-state">Todo al día ✓</div></article></section>`;
}


function quickTaskButtons(){
  return `<div class="quick-task-grid"><button type="button" class="quick-task-card" data-quick-task="patient"><span>👤</span><strong>Crear paciente</strong><small>Alta rápida de una nueva ficha</small></button><button type="button" class="quick-task-card" data-quick-task="payment"><span>€</span><strong>Cobrar</strong><small>Registrar tarjeta, efectivo o transferencia</small></button><button type="button" class="quick-task-card" data-quick-task="appointment"><span>▦</span><strong>Dar cita</strong><small>Abrir agenda y crear una cita</small></button><button type="button" class="quick-task-card" data-quick-task="lab"><span>▣</span><strong>Recibir laboratorio</strong><small>Registrar un trabajo que acaba de llegar</small></button></div>`;
}
function renderTasks(){
  const pending=(db.tasks||[]).filter(t=>t.status!=='hecha'&&t.status!=='completada');
  const done=(db.tasks||[]).filter(t=>t.status==='hecha'||t.status==='completada').slice(-8).reverse();
  const row=t=>{ const p=t.patient_id?patient(t.patient_id):null; return `<article class="card task-row"><div><strong>${esc(t.title||'Tarea')}</strong><small>${p?esc(patientFullName(p))+' · ':''}${esc(t.due_date||'sin fecha')} · ${esc(t.status||'pendiente')}</small></div>${t.status==='hecha'||t.status==='completada'?'<span class="ok-banner">Hecha</span>':`<button class="ghost" data-task-done="${t.id}">Marcar hecha</button>`}</article>`; };
  return `<section><div class="page-head"><div><h1>Tareas y acciones rápidas</h1><p>Lo cotidiano de recepción y clínica en dos toques o por voz.</p></div><button class="primary" data-open-task>+ Acción rápida</button></div><article class="card quick-task-panel"><h2>Acciones rápidas</h2>${quickTaskButtons()}</article><div class="section-title"><h2>Pendientes</h2><span>${pending.length}</span></div>${pending.length?pending.map(row).join(''):'<div class="empty-state">No hay tareas pendientes.</div>'}${done.length?`<div class="section-title"><h2>Completadas recientes</h2></div>${done.map(row).join('')}`:''}</section>`;
}
function openQuickTaskModal(){
  const modal=$('#quickTaskModal');
  modal.innerHTML=`<form method="dialog" class="modal-card quick-task-modal"><div class="modal-title"><div><h2>¿Qué quieres hacer?</h2><p>Acciones rápidas de Denty</p></div><button class="icon-btn" type="button" data-dialog-close  value="cancel" aria-label="Cerrar">×</button></div>${quickTaskButtons()}</form>`;
  modal.showModal();
  $$('[data-quick-task]',modal).forEach(btn=>btn.onclick=()=>{
    const action=btn.dataset.quickTask; modal.close();
    if(action==='patient') return openPatientModal();
    if(action==='payment') return openPaymentModal(null,state.patientId);
    if(action==='appointment') return openAppointmentModal({patient_id:state.patientId||undefined,date:state.date||today()});
    if(action==='lab') return openWorkModal({patient_id:state.patientId||undefined,status:'recibido'});
  });
}
function completeTask(taskId){
  const task=(db.tasks||[]).find(t=>Number(t.id)===Number(taskId)); if(!task) return;
  snapshot('task.complete',task.patient_id||null); task.status='hecha'; task.completed_at=new Date().toISOString(); persist(); render(); toast('Tarea completada');
}

function renderPatients(){
  const list = db.patients.filter(p => state.trash ? p.archived : !p.archived);
  return `<section><div class="page-head"><div><h1>Pacientes</h1><p>Ficha única para agenda, trabajos, documentos y cobros.</p></div><button class="primary" id="openPatientModal">+ Paciente</button></div>
  <input id="patientSearch" class="big-search" placeholder="Buscar por nombre, teléfono o nº ficha" autocomplete="off" />
  <div class="pill-row"><button class="ghost" data-go="import">Importar</button><button class="ghost ${state.trash?'active':''}" id="toggleTrash">${state.trash?'Lista normal':'Papelera'}</button></div>
  <div id="patientList" class="patient-list">${patientListHtml(list)}</div></section>`;
}
function patientListHtml(list){ return list.length?list.map(p=>`<button class="patient-card" data-open-patient="${p.id}"><span class="avatar">${esc(initials(p))}</span><span><strong>${esc(patientFullName(p))}</strong><small>${esc(p.phone||'Sin teléfono')} ${p.ficha?'· Ficha '+esc(p.ficha):''}</small></span><span>›</span></button>`).join(''):`<div class="empty-state">${state.trash?'No hay pacientes en papelera.':'Todavía no hay pacientes.'}</div>`; }
function filterPatients(q){ const n=normalizeText(q); const list=db.patients.filter(p=>(state.trash?p.archived:!p.archived) && (!n||normalizeText(`${p.ficha} ${patientFullName(p)} ${p.phone} ${p.dni}`).includes(n))); $('#patientList').innerHTML=patientListHtml(list); bindPatientCards(); }
function bindPatientCards(){ $$('[data-open-patient]').forEach(b=>b.onclick=()=>setView('patientDetail',{patientId:Number(b.dataset.openPatient),patientTab:'resumen'})); }

function legacyRenderPatientDetail(){
  const p=patient(state.patientId); if(!p) return `<button class="ghost" data-go="patients">‹ Pacientes</button><div class="empty-state">Paciente no encontrado.</div>`;
  const apps=db.appointments.filter(a=>Number(a.patient_id)===Number(p.id));
  const docs=db.documents.filter(d=>Number(d.patient_id)===Number(p.id));
  const works=db.works.filter(w=>Number(w.patient_id)===Number(p.id));
  const pending=db.budgets.filter(b=>Number(b.patient_id)===Number(p.id)).reduce((s,b)=>s+Number(b.pending||b.total||0),0);
  const next=apps.filter(a=>a.date>=today()).sort((a,b)=>(a.date+a.start_time).localeCompare(b.date+b.start_time))[0];
  return `<section><button class="ghost" data-go="patients">‹ Pacientes</button>
  <article class="card patient-profile"><div class="patient-hero"><div class="avatar">${esc(initials(p))}</div><div><h1>${esc(patientFullName(p))}</h1><div class="patient-meta"><span>☎ ${esc(p.phone||'—')}</span><span>✉ ${esc(p.email||'Sin email')}</span>${p.ficha?`<span>Nº ficha ${esc(p.ficha)}</span>`:''}</div></div></div>
  <div class="stats-grid"><div class="metric"><div class="k">Próxima cita</div><div class="v" style="font-size:22px">${next?esc(next.date+' '+next.start_time):'Sin cita'}</div></div><div class="metric"><div class="k">Trabajos activos</div><div class="v">${works.length}</div></div><div class="metric"><div class="k">Pendiente</div><div class="v money">${pending.toFixed(2)} €</div></div><div class="metric"><div class="k">Docs firmados</div><div class="v">${docs.filter(d=>d.status==='firmado').length}</div></div></div>
  <div class="patient-primary-actions"><button class="primary" id="patientNewAppointment">Nueva cita</button><button class="ghost" id="patientNewPlan">Plan tratamiento</button><button class="ghost" id="patientNewWork">Nuevo trabajo</button><button class="ghost" id="patientNewBudget">Nuevo presupuesto</button><button class="ghost" id="patientPayment">Registrar pago</button></div>
  <div class="action-grid">${patientDetailActions().filter(a=>!['appointment','work','budget','payment'].includes(a.id)).map(a=>`<button class="${a.id==='odontogram'?'primary':'ghost'}" data-patient-action="${a.id}" id="${a.id==='odontogram'?'patientOpenOdontogram':a.id==='documents'?'patientOpenDocuments':''}">${esc(a.label)}</button>`).join('')}<button class="danger" id="archivePatientBtn">Archivar paciente</button></div></article>
  <article class="card denty-box"><h2>Denty Box Ambiental</h2><p>Acciones rápidas, notas y comandos del paciente.</p><button class="ghost" data-go="assistant">Abrir comandos</button></article>
  <div class="tabs">${['resumen','tratamiento','planificacion','agenda','trabajos','presupuestos','documentos','alertas','comentarios','archivos'].map(t=>`<button class="tab ${state.patientTab===t?'active':''}" data-ptab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
  <div id="patientTabBody">${renderPatientTab(p)}</div></section>`;
}
function treatmentDatePlus(dateValue, days){
  if(!dateValue) return '';
  const date=new Date(`${dateValue}T12:00:00`);
  if(Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate()+Number(days||0));
  return date.toISOString().slice(0,10);
}
function treatmentDoneStatus(value){
  const n=normalizeText(value||'');
  return ['hecho','completado','terminado','entregado','done','finalizado'].some(x=>n.includes(x));
}
function treatmentStepStatus(step, index, currentIndex){
  if(treatmentDoneStatus(step.status)) return 'done';
  if(index===currentIndex) return 'current';
  return 'pending';
}
function patientTreatmentSnapshot(p){
  const patientId=Number(p.id);
  const apps=db.appointments.filter(a=>Number(a.patient_id)===patientId).sort((a,b)=>(a.date+a.start_time).localeCompare(b.date+b.start_time));
  const next=apps.find(a=>a.date>=today());
  const rows=budgetFinancialRows(patientId);
  const total=rows.reduce((s,b)=>s+Number(b.total||0),0);
  const paid=rows.reduce((s,b)=>s+Number(b.paid||0),0);
  const pending=rows.reduce((s,b)=>s+Number(b.pending||0),0);
  const plans=treatmentPlanHierarchy(db,patientId);
  const steps=patientTreatmentRoute(db,patientId);
  const doneCount=steps.filter(step=>treatmentDoneStatus(step.status)).length;
  const firstPendingIndex=steps.findIndex(step=>!treatmentDoneStatus(step.status));
  const currentIndex=firstPendingIndex===-1?Math.max(0,steps.length-1):firstPendingIndex;
  const current=steps[currentIndex]||null;
  const progress=steps.length?Math.round(doneCount/steps.length*100):0;
  const estimatedDate=(steps.map(s=>s.deadline).filter(Boolean).sort().at(-1)) || '';
  const unsigned=(db.documents||[]).filter(d=>Number(d.patient_id)===patientId&&d.status!=='firmado');
  const phase=current?.phase||plans[0]?.title||(next?.reason?`Cita: ${next.reason}`:'Sin ruta clinica definida');
  const treatmentRealized=steps.length?Math.round((total||paid||0)*(doneCount/Math.max(steps.length,1))):paid;
  const future=Math.max(0,(total||pending||0)-treatmentRealized);
  let decision='Confirmar la siguiente cita para que el plan no se desordene.';
  if(unsigned.length) decision='Firmar o revisar el consentimiento pendiente antes de continuar.';
  else if(pending>0) decision='Elegir forma de pago o registrar el siguiente abono.';
  else if(!next) decision='Agendar la proxima fase del tratamiento.';
  return {apps,next,rows,total,paid,pending,plans,steps,doneCount,currentIndex,current,progress,estimatedDate,unsigned,phase,treatmentRealized,future,decision};
}
function renderTreatmentControlPanel(p){
  const s=patientTreatmentSnapshot(p);
  const timeline=s.steps;
  const currentIndex=s.currentIndex;
  const delayDate=s.estimatedDate?treatmentDatePlus(s.estimatedDate,14):'';
  const nextLabel=s.next?`${s.next.date} ${s.next.start_time||''}`:'Sin cita programada';
  return `<article class="card treatment-control-panel"><div class="section-title"><div><h2>Tu tratamiento ahora</h2><p>${esc(patientFullName(p))} · ${esc(s.phase)}</p></div><span class="priority-badge media">${s.progress}%</span></div><div class="treatment-progress-bar" aria-label="Progreso del tratamiento"><span style="width:${s.progress}%"></span></div><div class="treatment-now-grid"><div><small>Fase actual</small><strong>${esc(s.current?.title||s.phase)}</strong><span>${esc(s.current?.detail||'Plan activo con seguimiento clinico.')}</span></div><div><small>Proxima cita</small><strong>${esc(nextLabel)}</strong><span>${s.next?esc(s.next.reason||'Revision planificada'):'Agenda la siguiente visita'}</span><button class="ghost mini" data-ptab="agenda">Ver agenda</button></div><div><small>Finalizacion estimada</small><strong>${esc(s.estimatedDate||'Pendiente')}</strong><span>Puede cambiar segun asistencia, pruebas y respuesta clinica.</span></div></div><div class="treatment-impact"><strong>Impacto de retrasar</strong><p>Si se retrasa la proxima visita, la finalizacion podria moverse ${delayDate?`hasta ${esc(delayDate)}`:'entre 2 y 3 semanas'} y algunas pruebas podrian repetirse.</p></div><div class="treatment-money-grid"><div><small>Total aceptado</small><strong>${s.total.toFixed(2)} EUR</strong></div><div><small>Ya realizado</small><strong>${s.treatmentRealized.toFixed(2)} EUR</strong></div><div><small>Ya pagado</small><strong>${s.paid.toFixed(2)} EUR</strong></div><div><small>Pendiente de pago</small><strong>${s.pending.toFixed(2)} EUR</strong></div><div><small>Tratamiento futuro</small><strong>${s.future.toFixed(2)} EUR</strong></div></div><div class="toolbar"><button class="ghost" data-ptab="presupuestos">Ver presupuestos</button><button class="ghost" data-ptab="archivos">Archivos clinicos</button><button class="ghost" data-ptab="planificacion">Planificacion</button></div><section class="treatment-decision"><small>Proxima decision</small><strong>${esc(s.decision)}</strong><div class="toolbar"><button class="primary mini" data-ptab="agenda">Resolver ahora</button><button class="ghost mini" data-ptab="documentos">Documentos</button></div></section><div class="treatment-timeline">${timeline.length?timeline.map((step,index)=>`<div class="timeline-phase ${treatmentStepStatus(step,index,currentIndex)}"><span>${index+1}</span><div><strong>${esc(step.title||step.phase||'Fase')}</strong><small>${esc(step.phase||'Tratamiento')} · ${esc(step.status||'pendiente')}</small></div></div>`).join(''):'<div class="empty-state">Todavia no hay una secuencia clinica definida. Crea o completa el plan de tratamiento para construir una ruta real.</div>'}</div></article>`;
}
function renderPatientTab(p){
  const id=p.id;
  if(state.patientTab==='resumen') return `<div class="card flat"><div class="section-title"><h2>Estado del caso</h2><button class="ghost" data-patient-action="odontogram">Abrir odontograma</button></div><div class="list"><div>📄 Documentos firmados: <strong>${db.documents.filter(d=>d.patient_id===id&&d.status==='firmado').length}</strong></div><div>🧩 Trabajos activos: <strong>${db.works.filter(w=>w.patient_id===id).length}</strong></div><div>📁 Archivos: <strong>${db.files.filter(f=>f.patient_id===id).length}</strong></div></div><div style="margin-top:14px">${miniOdonto(id)}</div></div>`;
  if(state.patientTab==='tratamiento') return renderTreatmentControlPanel(p);
  if(state.patientTab==='planificacion') return renderPlanningTab(p);
  if(state.patientTab==='agenda'){ const aps=db.appointments.filter(a=>Number(a.patient_id)===Number(id)).sort((a,b)=>(b.date+b.start_time).localeCompare(a.date+a.start_time)); return `<div class="toolbar"><button class="primary" id="tabNewAppointment">+ Cita del paciente</button></div>${aps.length?aps.map(apptCard).join(''):'<div class="empty-state">Sin citas.</div>'}`; }
  if(state.patientTab==='trabajos') return renderPatientWorksTab(p);
  if(state.patientTab==='presupuestos') return renderPatientBudgetsTab(p);
  if(state.patientTab==='documentos') return renderDocumentsTab(p);
  if(state.patientTab==='alertas') return renderAlertsTab(p);
  if(state.patientTab==='comentarios') return renderCommentsTab(p);
  if(state.patientTab==='archivos') return renderFilesTab(p);
  if(state.patientTab==='imprimir') return renderPrintableDocumentCenter(p);
  return '';
}

function legacyRenderPlanningTab(p){
  const plans=treatmentPlanHierarchy(db,p.id);
  return `<div class="toolbar"><button class="primary" id="newTreatmentPlan">+ Plan jerárquico</button></div>${plans.length?plans.map(plan=>`<article class="plan-card"><div class="section-title"><div><h2>${esc(plan.title)}</h2><p>${esc(plan.priority||'media')} · plazo ${esc(plan.deadline||'sin plazo')} · ${esc(plan.status||'activo')}</p></div><span class="priority-badge ${esc(plan.priority||'media')}">${esc(plan.priority||'media')}</span></div><div class="plan-steps">${plan.steps.map(step=>`<div class="plan-step ${esc(step.status||'pendiente')}"><div class="step-order">${Number(step.order||1)}</div><div><strong>${esc(step.title)}</strong><small>${esc(step.phase||'Tratamiento')} · ${esc(step.reason||'Motivo clínico')} · ${Number(step.duration||45)} min</small><p>${esc(step.detail||'Sin detalle clínico añadido')}</p></div><button class="ghost mini" data-schedule-step="${plan.id}:${step.id}">${step.status==='agendada'?'Reagendar':'Agendar'}</button></div>`).join('')}</div></article>`).join(''):'<div class="empty-state">Sin planificación todavía. Crea un plan por jerarquía clínica.</div>'}`;
}
function openTreatmentPlanModal(){
  const p=patient(state.patientId); if(!p)return toast('Elige paciente');
  const modal=$('#consentModal');
  modal.innerHTML=`<form id="planForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Nuevo plan de tratamiento</h2><button class="icon-btn" type="button" data-dialog-close value="cancel">×</button></div><div class="form-grid"><label class="field">Tipo<select name="kind"><option value="general">General</option><option value="implantes">Implantes</option><option value="endo">Endodoncia</option><option value="perio">Periodontal</option></select></label><label class="field">Prioridad<select name="priority"><option value="urgente">Urgente</option><option value="alta">Alta</option><option value="media" selected>Media</option><option value="baja">Baja</option></select></label><label class="field">Plazo clínico<input name="deadline" type="date" value="${today()}"></label></div><label class="field">Título del plan<input name="title" value="Plan integral ${esc(patientFullName(p))}"></label><p class="tiny">Denty crea pasos por jerarquía: urgencia/diagnóstico → tratamiento causal → rehabilitación → control/mantenimiento.</p><button class="primary">Crear plan</button></form>`;
  modal.showModal();
  $('#planForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); snapshot(); createTreatmentPlan(db,{patient_id:p.id,title:d.title,priority:d.priority,deadline:d.deadline,kind:d.kind}); persist(); modal.close(); state.patientTab='planificacion'; render(); toast('Plan creado por jerarquía clínica'); };
}
function schedulePlanStep(key){
  const [planId, stepId]=String(key).split(':').map(Number);
  const modal=$('#appointmentModal'); const p=patient(state.patientId); if(!p)return;
  const plan=(db.treatmentPlans||[]).find(x=>Number(x.id)===planId); const step=plan?.steps?.find(x=>Number(x.id)===stepId); if(!step)return toast('Paso no encontrado');
  modal.innerHTML=`<form id="scheduleStepForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Agendar paso</h2><button class="icon-btn" type="button" data-dialog-close value="cancel">×</button></div><p><strong>${esc(step.title)}</strong><br><small>${esc(step.phase)} · ${esc(step.reason)}</small></p><div class="form-grid"><label class="field">Doctor<select name="employee_id">${db.employees.filter(e=>e.active!==false).map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></label><label class="field">Fecha<input name="date" type="date" value="${state.date||today()}"></label><label class="field">Hora<input name="start_time" type="time" value="10:00"></label><label class="field">Sede<input name="site" value="${esc(db.sites?.[0]?.name||'')}"></label></div><label class="field">Motivo de visita<input name="reason" value="${esc(step.reason||step.title)}"></label><label class="field">Detalle clínico de la cita<textarea name="detail">${esc(step.detail||'')}</textarea></label><button class="primary">Agendar en la cita</button></form>`;
  modal.showModal();
  $('#scheduleStepForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); snapshot(); step.reason=d.reason; step.detail=d.detail; schedulePlanStepToAgenda(db,{plan_id:planId,step_id:stepId,date:d.date,start_time:d.start_time,employee_id:Number(d.employee_id),site:d.site}); persist(); modal.close(); state.patientTab='agenda'; render(); toast('Paso añadido a la agenda'); };
}

function legacyRenderDocumentsTab(p){
  const docs=db.documents.filter(d=>Number(d.patient_id)===Number(p.id)).sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
  return `<div class="toolbar"><button class="primary" id="newConsentDoc">Nuevo consentimiento</button></div>${docs.length?docs.map(d=>`<article class="doc-card"><div class="section-title"><h2>${esc(d.title)}</h2><span class="${d.status==='firmado'?'ok-banner':'warn-banner'}">${esc(d.status)}</span></div><p>${esc(d.text)}</p><small>v${d.version||1} ${d.signed_at?'· firmado '+new Date(d.signed_at).toLocaleString('es-ES'):''} ${d.hash?'· hash '+esc(d.hash.slice(0,16)):' '}</small>${d.signature_data?`<img class="doc-signature" src="${esc(d.signature_data)}" alt="Firma guardada" />`:''}<div class="toolbar"><button class="ghost" data-view-doc="${d.id}">Ver</button><button class="primary" data-sign-doc="${d.id}">${d.status==='firmado'?'Re-firmar':'Firmar'}</button></div></article>`).join(''):'<div class="empty-state">Sin documentos firmados.</div>'}`;
}
function legacyRenderAlertsTab(p){ const list=db.clinicalAlerts.filter(a=>Number(a.patient_id)===Number(p.id)); return `<div class="toolbar"><button class="primary" id="addAlert">+ Alerta clínica</button></div>${list.map(a=>`<div class="danger-banner"><strong>${esc(a.type||'Alerta')}</strong><div>${esc(a.text||'')}</div></div>`).join('')||'<div class="empty-state">Sin alertas clínicas.</div>'}`; }
function renderCommentsTab(p){ const list=db.comments.filter(c=>Number(c.patient_id)===Number(p.id)); return `<div class="toolbar"><button class="primary" id="addComment">+ Comentario</button></div>${list.map(c=>`<div class="card flat"><strong>${c.pinned?'📌 ':''}${esc(c.category||'Comentario')}</strong><p>${esc(c.text)}</p></div>`).join('')||'<div class="empty-state">Sin comentarios.</div>'}`; }
function fileCategoryLabel(value){
  return ({
    photo:'Fotografia clinica',
    radiography:'Radiografia',
    cbct:'CBCT / DICOM',
    lab:'Analisis medico',
    pdf:'PDF escaneado',
    other:'Otro archivo'
  })[value] || 'Archivo clinico';
}
function fileKind(file){
  const name=String(file?.name||'').toLowerCase();
  const type=String(file?.type||'').toLowerCase();
  if(type.startsWith('image/')) return 'imagen';
  if(type.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if(name.endsWith('.dcm') || name.endsWith('.dicom') || name.endsWith('.nii') || name.endsWith('.nrrd')) return 'dicom/cbct';
  return type || 'archivo';
}
function fileSizeLabel(bytes){
  const n=Number(bytes)||0;
  if(n>=1024*1024) return `${(n/(1024*1024)).toFixed(1)} MB`;
  if(n>=1024) return `${Math.round(n/1024)} KB`;
  return `${n} B`;
}
function renderFilePreview(f){
  if((f.mime||'').startsWith('image/') && f.data_url) return `<img class="file-thumb" src="${esc(f.data_url)}" alt="${esc(f.title)}">`;
  if((f.mime||'').includes('pdf') || String(f.original_name||'').toLowerCase().endsWith('.pdf')) return `<span class="file-thumb file-thumb-pdf">PDF</span>`;
  if(String(f.kind||'').includes('dicom') || String(f.category||'')==='cbct') return `<span class="file-thumb file-thumb-scan">3D</span>`;
  return `<span class="file-thumb">??</span>`;
}
function renderFilesTab(p){
  const list=db.files.filter(f=>Number(f.patient_id)===Number(p.id)).sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
  return `<div class="card flat file-import-panel"><div class="section-title"><h2>Archivos del paciente</h2><p>Importa fotografias, radiografias, CBCT/DICOM, analisis medicos o PDF escaneados.</p></div><div class="form-grid"><label class="field">Tipo de archivo<select id="patientFileCategory"><option value="photo">Fotografia clinica</option><option value="radiography">Radiografia</option><option value="cbct">CBCT / DICOM</option><option value="lab">Analisis medico</option><option value="pdf">PDF escaneado</option><option value="other">Otro archivo</option></select></label><label class="field">Notas clinicas<input id="patientFileNotes" placeholder="Ej. panoramica inicial, analitica prequirurgica"></label></div><label class="file-drop-zone" for="patientFileInput"><strong>Seleccionar archivos</strong><span>Imagenes, PDF, DICOM/CBCT o documentos escaneados</span><input id="patientFileInput" type="file" multiple accept="image/*,application/pdf,.pdf,.dcm,.dicom,.nii,.nrrd,.zip"></label><div class="toolbar"><button class="primary" id="importPatientFiles">Importar a la ficha</button></div></div>${list.length?`<div class="file-grid">${list.map(f=>`<article class="file-card">${renderFilePreview(f)}<div><strong>${esc(f.title)}</strong><small>${esc(fileCategoryLabel(f.category))} · ${esc(f.kind||f.type||'archivo')} · ${esc(fileSizeLabel(f.size))}</small><small>${esc(f.original_name||'')} ${f.created_at?'· '+new Date(f.created_at).toLocaleString('es-ES'):''}</small>${f.notes?`<p>${esc(f.notes)}</p>`:''}<div class="toolbar">${f.data_url?`<a class="ghost button-link" href="${esc(f.data_url)}" target="_blank" rel="noreferrer" download="${esc(f.original_name||f.title)}">Abrir / descargar</a>`:''}</div></div></article>`).join('')}</div>`:'<div class="empty-state">Sin archivos. Importa fotografias, radiografias, CBCT o PDFs desde el boton superior.</div>'}`;
}
function miniOdonto(patientId){ const od=ensureOdontogram(db,patientId); const arc=arr=>`<div class="mini-arcade">${arr.map(t=>`<span class="mini-tooth ${esc(statusTone(od[t].status))}" title="${t}"></span>`).join('')}</div>`; return `<div class="mini-odonto">${arc(FDI_UPPER)}${arc(FDI_LOWER)}</div>`; }
function toothKind(tooth){ const n=Number(String(tooth).slice(1)); if([1,2].includes(n))return'incisor'; if(n===3)return'canine'; if([4,5].includes(n))return'premolar'; return'molar'; }
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
  const rootLines = (g.rootLines||[]).map(d=>`<path class="root-split" d="${d}"${missingAttrs}/>`).join('');
  const rootShade = `<path class="root-shade" d="M18 42 C20 52 20 65 22 78 M32 42 C30 52 30 65 28 78"${missingAttrs}/>`;
  return `<svg class="tooth-svg apk-tooth minimal-tooth anatomical-tooth continuous-tooth" viewBox="0 0 50 82" aria-hidden="true"><g${rotate}><path class="tooth-outline tone-${tone}" d="${g.outline}"${missingAttrs}/>${missing?'':rootShade}${rootLines}${crownState?`<path class="crown-cap treatment-mark ${semClass(crownState)}" d="M15 23 C21 17 29 17 35 23 L32 36 C28 33 22 33 18 36 Z"/>`:''}${surfaceFillingState?`<circle class="surface-fill-dot treatment-mark ${semClass(surfaceFillingState)}" cx="25" cy="25" r="4.8"/>`:''}${surfaceRed?`<circle class="surface-red-dot treatment-mark semantic-pending" cx="25" cy="24" r="4.8"/>`:''}${endoState?`<path class="endo-mark treatment-mark ${semClass(endoState)}" d="M23.5 35 L26.5 35 L26 72 L24 72 Z"/>`:''}${postState?`<path class="post-mark treatment-mark ${semClass(postState)}" d="M22 30 L28 30 L27 54 L23 54 Z"/>`:''}${implantState?`<g class="implant-mark treatment-mark ${semClass(implantState)}"><path d="M19 42 H31 M20 49 H30 M21 56 H29 M22 63 H28"/><path d="M19 40 L23 72 H27 L31 40"/></g>`:''}${bridgeState?`<path class="bridge-mark treatment-mark ${semClass(bridgeState)}" d="M6 27 H44"/>`:''}${removableState?`<g class="removable-mark treatment-mark ${semClass(removableState)}"><path d="M7 28 H43"/><rect x="19" y="43" width="12" height="7" rx="2"/></g>`:''}${states.includes('extraction')?'<path class="extract-mark semantic-pending" d="M13 15 L37 45 M37 15 L13 45"/>':''}</g></svg>`;
}
function surfaceSvg(tooth, record){ const map=record.surfaces||{}; const get=s=>map[normalizeSurfaceForTooth(tooth,s)]||''; const cls=s=>{ const v=get(s); return v?`filled ${statusTone(v)}`:''; }; const occ=normalizeSurfaceForTooth(tooth,'O'); return `<svg class="surface-map" viewBox="0 0 54 54" aria-label="Superficies ${tooth}"><circle class="surface-shell" cx="27" cy="27" r="23"/><path class="surface-seg ${cls('V')}" data-surface-tooth="${tooth}" data-surface="V" d="M11 10 Q27 1 43 10 L35 19 Q27 14 19 19 Z"><title>${tooth} Vestibular</title></path><path class="surface-seg ${cls('P')}" data-surface-tooth="${tooth}" data-surface="P" d="M11 44 Q27 53 43 44 L35 35 Q27 40 19 35 Z"><title>${tooth} Palatino/Lingual</title></path><path class="surface-seg ${cls('M')}" data-surface-tooth="${tooth}" data-surface="M" d="M10 11 Q1 27 10 43 L19 35 Q14 27 19 19 Z"><title>${tooth} Mesial</title></path><path class="surface-seg ${cls('D')}" data-surface-tooth="${tooth}" data-surface="D" d="M44 11 Q53 27 44 43 L35 35 Q40 27 35 19 Z"><title>${tooth} Distal</title></path><circle class="surface-seg ${cls(occ)}" data-surface-tooth="${tooth}" data-surface="${occ}" cx="27" cy="27" r="9"><title>${tooth} ${occ==='I'?'Incisal':'Oclusal'}</title></circle></svg>`; }
function statusVisualSemantics(code){
  const s=String(code||'healthy');
  if(s==='healthy') return {kind:'healthy', className:'semantic-healthy'};
  if(s==='missing') return {kind:'missing', className:'semantic-missing'};
  if(s==='extraction'||s==='caries'||s.endsWith('_pending')||s.endsWith('_indicated')) return {kind:'pending', className:'semantic-pending'};
  if(s.endsWith('_bad')||s==='implant_review'||s==='filling_bad') return {kind:'redo', className:'semantic-redo'};
  return {kind:'done', className:'semantic-done'};
}
function legacyLegendClinicalIcon(base, code){
  const meta=ODONTO_LEGEND_META[base]||{};
  const tone=statusTone(code);
  const bad=tone==='blue-red'||String(code).endsWith('_bad')||code==='implant_review';
  const red=tone==='red'||String(code).endsWith('_pending')||String(code).endsWith('_indicated')||code==='extraction'||code==='caries';
  const cls=`legend-clinical-icon tone-${tone} icon-${esc(meta.icon||base)}`;
  const tooth='<path class="icon-tooth" d="M18 27 C17 17 23 11 30 18 C37 11 43 17 42 28 C41 39 37 47 34 58 C32 65 28 65 26 58 C23 48 19 39 18 27 Z"/>';
  if(base==='caries') return `<svg class="${cls}" viewBox="0 0 60 70" aria-hidden="true">${tooth}<circle class="icon-red" cx="30" cy="29" r="8"/><path class="icon-surface-lines" d="M21 28 H39 M30 19 V44"/></svg>`;
  if(base==='filling') return `<svg class="${cls}" viewBox="0 0 60 70" aria-hidden="true">${tooth}<circle class="icon-fill ${bad?'bad':''} ${red?'red':''}" cx="30" cy="30" r="10"/><path class="icon-surface-lines" d="M21 30 H39 M30 20 V43"/></svg>`;
  if(base==='crown') return `<svg class="${cls}" viewBox="0 0 60 70" aria-hidden="true">${tooth}<path class="icon-crown ${bad?'bad':''} ${red?'red':''}" d="M19 24 C25 14 35 14 41 24 L38 35 C33 31 27 31 22 35 Z"/></svg>`;
  if(base==='endo') return `<svg class="${cls}" viewBox="0 0 60 70" aria-hidden="true">${tooth}<path class="icon-root ${bad?'bad':''} ${red?'red':''}" d="M28 33 C29 43 29 54 27 64 M33 33 C33 45 34 55 36 64"/></svg>`;
  if(base==='post') return `<svg class="${cls}" viewBox="0 0 60 70" aria-hidden="true">${tooth}<path class="icon-post ${bad?'bad':''} ${red?'red':''}" d="M25 31 H35 L34 56 H26 Z"/></svg>`;
  if(base==='implant') return `<svg class="${cls}" viewBox="0 0 60 70" aria-hidden="true"><path class="icon-implant ${bad?'bad':''} ${red?'red':''}" d="M22 18 H38 L35 62 H25 Z M23 27 H37 M24 35 H36 M25 43 H35 M26 51 H34"/><path class="icon-abutment" d="M25 12 H35 V18 H25 Z"/></svg>`;
  if(base==='prosthesis') return `<svg class="${cls}" viewBox="0 0 80 56" aria-hidden="true"><path class="icon-mini-tooth" d="M10 24 C9 14 17 9 23 16 C29 9 37 14 36 25 C35 38 31 48 28 52 C25 56 21 56 18 52 C15 48 11 38 10 24 Z"/><path class="icon-mini-tooth" d="M44 24 C43 14 51 9 57 16 C63 9 71 14 70 25 C69 38 65 48 62 52 C59 56 55 56 52 52 C49 48 45 38 44 24 Z"/><path class="icon-bridge ${bad?'bad':''} ${red?'red':''}" d="M25 24 H55"/></svg>`;
  if(base==='removable') return `<svg class="${cls}" viewBox="0 0 80 56" aria-hidden="true"><path class="icon-arch ${bad?'bad':''} ${red?'red':''}" d="M10 30 C20 8 60 8 70 30"/><rect class="icon-plate ${bad?'bad':''} ${red?'red':''}" x="25" y="34" width="30" height="10" rx="3"/></svg>`;
  if(base==='missing') return `<svg class="${cls}" viewBox="0 0 60 70" aria-hidden="true">${tooth}<path class="icon-missing" d="M18 27 C17 17 23 11 30 18 C37 11 43 17 42 28 C41 39 37 47 34 58 C32 65 28 65 26 58 C23 48 19 39 18 27 Z"/></svg>`;
  if(base==='extraction') return `<svg class="${cls}" viewBox="0 0 60 70" aria-hidden="true">${tooth}<path class="icon-x" d="M18 16 L44 48 M44 16 L18 48"/></svg>`;
  return `<svg class="${cls}" viewBox="0 0 60 70" aria-hidden="true">${tooth}<path class="icon-check" d="M17 36 L27 47 L45 23"/></svg>`;
}
function stateDots(base, idx){
  const steps=(ODONTO_LEGEND_META[base]?.steps||[]); if(steps.length<=1)return'';
  return `<span class="next-state-dots">${steps.map((s,i)=>`<i class="${i===idx?'on':''}" title="${esc(s)}"></i>`).join('')}</span>`;
}
function legendApplicationLabel(base){ return ODONTO_LEGEND_META[base]?.applies==='surface'?'Superficie':'Diente completo'; }
function legendSymbol(code){ const tone=statusTone(code); if(code==='missing')return'<span class="legend-symbol missing-symbol"></span>'; if(code==='extraction')return'<span class="legend-symbol x-symbol">×</span>'; if(code==='healthy')return'<span class="legend-symbol check-symbol">✓</span>'; if(code.startsWith('endo'))return`<span class="legend-symbol endo-symbol ${tone}"></span>`; if(code.startsWith('post'))return`<span class="legend-symbol post-symbol ${tone}"></span>`; if(code.startsWith('implant'))return`<span class="legend-symbol implant-symbol ${tone}"></span>`; if(code.startsWith('prosthesis'))return`<span class="legend-symbol bridge-symbol ${tone}"></span>`; if(code.startsWith('removable'))return`<span class="legend-symbol removable-symbol ${tone}"></span>`; if(code.startsWith('crown'))return`<span class="legend-symbol crown-symbol ${tone}"></span>`; return`<span class="legend-symbol dot-symbol ${tone}"></span>`; }
function legacyLegendItems(){
  return ODONTO_LEGEND_MAIN.map(base=>{
    const idx=Number(state.odontoLegendState?.[base]||0);
    const code=legendVariant(base,idx);
    const meta=ODONTO_LEGEND_META[base]||{};
    const selected=state.odontoToolBase===base;
    const cycles=!!ODONTO_LEGEND_CYCLES[base];
    return `<button type="button" class="clinical-legend-card ${selected?'selected':''} tone-${statusTone(code)}" data-legend-base="${base}" data-od-code="${code}">${legendClinicalIcon(base,code)}<span class="legend-copy"><b>${esc(ODONTO_LEGEND_META[base]?.title||legendLabel(base,idx))}</b><small class="state-line">${cycles?'Toque repetido · ':''}${esc(legendStateText(base,idx)||legendLabel(base,idx))}</small><em>${esc(legendApplicationLabel(base))}</em></span>${stateDots(base,idx)}</button>`;
  }).join('');
}
function toothSummary(record){ const states=toothWholeStates(record); const whole=(states.length?states:['healthy']).map(v=>STATUS_LABELS[v]||v).join(' + '); const surf=Object.entries(record.surfaces||{}).map(([s,v])=>`${s}:${STATUS_LABELS[v]||v}`).join(' · '); return surf?`${whole} · ${surf}`:whole; }
function legendClinicalIcon(base, code){
  const meta=ODONTO_LEGEND_META[base]||{};
  const tone=statusTone(code);
  const sem=statusVisualSemantics(code);
  const bad=sem.kind==='redo';
  const red=sem.kind==='pending';
  const cls=`legend-clinical-icon refined tone-${tone} icon-${esc(meta.icon||base)}`;
  const tooth='<path class="icon-tooth clinical-tooth-outline" d="M16 20 C17 14 22 10 27 12 C29 13 31 13 33 12 C39 10 44 15 44 22 C46 31 41 39 36 42 C38 51 39 61 36 68 C34 73 30 72 29 67 C28 59 28 50 27 43 C26 50 26 60 25 68 C24 73 20 73 18 68 C15 60 17 50 19 42 C14 39 10 30 16 20 Z"/>';
  const rootGuide='<path class="icon-root-guide" d="M20 43 C18 52 17 62 18 69 M28 43 C28 54 27 63 25 70 M35 43 C38 53 39 63 36 69"/>';
  if(base==='caries') return `<svg class="${cls}" viewBox="0 0 60 76" aria-hidden="true">${tooth}<circle class="icon-red lesion legend-treatment-mark semantic-pending" cx="30" cy="28" r="7"/><path class="icon-surface-lines" d="M22 28 H38 M30 20 V40"/></svg>`;
  if(base==='filling') return `<svg class="${cls}" viewBox="0 0 60 76" aria-hidden="true">${tooth}<circle class="icon-fill restoration legend-treatment-mark ${sem.className}" cx="30" cy="29" r="9"/><path class="icon-surface-lines" d="M22 29 H38 M30 20 V41"/></svg>`;
  if(base==='crown') return `<svg class="${cls}" viewBox="0 0 60 76" aria-hidden="true">${tooth}<path class="icon-crown legend-treatment-mark ${sem.className}" d="M16 23 C22 13 38 13 44 23 L42 37 C36 34 24 34 18 37 Z"/></svg>`;
  if(base==='endo') return `<svg class="${cls}" viewBox="0 0 60 76" aria-hidden="true">${tooth}${rootGuide}<path class="icon-root legend-treatment-mark ${sem.className}" d="M24 33 C25 45 24 57 22 68 M31 33 C31 47 31 58 31 69 M38 34 C40 47 41 58 38 68"/></svg>`;
  if(base==='post') return `<svg class="${cls}" viewBox="0 0 60 76" aria-hidden="true">${tooth}<path class="icon-post legend-treatment-mark ${sem.className}" d="M26 30 H34 L33 60 H27 Z"/><path class="icon-post-head" d="M23 29 H37"/></svg>`;
  if(base==='implant') return `<svg class="${cls}" viewBox="0 0 60 76" aria-hidden="true"><path class="icon-implant legend-treatment-mark ${sem.className}" d="M22 18 H38 L35 66 H25 Z M23 27 H37 M24 36 H36 M25 45 H35 M26 54 H34"/><path class="icon-abutment" d="M25 12 H35 V18 H25 Z"/></svg>`;
  if(base==='prosthesis') return `<svg class="${cls}" viewBox="0 0 82 60" aria-hidden="true"><path class="icon-mini-tooth" d="M9 22 C11 13 20 10 25 15 C30 10 38 14 37 24 C36 37 31 50 25 56 C19 50 11 37 9 22 Z"/><path class="icon-mini-tooth" d="M45 22 C47 13 56 10 61 15 C66 10 74 14 73 24 C72 37 67 50 61 56 C55 50 47 37 45 22 Z"/><path class="icon-bridge legend-treatment-mark ${sem.className}" d="M25 24 H58"/></svg>`;
  if(base==='removable') return `<svg class="${cls}" viewBox="0 0 82 60" aria-hidden="true"><path class="icon-arch legend-treatment-mark ${sem.className}" d="M10 34 C19 10 63 10 72 34"/><rect class="icon-plate legend-treatment-mark ${sem.className}" x="25" y="38" width="32" height="10" rx="3"/></svg>`;
  if(base==='missing') return `<svg class="${cls}" viewBox="0 0 60 76" aria-hidden="true"><path class="icon-missing" d="M16 20 C17 14 22 10 27 12 C29 13 31 13 33 12 C39 10 44 15 44 22 C46 31 41 39 36 42 C38 51 39 61 36 68 C34 73 30 72 29 67 C28 59 28 50 27 43 C26 50 26 60 25 68 C24 73 20 73 18 68 C15 60 17 50 19 42 C14 39 10 30 16 20 Z"/></svg>`;
  if(base==='extraction') return `<svg class="${cls}" viewBox="0 0 60 76" aria-hidden="true">${tooth}<path class="icon-x" d="M16 16 L45 52 M45 16 L16 52"/></svg>`;
  return `<svg class="${cls}" viewBox="0 0 60 76" aria-hidden="true">${tooth}<path class="icon-check" d="M17 38 L27 49 L46 23"/></svg>`;
}
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
function odontoTopSwitch(mode){
  return `<div class="odonto-switch"><button class="${mode==='restorative'?'active':''}" data-odonto-mode="restorative">Odontograma</button><button class="${mode==='periodontal'?'active':''}" data-odonto-mode="periodontal">Periodontal</button></div>`;
}
function renderPerioSelectorArc(od, arr, title){
  return `<div class="perio-arch-card"><div class="apk-arcade-label"><strong>${title}</strong><small>Selecciona una pieza</small></div><div class="perio-teeth-row">${arr.map(t=>`<button class="tooth-ui apk perio-pick ${esc(statusTone(od[t].status))} ${state.selectedTooth===t?'selected':''}" data-select-tooth="${t}" title="${t}">${toothMarkers(t,od[t])}<span>${t}</span></button>`).join('')}</div></div>`;
}
function probeInput(tooth, site, value){ return `<input class="probe-input" type="number" min="0" max="20" inputmode="numeric" data-perio-depths="${site}" data-tooth="${tooth}" value="${esc(value??'')}">`; }
function recessionInput(tooth, site, value){ return `<input class="recession-input" type="number" min="0" max="20" inputmode="numeric" data-perio-recession="${site}" data-tooth="${tooth}" value="${esc(value??'')}">`; }
function flagMini(label, tooth, key, site, checked){ return `<label class="mini-flag"><input type="checkbox" data-perio-flag="${key}" data-site="${site}" data-tooth="${tooth}" ${checked?'checked':''}><span></span><small>${label} · ${site.toUpperCase()}</small></label>`; }
function legacyRenderPeriodontalMode(od){
  const p=currentPatient();
  const tooth = selectedOdontoTooth(od);
  const rec = od[tooth];
  const perio = rec.periodontal;
  const pos = rec.position;
  const sum = perioSummary(od);
  return `<section class="odonto-page05"><article class="card odonto-card apk-like"><div class="odonto-header sticky-odonto"><div><h1>Periodontal</h1><p>${p?esc(patientFullName(p)):'Demo sin paciente'} · diente seleccionado ${tooth}</p></div><div class="odonto-header-actions"><button class="ghost" data-odontogram-back="patient" data-go="patientDetail">Volver al paciente</button><button class="ghost" data-go="patientDetail">Ficha</button></div></div><select id="odontogramPatient" class="select-line">${activePatients().map(x=>`<option value="${x.id}" ${Number(x.id)===Number(p?.id||'demo')?'selected':''}>${esc(patientFullName(x))}</option>`).join('')||'<option value="demo">Demo sin paciente</option>'}</select>${odontoTopSwitch('periodontal')}<article class="card perio-card compact-summary"><div class="section-title"><h2>Resumen periodontal</h2><p>Conteo automático de sitios con bolsa.</p></div><div class="perio-summary-grid"><div><b>≥4 mm</b><span>${sum.ge4} sitios</span></div><div><b>≥5 mm</b><span>${sum.ge5} sitios</span></div><div><b>≥6 mm</b><span>${sum.ge6} sitios</span></div></div></article><div class="perio-arch-grid">${renderPerioSelectorArc(od,FDI_UPPER,'Maxilar superior')}${renderPerioSelectorArc(od,FDI_LOWER,'Maxilar inferior')}</div><article class="card perio-diagram-card"><div class="section-title"><h2>Sondaje · 6 puntos</h2><p>Marca la profundidad alrededor del diente y registra la retracción gingival por sitio.</p></div><div class="perio-diagram-wrap"><div class="probe-ring"><div class="probe-site probe-mv"><label>MV</label>${probeInput(tooth,'mv',perio.depths.mv)}</div><div class="probe-site probe-v"><label>V</label>${probeInput(tooth,'v',perio.depths.v)}</div><div class="probe-site probe-dv"><label>DV</label>${probeInput(tooth,'dv',perio.depths.dv)}</div><div class="probe-site probe-ml"><label>ML/P</label>${probeInput(tooth,'ml',perio.depths.ml)}</div><div class="probe-site probe-lp"><label>L/P</label>${probeInput(tooth,'lp',perio.depths.lp)}</div><div class="probe-site probe-dl"><label>DL/P</label>${probeInput(tooth,'dl',perio.depths.dl)}</div><div class="tooth-focus"><div class="tooth-focus-svg">${toothMarkers(tooth,rec)}</div><strong>Diente ${tooth}</strong><small>${esc(toothSummary(rec))}</small></div></div><div class="perio-side-table"><h3>Retracción gingival</h3><div class="recession-grid">${PERIO_SITE_LABELS.map(s=>`<label class="recession-cell"><span>${s.label}</span>${recessionInput(tooth,s.key,perio.recession[s.key])}</label>`).join('')}</div><h3>Signos clínicos</h3><div class="flag-grid">${PERIO_SITE_LABELS.map(s=>flagMini('Sangrado',tooth,'bleeding',s.key,perio.bleeding[s.key])).join('')}${PERIO_SITE_LABELS.map(s=>flagMini('Supuración',tooth,'suppuration',s.key,perio.suppuration[s.key])).join('')}${PERIO_SITE_LABELS.map(s=>flagMini('Placa',tooth,'plaque',s.key,perio.plaque[s.key])).join('')}</div><div class="perio-footer-controls"><label class="field mini-field">Furca<select data-perio-select="furcation" data-tooth="${tooth}"><option value="0" ${String(perio.furcation)==='0'?'selected':''}>0</option><option value="I" ${String(perio.furcation)==='I'?'selected':''}>I</option><option value="II" ${String(perio.furcation)==='II'?'selected':''}>II</option><option value="III" ${String(perio.furcation)==='III'?'selected':''}>III</option></select></label><label class="field mini-field">Movilidad periodontal<select data-perio-select="mobility" data-tooth="${tooth}"><option value="0" ${String(perio.mobility)==='0'?'selected':''}>0</option><option value="I" ${String(perio.mobility)==='I'?'selected':''}>I</option><option value="II" ${String(perio.mobility)==='II'?'selected':''}>II</option><option value="III" ${String(perio.mobility)==='III'?'selected':''}>III</option></select></label></div></div></div></article><article class="card perio-card"><div class="section-title"><h2>Posición / movilidad · diente ${tooth}</h2><p>Registro complementario del diente seleccionado.</p></div><div class="position-grid"><button type="button" class="toggle-chip ${pos.mesialization?'on':''}" data-pos-flag="mesialization" data-tooth="${tooth}">Mesialización</button><button type="button" class="toggle-chip ${pos.distalization?'on':''}" data-pos-flag="distalization" data-tooth="${tooth}">Distalización</button><button type="button" class="toggle-chip ${pos.extrusion?'on':''}" data-pos-flag="extrusion" data-tooth="${tooth}">Extrusión</button><button type="button" class="toggle-chip ${pos.intrusion?'on':''}" data-pos-flag="intrusion" data-tooth="${tooth}">Intrusión</button><button type="button" class="toggle-chip ${pos.rotation?'on':''}" data-pos-flag="rotation" data-tooth="${tooth}">Giro / rotación</button><button type="button" class="toggle-chip ${pos.vestibuloversion?'on':''}" data-pos-flag="vestibuloversion" data-tooth="${tooth}">Vestibuloversión</button><button type="button" class="toggle-chip ${pos.linguoversion?'on':''}" data-pos-flag="linguoversion" data-tooth="${tooth}">Linguoversión / palatoversión</button><button type="button" class="toggle-chip ${pos.recessionVisible?'on':''}" data-pos-flag="recessionVisible" data-tooth="${tooth}">Retracción gingival visible</button></div><div class="perio-footer-controls"><label class="field mini-field">Movilidad visible<select data-pos-select="mobility" data-tooth="${tooth}"><option value="0" ${String(pos.mobility||'0')==='0'?'selected':''}>0</option><option value="I" ${String(pos.mobility)==='I'?'selected':''}>I</option><option value="II" ${String(pos.mobility)==='II'?'selected':''}>II</option><option value="III" ${String(pos.mobility)==='III'?'selected':''}>III</option></select></label></div></article></article></section>`;
}
function renderRestorativeModeLegacy(od,p,pid,currentBase,currentIdx,currentCode){
  const labelRow=arr=>arr.map(t=>`<span>${t}</span>`).join('');
  const arch=(title, arr, arcade)=>`<div class="apk-arcade-card ${arcade}"><div class="apk-arcade-label"><strong>${title}</strong><small>${arr.filter(t=>od[t].status==='missing').length} ausentes</small><button class="ghost mini" data-mark-arcade="${arcade}">Arcada ausente</button></div><div class="apk-arcade-content"><div class="tooth-labels compact">${labelRow(arr)}</div><div class="teeth-row compact"><span class="row-spacer"></span>${arr.map(t=>`<button class="tooth-ui apk ${esc(statusTone(od[t].status))} ${state.selectedTooth===t?'selected':''}" data-tooth="${t}" title="${t} · ${esc(toothSummary(od[t]))}">${toothMarkers(t,od[t])}</button>`).join('')}</div><div class="surface-row compact"><span class="row-spacer"></span>${arr.map(t=>`<div class="surface-stack compact">${surfaceSvg(t,od[t])}</div>`).join('')}</div></div></div>`;
  return `<section class="odonto-page05"><article class="card odonto-card apk-like"><div class="odonto-header sticky-odonto"><div><h1>Odontograma</h1><p>${p?esc(patientFullName(p)):'Demo sin paciente'} · modo ${esc(legendLabel(currentBase,currentIdx))}</p></div><div class="odonto-header-actions"><button class="ghost" data-odontogram-back="patient" data-go="patientDetail">Volver al paciente</button><button class="ghost" data-go="patientDetail">Ficha</button></div></div><select id="odontogramPatient" class="select-line">${activePatients().map(x=>`<option value="${x.id}" ${Number(x.id)===Number(pid)?'selected':''}>${esc(patientFullName(x))}</option>`).join('')||'<option value="demo">Demo sin paciente</option>'}</select>${odontoTopSwitch('restorative')}<div class="active-tool-bar tone-${currentCode?statusTone(currentCode):'neutral'}"><span>${currentCode?legendSymbol(currentCode):'○'}</span><strong>${currentCode?esc(legendLabel(currentBase,currentIdx)):'Sin herramienta activa'}</strong><small>${currentCode?esc(legendStateText(currentBase,currentIdx))+' · toca dientes o superficies':'toca una leyenda o mantén pulsado un diente'}</small><button class="ghost mini" id="clearOdontoTool">Salir</button></div>${arch('Maxilar superior',FDI_UPPER,'superior')}${arch('Maxilar inferior',FDI_LOWER,'inferior')}<div class="quick-odonto-actions compact-actions"><button class="ghost" id="cycleSelectedTooth">Estados del diente</button><button class="ghost" id="selectFdiRange">Rango FDI</button><button class="ghost" id="clearSelectedSurface">Limpiar superficie</button></div><section class="legend apk-legend"><div class="section-title"><h2>Leyenda</h2><p>Toque repetido: correcto → insatisfactorio → pendiente. Después toca el diente o una superficie.</p></div><div class="legend-grid apk clinical-grid">${legendItems()}</div><p class="tiny">Azul = correcto · Azul + rojo = insatisfactorio/a revisar · Rojo = pendiente/patología · Verde = sano al finalizar. Las tarjetas indican si actúan en superficie o en diente completo.</p></section></article></section>`;
}
function renderRestorativeMode(od,p,pid,currentBase,currentIdx,currentCode){
  const labelRow=arr=>arr.map(t=>`<span>${t}</span>`).join('');
  const teethRow=arr=>`<div class="teeth-row compact"><span class="row-spacer"></span>${arr.map(t=>`<button class="tooth-ui apk ${esc(statusTone(od[t].status))} ${state.selectedTooth===t?'selected':''}" data-tooth="${t}" title="${t} - ${esc(toothSummary(od[t]))}">${toothMarkers(t,od[t])}</button>`).join('')}</div>`;
  const surfaces=arr=>`<div class="surface-row compact"><span class="row-spacer"></span>${arr.map(t=>`<div class="surface-stack compact">${surfaceSvg(t,od[t])}</div>`).join('')}</div>`;
  const arch=(title, arr, arcade)=>`<div class="apk-arcade-card minimal-odontogram ${arcade}"><div class="apk-arcade-label"><strong>${title}</strong><small>${arr.filter(t=>od[t].status==='missing').length} ausentes</small><button class="ghost mini" data-mark-arcade="${arcade}">Arcada ausente</button></div><div class="apk-arcade-content">${arcade==='superior'?`${teethRow(arr)}<div class="tooth-labels compact">${labelRow(arr)}</div>${surfaces(arr)}`:`${surfaces(arr)}<div class="tooth-labels compact">${labelRow(arr)}</div>${teethRow(arr)}`}</div></div>`;
  return `<section class="odonto-page05"><article class="card odonto-card apk-like"><div class="odonto-header sticky-odonto"><div><h1>Odontograma</h1><p>${p?esc(patientFullName(p)):'Demo sin paciente'} - modo ${esc(legendLabel(currentBase,currentIdx))}</p></div><div class="odonto-header-actions"><button class="ghost" data-odontogram-back="patient" data-go="patientDetail">Volver al paciente</button><button class="ghost" data-go="patientDetail">Ficha</button></div></div><select id="odontogramPatient" class="select-line">${activePatients().map(x=>`<option value="${x.id}" ${Number(x.id)===Number(pid)?'selected':''}>${esc(patientFullName(x))}</option>`).join('')||'<option value="demo">Demo sin paciente</option>'}</select>${odontoTopSwitch('restorative')}<div class="active-tool-bar tone-${currentCode?statusTone(currentCode):'neutral'}"><span>${currentCode?legendSymbol(currentCode):'○'}</span><strong>${currentCode?esc(legendLabel(currentBase,currentIdx)):'Sin herramienta activa'}</strong><small>${currentCode?esc(legendStateText(currentBase,currentIdx))+' - toca dientes o superficies':'toca una leyenda o manten pulsado un diente'}</small><button class="ghost mini" id="clearOdontoTool">Salir</button></div>${arch('Maxilar superior',FDI_UPPER,'superior')}${arch('Maxilar inferior',FDI_LOWER,'inferior')}<div class="quick-odonto-actions compact-actions"><button class="ghost" id="cycleSelectedTooth">Estados del diente</button><button class="ghost" id="selectFdiRange">Rango FDI</button><button class="ghost" id="clearSelectedSurface">Limpiar superficie</button></div><section class="legend apk-legend"><div class="section-title"><h2>Leyenda</h2><p>Toque repetido: correcto -> insatisfactorio -> pendiente. Despues toca el diente o una superficie.</p></div><div class="legend-grid apk clinical-grid">${legendItems()}</div><p class="tiny">Diente blanco con contorno azul. Los colores se reservan para marcas clinicas y estados.</p></section></article></section>`;
}
function renderOdontogram(){
  const p=currentPatient();
  const pid=p?.id||'demo';
  const od=ensureOdontogram(db,pid);
  const currentBase=state.odontoToolBase||'';
  const currentIdx=Number(state.odontoLegendState?.[currentBase]||0);
  const currentCode=currentBase?(state.odontoToolCode||legendVariant(currentBase,currentIdx)):'';
  const mode = state.odontoMode || 'restorative';
  if(mode==='periodontal') return renderPeriodontalMode(od);
  return renderRestorativeMode(od,p,pid,currentBase,currentIdx,currentCode);
}
function legacyRenderAgenda(){
  const c=agendaCounters(db,state.date); const view=state.agendaView==='doctors'?renderAgendaByDoctors():renderAgendaByHours();
  return `<section><div class="page-head"><div><h1>Agenda</h1><p>${prettyDate(state.date)}</p></div><button class="ghost" id="openAppointmentModal">+ Cita</button></div>
    <div class="status-strip"><span>Total ${c.total}</span><span>Confirmadas ${c.confirmed}</span><span>Espera ${c.waiting}</span><span>Solapes ${c.overlaps}</span><span>${c.conflicts?'Avisos '+c.conflicts:'Sin avisos'}</span></div>
    <div class="segmented"><button class="${state.agendaView==='doctors'?'active':''}" data-agenda-view="doctors">Por doctores</button><button class="${state.agendaView==='hours'?'active':''}" data-agenda-view="hours">Por horas</button></div>
    <div class="date-row"><button class="round" id="prevDay">‹</button><input class="input-line" id="agendaDate" type="date" value="${state.date}"><button class="round" id="nextDay">›</button></div>
    <div class="doctor-chips">${db.employees.filter(e=>e.active!==false).map(e=>`<button class="doctor-chip" style="--doc-color:${esc(e.color)}"><span>${esc(e.name)}</span><small>${esc(e.site||'Sin sede')} · ${shiftSummary(e.id,state.date)}</small></button>`).join('')}</div>${view}</section>`;
}
function shiftSummary(employeeId,date){ const s=db.shifts.filter(x=>Number(x.employee_id)===Number(employeeId)&&new Date(date+'T12:00').getDay()===((Number(x.weekday)+1)%7)).map(x=>x.start_time+'-'+x.end_time); return s.join(', ')||'Sin turno'; }
function agendaMinutes(time){ const [h,m]=String(time||'00:00').split(':').map(Number); return (Number(h)||0)*60+(Number(m)||0); }
function agendaWaitMinutes(a={},now=new Date()){
  const raw=a.arrived_at||a.check_in_at||a.checked_in_at||'';
  if(!raw) return 0;
  const started=new Date(raw), current=now instanceof Date?now:new Date(now);
  if(Number.isNaN(started.getTime())||Number.isNaN(current.getTime())) return 0;
  return Math.max(0,Math.floor((current.getTime()-started.getTime())/60000));
}
function agendaStatusMeta(a={},now=new Date()){
  const status=normalizeText(a.status||'programada').replace(/_/g,' ');
  if(['ausente','no presentado','npa','no acudio','absent'].includes(status)) return {tone:'absent',label:'Ausente / NPA'};
  if(status==='cancelada'||status==='cancelled') return {tone:'cancelled',label:'Cancelada'};
  if(status==='realizada'||status==='completada'||status==='completed') return {tone:'done',label:'Realizada'};
  if(status==='gabinete'||status==='en gabinete'||status==='en curso'||status==='en tratamiento') return {tone:'active',label:'En gabinete'};
  if(status==='espera'||status==='en espera'||status==='waiting'){
    const waitMinutes=typeof agendaWaitMinutes==='function'?agendaWaitMinutes(a,now):(()=>{ const raw=a.arrived_at||a.check_in_at||a.checked_in_at||''; if(!raw)return 0; const started=new Date(raw), current=now instanceof Date?now:new Date(now); return Number.isNaN(started.getTime())||Number.isNaN(current.getTime())?0:Math.max(0,Math.floor((current.getTime()-started.getTime())/60000)); })();
    if(waitMinutes>15) return {tone:'late',label:`Esperando ${waitMinutes} min`,waitMinutes};
    return {tone:'waiting',label:waitMinutes?`Esperando ${waitMinutes} min`:'En espera',waitMinutes};
  }
  if(a.confirmed||status==='confirmada'||status==='confirmed') return {tone:'confirmed',label:'Confirmada'};
  return {tone:'planned',label:'Programada'};
}
function currentAgendaEmployeeId(){
  const active=sessionUser||db.currentUser||{}, stored=(db.users||[]).find(u=>Number(u.id)===Number(active.id));
  const employeeId=Number(active.employee_id??stored?.employee_id??0);
  return employeeId>0?employeeId:null;
}
function agendaColumnsForCurrentUser(date=state.date){
  const columns=agendaByDoctors(db,date), role=normalizeText(sessionUser?.role||db.currentUser?.role||'admin');
  if(['dentist','odontologo','odontologa'].includes(role)){
    const employeeId=currentAgendaEmployeeId();
    return employeeId?columns.filter(col=>Number(col.employee.id)===Number(employeeId)):[];
  }
  return columns;
}
function agendaVisibleCounters(){
  const rows=agendaColumnsForCurrentUser(state.date).flatMap(col=>col.appointments.map(a=>({...a,employee_id:a.employee_id??col.employee.id})));
  let overlaps=0;
  for(let i=0;i<rows.length;i++) for(let j=i+1;j<rows.length;j++) if(Number(rows[i].employee_id)===Number(rows[j].employee_id)&&agendaMinutes(rows[i].start_time)<agendaMinutes(rows[j].end_time)&&agendaMinutes(rows[i].end_time)>agendaMinutes(rows[j].start_time)) overlaps++;
  return {total:rows.length,confirmed:rows.filter(a=>a.confirmed||['confirmada','confirmed'].includes(normalizeText(a.status))).length,waiting:rows.filter(a=>['espera','en espera','waiting'].includes(normalizeText(a.status).replace(/_/g,' '))).length,overlaps,conflicts:rows.filter(a=>a.availability_status&&a.availability_status!=='ok').length};
}
function agendaDoctorAccent(index=0){ return ['#0f766e','#0369a1','#4f46e5','#6d28d9','#047857','#0891b2'][Number(index||0)%6]; }
function agendaAppointmentData(){ return agendaColumnsForCurrentUser(state.date).flatMap((col,index)=>col.appointments.map(a=>({...a,employee:a.employee||col.employee,_agendaIndex:index}))).sort((a,b)=>String(a.start_time||'').localeCompare(String(b.start_time||''))); }
function apptCard(a,{compact=false}={}){
  const p=a.patient||patient(a.patient_id), e=a.employee||emp(a.employee_id), meta=agendaStatusMeta(a), conflict=a.availability_status&&a.availability_status!=='ok';
  const accent=agendaDoctorAccent(a._agendaIndex??Math.max(0,db.employees.findIndex(x=>Number(x.id)===Number(e?.id))));
  return `<button type="button" class="agenda-appointment-card tone-${meta.tone} ${conflict?'has-warning':''} ${compact?'compact':''}" data-agenda-open="${a.id}" style="--agenda-accent:${accent}"><span class="agenda-appt-time">${esc(a.start_time||'')}<small>${esc(a.end_time||'')}</small></span><span class="agenda-appt-main"><strong>${esc(p?patientFullName(p):'Sin paciente')}</strong><small>${esc(a.title||a.reason||'Cita dental')}</small>${compact?'':`<span>${esc(e?.name||'Sin profesional')}${a.site?` · ${esc(a.site)}`:''}</span>`}</span><span class="agenda-status-pill tone-${meta.tone}">${esc(meta.label)}</span>${conflict?'<span class="agenda-warning-dot" title="Revisar disponibilidad">!</span>':''}${compact?'':`<span class="agenda-resize-controls"><span role="button" tabindex="0" data-agenda-resize="-10" data-agenda-id="${a.id}">-10 min</span><span role="button" tabindex="0" data-agenda-resize="10" data-agenda-id="${a.id}">+10 min</span></span>`}</button>`;
}
function renderAgendaByDoctors(){
  const data=agendaColumnsForCurrentUser(state.date);
  if(!data.length) return `<div class="agenda-empty-day"><strong>Agenda no vinculada</strong><span>Este usuario odontólogo necesita estar vinculado a su profesional en Ajustes → Usuarios y acceso.</span></div>`;
  return `<div class="agenda-doctor-board">${data.map((col,index)=>{ const accent=agendaDoctorAccent(index); return `<article class="agenda-doctor-column" style="--agenda-accent:${accent}"><header><span class="agenda-doctor-avatar">${esc(initials({first_name:col.employee.name,last_name:''}))}</span><span><strong>${esc(col.employee.name)}</strong><small>${esc(col.employee.role||'Profesional')} · ${esc(col.employee.site||'Sin sede')}</small></span><b>${col.appointments.length}</b></header>${col.absences.length?`<div class="agenda-doctor-absence">${esc(col.absences.map(a=>a.type).join(' · '))}</div>`:''}<div class="agenda-doctor-cards">${col.appointments.length?col.appointments.map(a=>apptCard({...a,_agendaIndex:index},{compact:true})).join(''):'<div class="agenda-empty-compact">Sin citas</div>'}</div><button class="agenda-add-inline" type="button" data-new-appt-emp="${col.employee.id}">+ Añadir cita</button></article>`; }).join('')}</div>`;
}
function renderAgendaList({mobile=false}={}){
  const rows=agendaAppointmentData();
  return `<div class="agenda-list-view ${mobile?'agenda-mobile-list':''}">${rows.length?rows.map(a=>apptCard(a)).join(''):'<div class="agenda-empty-day"><strong>Día libre</strong><span>No hay citas programadas.</span></div>'}</div>`;
}
function renderAgendaTimeline(){
  const ag=db.settings?.agenda||{}, slotMinutes=Number(db.settings?.slotMinutes||20), start=ag.day_start||'09:00', end=ag.day_end||'20:00', startMin=agendaMinutes(start), endMin=Math.max(startMin+60,agendaMinutes(end)), pxPerMinute=1.05, height=Math.max(520,Math.round((endMin-startMin)*pxPerMinute));
  const data=agendaColumnsForCurrentUser(state.date), hourMarks=[];
  for(let t=Math.ceil(startMin/60)*60;t<=endMin;t+=60) hourMarks.push(t);
  const now=new Date(), nowMin=now.getHours()*60+now.getMinutes(), showNow=state.date===today()&&nowMin>=startMin&&nowMin<=endMin;
  return `<div class="agenda-timeline-shell" data-slot-minutes="${slotMinutes}"><div class="agenda-timeline-grid agenda-timeline-head" style="--agenda-doctors:${Math.max(1,data.length)}"><div class="agenda-time-head">Hora</div>${data.map((col,index)=>`<div class="agenda-doctor-head" style="--agenda-accent:${agendaDoctorAccent(index)}"><span class="agenda-doctor-dot"></span><span><strong>${esc(col.employee.name)}</strong><small>${esc(col.employee.site||'Sin sede')}</small></span></div>`).join('')}</div><div class="agenda-timeline-grid agenda-timeline-body" style="--agenda-doctors:${Math.max(1,data.length)};--agenda-height:${height}px"><div class="agenda-time-rail" style="height:${height}px">${hourMarks.map(t=>`<span style="top:${Math.round((t-startMin)*pxPerMinute)}px">${String(Math.floor(t/60)).padStart(2,'0')}:00</span>`).join('')}</div>${data.map((col,index)=>`<div class="agenda-doctor-track" data-agenda-track="${col.employee.id}" style="height:${height}px;--agenda-accent:${agendaDoctorAccent(index)}">${hourMarks.map(t=>`<i class="agenda-hour-line" style="top:${Math.round((t-startMin)*pxPerMinute)}px"></i>`).join('')}${showNow?`<i class="agenda-now-line" style="top:${Math.round((nowMin-startMin)*pxPerMinute)}px"><span>Ahora</span></i>`:''}${col.appointments.map(a=>{ const top=Math.max(0,(agendaMinutes(a.start_time)-startMin)*pxPerMinute), dur=Math.max(28,(agendaMinutes(a.end_time)-agendaMinutes(a.start_time))*pxPerMinute), meta=agendaStatusMeta(a), p=a.patient||patient(a.patient_id), conflict=a.availability_status&&a.availability_status!=='ok'; return `<button type="button" class="agenda-timeline-card tone-${meta.tone} ${conflict?'has-warning':''}" data-agenda-open="${a.id}" style="top:${Math.round(top)}px;height:${Math.round(dur)}px"><span>${esc(a.start_time||'')} · ${esc(p?patientFullName(p):'Sin paciente')}</span><strong>${esc(a.title||a.reason||'Cita dental')}</strong>${dur>48?`<small>${esc(meta.label)}</small>`:''}</button>`; }).join('')}<button class="agenda-track-add" type="button" data-new-appt-emp="${col.employee.id}" aria-label="Añadir cita con ${esc(col.employee.name)}">+</button></div>`).join('')}</div></div>${renderAgendaList({mobile:true})}`;
}
function renderAgendaByHours(){ return renderAgendaTimeline(); }
function slotCell(time, employeeId){ return `<button class="slot-cell empty" data-slot-time="${time}" data-slot-emp="${employeeId}" title="Crear cita ${time}"></button>`; }
function renderAgendaQuickPanel(){
  const a=db.appointments.find(x=>Number(x.id)===Number(state.agendaQuickId)); if(!a) return '';
  const p=patient(a.patient_id), e=emp(a.employee_id), meta=agendaStatusMeta(a), duration=durationMinutes(a.start_time,a.end_time)||Number(a.duration_minutes||0);
  return `<aside class="agenda-quick-panel" aria-label="Detalle rápido de cita"><div class="agenda-quick-backdrop" data-agenda-close></div><div class="agenda-quick-card"><header><div><span class="agenda-status-pill tone-${meta.tone}">${esc(meta.label)}</span><h2>${esc(p?patientFullName(p):'Sin paciente')}</h2><p>${esc(a.title||a.reason||'Cita dental')}</p></div><button class="icon-btn" type="button" data-agenda-close aria-label="Cerrar">×</button></header><div class="agenda-quick-facts"><div><small>Horario</small><strong>${esc(a.start_time||'')}–${esc(a.end_time||'')}</strong><span>${duration?duration+' min':''}</span></div><div><small>Profesional</small><strong>${esc(e?.name||'Sin profesional')}</strong><span>${esc(a.site||e?.site||'Sin sede')}</span></div></div>${a.detail?`<div class="agenda-quick-note"><small>Detalle</small><p>${esc(a.detail)}</p></div>`:''}<div class="agenda-quick-actions"><button type="button" data-agenda-action="confirm" data-agenda-id="${a.id}">Confirmar</button><button type="button" data-agenda-action="arrival" data-agenda-id="${a.id}">Ha llegado</button><button type="button" data-agenda-action="cabinet" data-agenda-id="${a.id}">A gabinete</button><button type="button" data-agenda-action="absent" data-agenda-id="${a.id}">Ausente / NPA</button><button type="button" data-agenda-action="complete" data-agenda-id="${a.id}">Completar</button></div><div class="agenda-quick-footer"><button class="ghost" type="button" data-agenda-action="reschedule" data-agenda-id="${a.id}">Reprogramar</button><button class="ghost" type="button" data-agenda-action="cancel" data-agenda-id="${a.id}">Cancelar</button>${p?`<button class="ghost" type="button" data-agenda-action="patient" data-agenda-id="${a.id}">Abrir ficha</button>`:''}</div></div></aside>`;
}
function updateAgendaAppointmentState(appointmentId,action){
  const a=db.appointments.find(x=>Number(x.id)===Number(appointmentId)); if(!a) return toast('Cita no encontrada');
  snapshot('agenda.quick.'+action,a.patient_id);
  const now=new Date().toISOString();
  if(action==='confirm'){ a.confirmed=true; a.status='confirmada'; }
  else if(action==='arrival'){ a.confirmed=true; a.status='espera'; a.arrived_at=now; a.absent_at=''; }
  else if(action==='cabinet'){ a.status='gabinete'; a.chair_at=now; }
  else if(action==='absent'){ a.status='ausente'; a.absent_at=now; }
  else if(action==='complete'){ a.status='realizada'; a.completed_at=now; }
  a.updated_at=now; persist(); render(); toast(action==='complete'?'Cita completada':action==='absent'?'Paciente marcado ausente / NPA':'Estado de cita actualizado');
}
function openAgendaRescheduleModal(appointmentId){
  const a=db.appointments.find(x=>Number(x.id)===Number(appointmentId)); if(!a) return;
  const modal=$('#appointmentModal');
  modal.innerHTML=`<form id="agendaRescheduleForm" method="dialog" class="modal-card"><div class="modal-title"><div><h2>Reprogramar cita</h2><p>${esc(patientFullName(patient(a.patient_id)))} · ${esc(a.title||'Cita dental')}</p></div><button class="icon-btn" type="button" data-dialog-close aria-label="Cerrar">×</button></div><div class="form-grid"><label class="field">Fecha<input name="date" type="date" value="${esc(a.date)}"></label><label class="field">Inicio<input name="start_time" type="time" value="${esc(a.start_time)}"></label><label class="field">Fin<input name="end_time" type="time" value="${esc(a.end_time)}"></label></div><div id="agendaRescheduleAvailability" class="ok-banner">Comprobando disponibilidad…</div><button class="primary" type="submit">Guardar nuevo horario</button></form>`;
  modal.showModal();
  const form=$('#agendaRescheduleForm');
  const refresh=()=>{ const d=formData(form), av=appointmentAvailability(db,{...a,id:a.id,date:d.date,start_time:d.start_time,end_time:d.end_time}); const box=$('#agendaRescheduleAvailability'); if(box){box.className=av.status==='ok'?'ok-banner':av.status==='conflict'?'danger-banner':'warn-banner';box.textContent=av.message;} return av; };
  form.oninput=refresh; refresh();
  form.onsubmit=e=>{ e.preventDefault(); const d=formData(form), av=refresh(); if(av.status!=='ok'&&!confirm(av.message+'\n\n¿Guardar igualmente?')) return; snapshot('agenda.reschedule',a.patient_id); a.date=d.date;a.start_time=d.start_time;a.end_time=d.end_time;a.duration_minutes=durationMinutes(d.start_time,d.end_time);a.availability_status=av.status;a.availability_message=av.status==='ok'?'':av.message;a.updated_at=new Date().toISOString();state.date=d.date;persist();modal.close();render();toast('Cita reprogramada'); };
}

let agendaStatusClock=null;
function startAgendaStatusClock(){
  if(agendaStatusClock) return agendaStatusClock;
  agendaStatusClock=setInterval(()=>{ if(state.view==='agenda'&&document.visibilityState!=='hidden') render(); },30000);
  return agendaStatusClock;
}

function renderAssistant(){
  const health=validateStorageHealth(storage);
  const p=currentPatient();
  const voice=db.settings?.voice||{};
  const mode=voice.ai_mode||'auto';
  const last=lastCommandResult ? esc(JSON.stringify(lastCommandResult,null,2)) : 'Voice Router listo. Primero NLU local; si no entiende, puede usar IA configurada.';
  return `<section><div class="page-head"><div><h1>Denty Voice Router</h1><p>Una sola entrada de voz para ficha, odontograma, agenda, cobros, laboratorio y navegación.</p></div><button class="primary" id="voiceBtn">🎙️ ${voiceListening?'Detener':'Hablar'}</button></div>
  <article class="card voice-context-card"><div class="section-title"><div><h2>Contexto activo</h2><p>${p?`Paciente: <strong>${esc(patientFullName(p))}</strong>`:'Sin paciente seleccionado'}</p></div><span class="priority-badge media">${esc(mode)}</span></div><div class="voice-route"><span>1 · NLU local</span><b>→</b><span>2 · LLM / IA si hace falta</span><b>→</b><span>3 · validación</span><b>→</b><span>4 · Denty ejecuta</span></div><p class="tiny">La IA interpreta órdenes, pero no escribe directamente en los datos clínicos. Estado almacenamiento: ${esc(health.message)}</p></article>
  <article class="card"><h2>Escribir o dictar a Denty</h2><div class="form-grid"><input id="commandInput" class="input-line" placeholder="Ej.: hay que hacer endodoncia 22"><button class="primary" id="runCommandBtn">Interpretar</button></div><div class="toolbar voice-examples"><button class="ghost" data-command="caries distal del 36">Caries 36 distal</button><button class="ghost" data-command="endodoncia realizada 22">Endo realizada</button><button class="ghost" data-command="añade comentario dolor al morder desde hace tres días">Comentario</button><button class="ghost" data-command="cobra 100 euros en tarjeta">Cobrar</button><button class="ghost" data-command="recibe trabajo del laboratorio corona 11">Recibir laboratorio</button><button class="ghost" data-command="agenda endodoncia 22 mañana a las 10:30">Dar cita</button></div><pre id="commandResult" class="result-box">${last}</pre></article>
  <article class="card"><h2>Cómo decide Denty</h2><p><strong>NLU local:</strong> resuelve las órdenes frecuentes sin internet y sin coste por token. <strong>LLM/IA:</strong> solo entra cuando las reglas locales no bastan. <strong>MCP:</strong> puede actuar como adaptador externo desde el servidor local cuando esté configurado.</p><p class="tiny">Modo continuo: ${voice.continuous?'activado':'desactivado'} · lectura de respuesta: ${voice.readback===false?'desactivada':'activada'}.</p></article></section>`;
}
function legacyRenderImport(){ return `<section><div class="page-head"><div><h1>Importar</h1><p>Clinic Cloud, Gesden, Excel, CSV y TSV.</p></div></div><article class="card"><input id="importFile" type="file" accept=".csv,.tsv,.xlsx"><div class="pill-row"><button id="previewImport" class="ghost">Vista previa</button><button id="commitImport" class="primary" disabled>Importar filas</button></div><pre id="importResult" class="result-box">Elige un archivo para previsualizar. En esta preview estática, CSV/TSV es completo; XLSX se dejará para la versión con backend o librería incluida.</pre><div id="importPreview" class="table-wrap"></div></article></section>`; }
function renderTemplates(){ return `<section><div class="page-head"><div><h1>Plantillas</h1><p>Textos clínicos y trabajos rápidos.</p></div></div><article class="card"><form id="templateForm" class="form-grid"><input name="title" placeholder="Título" required><input name="category" placeholder="Categoría"><textarea name="text" placeholder="Texto" required></textarea><button class="primary">Guardar plantilla</button></form></article><div class="list">${db.templates.map(t=>`<div class="list-item"><span>🧩</span><span><strong>${esc(t.title)}</strong><small>${esc(t.category)}</small><p>${esc(t.text)}</p></span></div>`).join('')}</div></section>`; }
function renderStaff(){ return `<section><div class="page-head"><div><h1>Fichaje</h1><p>Empleados, turnos, bajas, vacaciones y permisos.</p></div></div><article class="card"><h2>Empleados</h2><form id="employeeForm" class="form-grid"><input name="name" placeholder="Nombre empleado" required><select name="role"><option>odontólogo</option><option>higienista</option><option>recepción</option><option>auxiliar</option></select><input name="site" placeholder="Sede habitual"><input name="phone" placeholder="Teléfono"><button class="primary">Crear empleado</button></form><div class="list" style="margin-top:12px">${db.employees.map(e=>`<div class="list-item"><span class="avatar" style="background:${esc(e.color)}22;color:${esc(e.color)}">${esc(e.name.slice(0,2))}</span><span><strong>${esc(e.name)}</strong><small>${esc(e.role)} · ${esc(e.site||'Sin sede')}</small></span></div>`).join('')}</div></article><article class="card"><h2>Turnos y ausencias</h2>${staffForms()}</article></section>`; }
function staffForms(){ const opts=db.employees.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join(''); return `<form id="shiftForm" class="form-grid"><select name="employee_id">${opts}</select><select name="weekday">${['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select><input name="start_time" type="time" value="09:00"><input name="end_time" type="time" value="14:00"><button class="ghost">Añadir turno</button></form><form id="absenceForm" class="form-grid" style="margin-top:12px"><select name="employee_id">${opts}</select><select name="type"><option>vacaciones</option><option>baja médica</option><option>permiso</option><option>asunto propio</option><option>justificada</option><option>injustificada</option></select><input name="start_date" type="date" value="${state.date}"><input name="end_date" type="date" value="${state.date}"><input name="start_time" type="time"><input name="end_time" type="time"><input name="reason" placeholder="Motivo"><button class="ghost">Añadir ausencia</button></form><div class="list" style="margin-top:12px">${db.absences.map(a=>`<div class="list-item"><span>🕘</span><span><strong>${esc(emp(a.employee_id)?.name||'Empleado')}</strong><small>${esc(a.type)} · ${esc(a.start_date)} a ${esc(a.end_date||a.start_date)} ${a.start_time?esc(a.start_time+'-'+a.end_time):''}</small></span></div>`).join('')}</div>`; }
function ensureVoiceSettings(){
  db.settings=db.settings||{};
  db.settings.voice={enabled:true,continuous:false,readback:true,ai_mode:'auto',...(db.settings.voice||{})};
  return db.settings.voice;
}
async function refreshAiStatus(){
  const out=$('#aiStatusResult');
  if(out) out.textContent='Comprobando servidor local…';
  try{
    const r=await fetch('/api/ai/status',{headers:{'Accept':'application/json'}});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const data=await r.json();
    if(out) out.textContent=JSON.stringify(data,null,2);
    return data;
  }catch(err){
    if(out) out.textContent='Servidor de IA no disponible en este origen. El NLU local sigue funcionando sin conexión.\n'+String(err?.message||err);
    return null;
  }
}
function settingsCatalogList(kind){
  if(kind==='doctors') return `<div class="settings-list compact-catalog">${db.employees.filter(e=>String(e.role||'').includes('odont')).map(e=>`<div><strong>${esc(e.name)}</strong><small>${esc(e.role)} · ${esc(e.site||'Sin sede')}</small></div>`).join('')}</div>`;
  if(kind==='sites') return `<div class="settings-list compact-catalog">${db.sites.map(s=>`<div><strong>${esc(s.name)}</strong><small>${esc(s.address||'Sede activa')}</small></div>`).join('')}</div>`;
  if(kind==='consents') return `<div class="settings-list compact-catalog">${db.consents.map(x=>`<div><strong>${esc(x.title)}</strong><small>v${x.version||1} · ${(x.signers||['Paciente']).join(' + ')}</small></div>`).join('')}</div>`;
  if(kind==='tariffs') {
    const groups = ['Implantología','Prótesis sobre implantes','Barras','Locator','Regeneración','Seno maxilar','Prótesis','Cirugía','Ortodoncia','Odontopediatría','Estética'];
    const rows = db.procedures.filter(p=>groups.includes(p.category)).slice(0,80);
    return `<div class="settings-list tariff-list">${rows.map(p=>`<div><strong>${esc(p.name)}</strong><small>${esc(p.category)} · ${Number(p.price||0).toLocaleString('es-ES')} € / ${esc(p.unit||'unidad')}</small></div>`).join('')}</div>`;
  }
  if(kind==='labs') {
    const activeWorks = (db.works||[]).slice(-8).reverse();
    const labProcedures = (db.procedures||[]).filter(p=>['Laboratorio','Prótesis','Prótesis sobre implantes','Barras','Locator'].includes(p.category)).slice(0,18);
    const worksHtml = activeWorks.length
      ? activeWorks.map(w=>`<div><strong>${esc(w.title||'Trabajo protésico')}</strong><small>${esc(w.lab||'Laboratorio pendiente')} · ${esc(w.status||'planificado')} · entrega ${esc(w.due_date||'sin fecha')}</small></div>`).join('')
      : '<div><strong>Sin trabajos activos</strong><small>Los trabajos de corona, puente, removible, locator o barra aparecerán aquí al crearse desde el plan o la ficha.</small></div>';
    const proceduresHtml = labProcedures.map(pr=>`<div><strong>${esc(pr.name)}</strong><small>${esc(pr.category)} · ${Number(pr.price||0).toLocaleString('es-ES')} € · ${esc(pr.unit||'unidad')}</small></div>`).join('');
    return `<div class="settings-list compact-catalog"><h3>Trabajos protésicos activos</h3>${worksHtml}<h3>Catálogo protésico/laboratorio</h3>${proceduresHtml}</div>`;
  }
  if(kind==='localai') {
    const voice=ensureVoiceSettings();
    return `<div class="settings-list compact-catalog voice-settings-panel"><label class="field"><span>Ruta de interpretación</span><select id="voiceAiMode"><option value="auto" ${voice.ai_mode==='auto'?'selected':''}>Automático · reglas → IA → MCP</option><option value="rules" ${voice.ai_mode==='rules'?'selected':''}>Solo reglas locales</option><option value="llm" ${voice.ai_mode==='llm'?'selected':''}>LLM del servidor</option><option value="mcp" ${voice.ai_mode==='mcp'?'selected':''}>MCP</option><option value="off" ${voice.ai_mode==='off'?'selected':''}>Sin escalado de IA</option></select></label><label class="check-row"><input id="voiceContinuous" type="checkbox" ${voice.continuous?'checked':''}><span>Escucha continua mientras el micrófono esté activo</span></label><label class="check-row"><input id="voiceReadback" type="checkbox" ${voice.readback!==false?'checked':''}><span>Leer en voz alta la confirmación de Denty</span></label><div class="pill-row"><button type="button" class="ghost" id="checkAiStatus">Comprobar servidor de IA</button></div><pre id="aiStatusResult" class="result-box">NLU local disponible directamente en la página. LLM/MCP son integraciones opcionales para una fase posterior.</pre><div><strong>Privacidad</strong><small>Las reglas locales no envían nada fuera del navegador. Las claves de IA y MCP se leen únicamente en server.py mediante variables de entorno.</small></div></div>`;
  }
  if(kind==='mcp') {
    return `<div class="settings-list compact-catalog"><div><strong>IA externa opcional · adaptador MCP</strong><small>El navegador habla solo con /api/mcp/interpret. server.py reenvía una petición mínima al endpoint configurado con DENTY_MCP_URL.</small></div><div><strong>Credenciales protegidas</strong><small>DENTY_MCP_TOKEN permanece en el PC servidor y nunca se guarda en localStorage ni se entrega al navegador.</small></div><div><strong>Seguridad clínica</strong><small>La respuesta MCP debe ser una intención permitida y superar la misma validación que el NLU local antes de que Denty pueda ejecutarla.</small></div></div>`;
  }
  if(kind==='docs') {
    const templates = (db.templates||[]).slice(0,12);
    const docs = (db.documents||[]).slice(-8).reverse();
    const tplHtml = templates.map(t=>`<div><strong>${esc(t.title)}</strong><small>${esc(t.category||'Documento clínico')} · plantilla para entregar o convertir a PDF en fase posterior</small></div>`).join('');
    const docsHtml = docs.length ? docs.map(d=>`<div><strong>${esc(d.title||'Documento')}</strong><small>${esc(d.type||'documento')} · ${esc(d.created_at||'sin fecha')}</small></div>`).join('') : '<div><strong>Sin documentos generados</strong><small>Los consentimientos, presupuestos, instrucciones y planes para paciente aparecerán aquí.</small></div>';
    return `<div class="settings-list compact-catalog"><h3>Documentos para entregar al paciente</h3>${docsHtml}<h3>Plantillas clínicas disponibles</h3>${tplHtml}</div>`;
  }
  return '';
}
function legacySettingsCards(){
  const cards=[['doctors','👩‍⚕️ Doctores y horarios','Importados desde la APK: Máximo, Isaac y Seneida.'],['sites','📍 Sedes','Sedes base de Centro Dental Funcional.'],['tariffs','€ Tarifas y tratamientos','Tratamientos y precios base importados de Denty.'],['labs','🧪 Laboratorios','Laboratorios, tipos de trabajo y seguimiento.'],['consents','📄 Consentimientos','Plantillas de consentimiento importadas de Denty.'],['localai','✦ Denty Local AI','Preparado para IA local sin coste por token.'],['sync','↔️ Denty Sync','Base uniforme entre dispositivos en ruta futura.'],['backup','📦 Copias locales','Exporta copia JSON de esta preview.'],['appearance','◐ Apariencia','Modo claro Denty y modo oscuro preparado.'],['servers','▯ Servidores locales','PC clínica + SQLite + red local.'],['users','👥 Usuarios y acceso','Roles, permisos y PIN administrador.'],['clinic','⚙️ Clínica y ajustes','Nombre, teléfonos, flujo clínico y seguridad.']];
  return cards.map(c=>`<article class="card setting-panel ${state.settingsPanel===c[0]?'focus':''}"><h2>${c[1]}</h2><p>${c[2]}</p>${settingsCatalogList(c[0])}${c[0]==='backup'?'<button class="ghost" id="backupBtn">Crear copia local</button><pre id="backupResult" class="result-box"></pre>':''}</article>`).join('');
}
function labelForPanel(panel){ return ({doctors:'Doctores y horarios',sites:'Sedes',tariffs:'Tarifas y tratamientos',labs:'Laboratorios',consents:'Consentimientos',localai:'Denty Local AI',sync:'Denty Sync',mcp:'MCP / IA externa',payments:'Pagos y datáfonos',docs:'Documentación para pacientes',backup:'Copias locales',appearance:'Apariencia',servers:'Servidores locales',users:'Usuarios y acceso',clinic:'Clínica y ajustes'})[panel]||'Clínica y ajustes'; }
function renderPlaceholder(view){ return `<section class="placeholder"><h1>${esc(({tasks:'Pendientes',jobs:'Trabajos / laboratorio',finances:'Finanzas',roadmap:'Próximas mejoras'})[view]||'Denty')}</h1><p>Panel preparado con estética Denty. La 0.6.3 separa claramente el odontograma restaurador del periodontal y mejora el sondaje de 6 puntos alrededor del diente.</p></section>`; }

function renderSafetyPanel(){
  const health=validateStorageHealth(storage);
  let snaps=[]; try{ snaps=JSON.parse(storage.getItem('denty_web_recovery_snapshots')||'[]'); }catch{}
  const audits=(db.auditLog||[]).slice(0,8);
  return `<div class="safety-panel"><div class="safety-grid"><div><b>Persistencia web</b><span>${esc(health.message)}</span></div><div><b>Snapshots</b><span>${snaps.length} copias de recuperacion</span></div><div><b>Auditoria local</b><span>${(db.auditLog||[]).length} eventos</span></div><div><b>Acceso clinico</b><span>PIN/usuarios pendiente de servidor local</span></div></div><div class="toolbar"><button class="ghost" id="backupBtn">Exportar copia segura</button><button class="ghost" id="autoBackupBtn">Snapshot ahora</button></div><pre id="backupResult" class="result-box">${audits.length?audits.map(a=>`${new Date(a.at).toLocaleString('es-ES')} - ${a.action}`).join('\n'):'Sin cambios auditados todavia.'}</pre></div>`;
}
function renderAccessPanel(){
  const perms=db.rolePermissions||{};
  return `<div class="phase2-panel access-panel"><div class="access-role-grid">${(db.users||[]).map(u=>`<div class="access-role-card"><b>${esc(u.name)}</b><span>${esc(u.role)}</span><small>${esc((perms[u.role]||[]).join(' · ')||'Sin permisos')}</small><em>${u.pin_required?'PIN requerido':'Acceso operativo'}</em></div>`).join('')}</div><p class="phase2-note">Fase 2 deja preparados roles, permisos y auditoria visible. El bloqueo real por PIN queda para la version con servidor local.</p></div>`;
}
function renderLocalServerPanel(){
  return `<div class="phase2-panel"><div class="safety-grid"><div><b>Servidor local</b><span>Opcional para integraciones reales</span></div><div><b>SQLite</b><span>denty.sqlite</span></div><div><b>Sync</b><span>/api/sync/pull y /api/sync/push</span></div><div><b>Acceso</b><span>Preview web autónoma</span></div></div></div>`;
}
function settingsCards(){
  const cards=[['doctors','Doctores y horarios','Importados desde la APK: Maximo, Isaac y Seneida.'],['sites','Sedes','Sedes base de Centro Dental Funcional.'],['tariffs','Tarifas y tratamientos','Tratamientos y precios base importados de Denty.'],['labs','Laboratorios','Laboratorios, tipos de trabajo y seguimiento.'],['consents','Consentimientos','Plantillas de consentimiento importadas de Denty.'],['localai','Denty Local AI','Preparado para IA local sin coste por token.'],['sync','Denty Sync','Base uniforme entre dispositivos en ruta futura.'],['mcp','MCP / IA externa','Conector futuro para IA externa con seguridad clínica y confirmación.'],['docs','Documentación para pacientes','Instrucciones, planes, presupuestos y documentos entregables.'],['backup','Copias locales y seguridad','Persistencia web, snapshots, auditoria local y exportacion.'],['appearance','Apariencia','Modo claro Denty y modo oscuro preparado.'],['servers','Servidores locales','PC clinica + SQLite + red local.'],['users','Usuarios y acceso','Roles, permisos y PIN administrador.'],['clinic','Clinica y ajustes','Nombre, telefonos, flujo clinico y seguridad.']];
  return cards.map(c=>`<article class="card setting-panel ${state.settingsPanel===c[0]?'focus':''}"><h2>${esc(c[1])}</h2><p>${esc(c[2])}</p>${settingsCatalogList(c[0])}${c[0]==='backup'?renderSafetyPanel():''}${c[0]==='users'?renderAccessPanel():''}${c[0]==='servers'?renderLocalServerPanel():''}</article>`).join('');
}

const SETTINGS_ADMIN_ITEMS = [
  ['clinic','⚙️','Clínica'],['doctors','👩‍⚕️','Doctores y horarios'],['sites','📍','Sedes y gabinetes'],['tariffs','€','Tarifas y tratamientos'],['labs','🧪','Laboratorios'],['consents','📄','Consentimientos'],['docs','📦','Documentación'],['users','👥','Usuarios y acceso'],['appearance','◐','Apariencia'],['payments','💳','Pagos y datáfonos'],['servers','▯','Servidor local'],['sync','↔️','Denty Sync'],['localai','✦','Denty Local AI'],['mcp','🧪','MCP / IA externa'],['backup','💾','Copias y seguridad']
];
function settingsSiteOptions(selected){ return (db.sites||[]).map(x=>`<option value="${x.id}" ${Number(selected)===Number(x.id)?'selected':''}>${esc(x.name)}</option>`).join(''); }
function settingsRecord(type){
  const rid=Number(state.settingsEditId);
  if(type==='doctor') return db.employees.find(x=>Number(x.id)===rid)||null;
  if(type==='site') return db.sites.find(x=>Number(x.id)===rid)||null;
  if(type==='cabinet') return db.cabinets.find(x=>Number(x.id)===rid)||null;
  if(type==='tariff') return db.procedures.find(x=>Number(x.id)===rid)||null;
  if(type==='lab') return db.labs.find(x=>Number(x.id)===rid)||null;
  if(type==='consent') return db.consents.find(x=>Number(x.id)===rid)||null;
  if(type==='user') return db.users.find(x=>Number(x.id)===rid)||null;
  if(type==='template') return db.templates.find(x=>Number(x.id)===rid)||null;
  return null;
}
function settingsEditorShell(title, subtitle, body){ return `<article class="card settings-editor"><div class="section-title"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div></div>${body}</article>`; }
function renderClinicSettingsEditor(){
  const p=db.settings.clinicProfile||{}, a=db.settings.agenda||{};
  return settingsEditorShell('Clínica y agenda','Estos datos son la fuente de verdad para el resto de Denty.',`<form id="clinicSettingsForm" class="admin-form"><div class="form-grid"><label class="field">Nombre comercial<input name="name" value="${esc(p.name||'')}"></label><label class="field">Razón social<input name="legal_name" value="${esc(p.legal_name||'')}"></label><label class="field">NIF/CIF<input name="tax_id" value="${esc(p.tax_id||'')}"></label><label class="field">Teléfono<input name="phone" value="${esc(p.phone||'')}"></label><label class="field">Email<input name="email" type="email" value="${esc(p.email||'')}"></label><label class="field">Web<input name="website" value="${esc(p.website||'')}"></label><label class="field admin-span-2">Dirección principal<input name="address" value="${esc(p.address||'')}"></label><label class="field">Sede predeterminada<select name="default_site_id">${settingsSiteOptions(p.default_site_id)}</select></label><label class="field">Intervalo agenda (min)<input name="slotMinutes" type="number" min="5" step="5" value="${Number(db.settings.slotMinutes||20)}"></label><label class="field">Inicio de jornada<input name="day_start" type="time" value="${esc(a.day_start||'09:00')}"></label><label class="field">Fin de jornada<input name="day_end" type="time" value="${esc(a.day_end||'20:00')}"></label><label class="field">Duración cita por defecto<input name="default_duration" type="number" min="5" step="5" value="${Number(a.default_duration||40)}"></label><label class="check-row"><input name="safeDelete" type="checkbox" ${db.settings.safeDelete!==false?'checked':''}><span>Confirmar borrados sensibles</span></label></div><div class="toolbar"><button class="primary">Guardar clínica</button></div></form>`);
}
function renderDoctorsSettingsEditor(){
  const editing=state.settingsEditType==='doctor', r=editing?settingsRecord('doctor'):null;
  const rows=(db.employees||[]).filter(e=>String(e.role||'').toLowerCase().includes('odont')).map(e=>`<div class="admin-row"><span class="admin-color" style="background:${esc(e.color||'#409bd7')}"></span><span><strong>${esc(e.name)}</strong><small>${esc(e.role)} · ${esc(db.sites.find(s=>Number(s.id)===Number(e.site_id))?.name||e.site||'Sin sede')} · ${e.active!==false?'activo':'inactivo'}</small></span><div class="admin-row-actions"><button class="ghost mini" data-settings-edit="doctor:${e.id}">Editar</button><button class="ghost mini" data-settings-toggle="doctor:${e.id}">${e.active!==false?'Desactivar':'Activar'}</button></div></div>`).join('');
  const form=`<div class="toolbar"><button class="primary" data-settings-new="doctor">+ Nuevo doctor</button></div>${editing?`<form id="doctorAdminForm" class="admin-form"><input type="hidden" name="id" value="${r?.id||''}"><div class="form-grid"><label class="field">Nombre<input name="name" required value="${esc(r?.name||'')}"></label><label class="field">Rol<select name="role"><option ${r?.role==='odontólogo'?'selected':''}>odontólogo</option><option ${r?.role==='odontóloga'?'selected':''}>odontóloga</option></select></label><label class="field">Sede<select name="site_id">${settingsSiteOptions(r?.site_id)}</select></label><label class="field">Teléfono<input name="phone" value="${esc(r?.phone||'')}"></label><label class="field">Email<input name="email" type="email" value="${esc(r?.email||'')}"></label><label class="field">Color<input name="color" type="color" value="${esc(r?.color||'#409bd7')}"></label><label class="check-row"><input name="active" type="checkbox" ${r?.active!==false?'checked':''}><span>Activo</span></label></div><div class="toolbar"><button class="primary">Guardar doctor</button><button type="button" class="ghost" data-settings-cancel>Cancelar</button></div></form>`:'<div class="admin-hint">Pulsa Editar o crea un nuevo doctor.</div>'}`;
  const shifts=(db.shifts||[]).map(sh=>`<div class="admin-row compact"><span><strong>${esc(emp(sh.employee_id)?.name||'Empleado')} · ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][Number(sh.weekday)]||''}</strong><small>${esc(sh.start_time)}-${esc(sh.end_time)} · ${esc(db.sites.find(x=>Number(x.id)===Number(sh.site_id))?.name||'Sin sede')}</small></span><button class="danger mini" data-settings-delete="shift:${sh.id}">Quitar</button></div>`).join('');
  const shiftForm=`<form id="shiftAdminForm" class="admin-form"><h3>Añadir horario</h3><div class="form-grid"><label class="field">Profesional<select name="employee_id">${db.employees.filter(e=>String(e.role||'').toLowerCase().includes('odont')).map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></label><label class="field">Día<select name="weekday">${['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select></label><label class="field">Desde<input name="start_time" type="time" value="09:00"></label><label class="field">Hasta<input name="end_time" type="time" value="14:00"></label><label class="field">Sede<select name="site_id">${settingsSiteOptions(db.settings.clinicProfile?.default_site_id)}</select></label></div><button class="ghost">Añadir horario</button></form>`;
  return settingsEditorShell('Doctores y horarios','Alta, edición, estado, sede y horarios vinculados a la agenda.',`<div class="admin-list">${rows||'<div class="empty-state">Sin doctores.</div>'}</div>${form}<h3>Horarios</h3><div class="admin-list">${shifts||'<div class="empty-state">Sin horarios.</div>'}</div>${shiftForm}`);
}
function renderSitesSettingsEditor(){
  const editSite=state.settingsEditType==='site', site=editSite?settingsRecord('site'):null;
  const editCab=state.settingsEditType==='cabinet', cab=editCab?settingsRecord('cabinet'):null;
  const rows=(db.sites||[]).map(x=>`<div class="admin-row"><span><strong>${esc(x.name)}</strong><small>${esc(x.address||'')} · ${esc(x.phone||'sin teléfono')} · ${x.active!==false?'activa':'inactiva'}</small></span><div class="admin-row-actions"><button class="ghost mini" data-settings-edit="site:${x.id}">Editar</button><button class="ghost mini" data-settings-toggle="site:${x.id}">${x.active!==false?'Desactivar':'Activar'}</button></div></div>`).join('');
  const form=editSite?`<form id="siteAdminForm" class="admin-form"><input type="hidden" name="id" value="${site?.id||''}"><div class="form-grid"><label class="field">Nombre<input name="name" required value="${esc(site?.name||'')}"></label><label class="field admin-span-2">Dirección<input name="address" value="${esc(site?.address||'')}"></label><label class="field">Teléfono<input name="phone" value="${esc(site?.phone||'')}"></label><label class="field">Email<input name="email" type="email" value="${esc(site?.email||'')}"></label><label class="check-row"><input name="active" type="checkbox" ${site?.active!==false?'checked':''}><span>Sede activa</span></label></div><div class="toolbar"><button class="primary">Guardar sede</button><button type="button" class="ghost" data-settings-cancel>Cancelar</button></div></form>`:'<div class="toolbar"><button class="primary" data-settings-new="site">+ Nueva sede</button></div>';
  const cabinets=(db.cabinets||[]).map(c=>`<div class="admin-row compact"><span><strong>${esc(c.name)}</strong><small>${esc(db.sites.find(s=>Number(s.id)===Number(c.site_id))?.name||'Sin sede')} · ${c.active!==false?'activo':'inactivo'}</small></span><button class="ghost mini" data-settings-edit="cabinet:${c.id}">Editar</button></div>`).join('');
  const cabForm=editCab?`<form id="cabinetAdminForm" class="admin-form"><input type="hidden" name="id" value="${cab?.id||''}"><div class="form-grid"><label class="field">Gabinete<input name="name" required value="${esc(cab?.name||'')}"></label><label class="field">Sede<select name="site_id">${settingsSiteOptions(cab?.site_id)}</select></label><label class="check-row"><input name="active" type="checkbox" ${cab?.active!==false?'checked':''}><span>Activo</span></label></div><div class="toolbar"><button class="primary">Guardar gabinete</button><button type="button" class="ghost" data-settings-cancel>Cancelar</button></div></form>`:`<div class="toolbar"><button class="ghost" data-settings-new="cabinet">+ Nuevo gabinete</button></div>`;
  return settingsEditorShell('Sedes y gabinetes','Lo que cambies aquí se utiliza en agenda, profesionales y citas.',`<div class="admin-list">${rows}</div>${form}<h3>Gabinetes</h3><div class="admin-list">${cabinets}</div>${cabForm}`);
}
function renderTariffsSettingsEditor(){
  const editing=state.settingsEditType==='tariff', r=editing?settingsRecord('tariff'):null;
  const rows=(db.procedures||[]).map(pr=>`<div class="admin-row"><span><strong>${esc(pr.name)}</strong><small>${esc(pr.category)} · ${Number(pr.price||0).toLocaleString('es-ES')} € · ${Number(pr.duration||0)} min · ${pr.active!==false?'activo':'inactivo'}</small></span><div class="admin-row-actions"><button class="ghost mini" data-settings-edit="tariff:${pr.id}">Editar</button><button class="ghost mini" data-settings-toggle="tariff:${pr.id}">${pr.active!==false?'Desactivar':'Activar'}</button></div></div>`).join('');
  const form=editing?`<form id="tariffAdminForm" class="admin-form"><input type="hidden" name="id" value="${r?.id||''}"><div class="form-grid"><label class="field">Tratamiento<input name="name" required value="${esc(r?.name||'')}"></label><label class="field">Categoría<input name="category" value="${esc(r?.category||'General')}"></label><label class="field">Precio €<input name="price" type="number" min="0" step="0.01" value="${Number(r?.price||0)}"></label><label class="field">Duración min<input name="duration" type="number" min="0" step="5" value="${Number(r?.duration||0)}"></label><label class="field">Unidad<input name="unit" value="${esc(r?.unit||'unidad')}"></label><label class="field">Consentimiento<select name="consent"><option value="">Sin consentimiento</option>${db.consents.map(c=>`<option ${r?.consent===c.title?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label><label class="field">Color<input name="color" type="color" value="${esc(r?.color||'#607D8B')}"></label><label class="field">Icono<input name="icon" value="${esc(r?.icon||'◉')}"></label><label class="check-row"><input name="active" type="checkbox" ${r?.active!==false?'checked':''}><span>Tratamiento activo</span></label></div><div class="toolbar"><button class="primary">Guardar tratamiento</button><button type="button" class="ghost" data-settings-cancel>Cancelar</button></div></form>`:'<div class="toolbar"><button class="primary" data-settings-new="tariff">+ Nuevo tratamiento</button></div>';
  return settingsEditorShell('Tarifas y tratamientos','El catálogo alimenta presupuestos, planes y agenda.',`<div class="admin-list admin-scroll">${rows}</div>${form}`);
}
function renderLabsSettingsEditor(){
  const editing=state.settingsEditType==='lab', r=editing?settingsRecord('lab'):null;
  const rows=(db.labs||[]).map(l=>`<div class="admin-row"><span><strong>${esc(l.name)}</strong><small>${esc(l.contact||'sin contacto')} · ${esc(l.phone||'sin teléfono')} · ${l.active!==false?'activo':'inactivo'}</small></span><div class="admin-row-actions"><button class="ghost mini" data-settings-edit="lab:${l.id}">Editar</button><button class="ghost mini" data-settings-toggle="lab:${l.id}">${l.active!==false?'Desactivar':'Activar'}</button></div></div>`).join('');
  const form=editing?`<form id="labAdminForm" class="admin-form"><input type="hidden" name="id" value="${r?.id||''}"><div class="form-grid"><label class="field">Laboratorio<input name="name" required value="${esc(r?.name||'')}"></label><label class="field">Contacto<input name="contact" value="${esc(r?.contact||'')}"></label><label class="field">Teléfono<input name="phone" value="${esc(r?.phone||'')}"></label><label class="field">Email<input name="email" type="email" value="${esc(r?.email||'')}"></label><label class="field admin-span-2">Notas<textarea name="notes">${esc(r?.notes||'')}</textarea></label><label class="check-row"><input name="active" type="checkbox" ${r?.active!==false?'checked':''}><span>Laboratorio activo</span></label></div><div class="toolbar"><button class="primary">Guardar laboratorio</button><button type="button" class="ghost" data-settings-cancel>Cancelar</button></div></form>`:'<div class="toolbar"><button class="primary" data-settings-new="lab">+ Nuevo laboratorio</button></div>';
  const works=(db.works||[]).slice().reverse().slice(0,12).map(w=>`<div class="admin-row compact"><span><strong>${esc(w.title||'Trabajo')}</strong><small>${esc(w.lab||db.labs.find(l=>Number(l.id)===Number(w.lab_id))?.name||'Sin laboratorio')} · ${esc(w.status||'planificado')} · ${esc(w.due_date||'sin entrega')}</small></span></div>`).join('');
  return settingsEditorShell('Laboratorios','Directorio editable y trabajos recientes vinculados.',`<div class="admin-list">${rows}</div>${form}<h3>Trabajos recientes</h3><div class="admin-list">${works||'<div class="empty-state">Sin trabajos todavía.</div>'}</div>`);
}
function renderConsentsSettingsEditor(){
  const editing=state.settingsEditType==='consent', r=editing?settingsRecord('consent'):null;
  const rows=(db.consents||[]).map(c=>`<div class="admin-row"><span><strong>${esc(c.title)}</strong><small>v${Number(c.version||1)} · ${(c.signers||[]).map(esc).join(' + ')} · ${c.active!==false?'activo':'inactivo'}</small></span><div class="admin-row-actions"><button class="ghost mini" data-settings-edit="consent:${c.id}">Editar</button><button class="ghost mini" data-settings-toggle="consent:${c.id}">${c.active!==false?'Desactivar':'Activar'}</button></div></div>`).join('');
  const form=editing?`<form id="consentAdminForm" class="admin-form"><input type="hidden" name="id" value="${r?.id||''}"><div class="form-grid"><label class="field">Título<input name="title" required value="${esc(r?.title||'')}"></label><label class="field">Versión<input name="version" type="number" min="1" value="${Number(r?.version||1)}"></label><label class="field admin-span-2">Firmantes<input name="signers" value="${esc((r?.signers||['Paciente']).join(', '))}" placeholder="Paciente, Profesional"></label><label class="field admin-span-2">Texto completo<textarea name="text" class="admin-textarea-tall">${esc(r?.text||'')}</textarea></label><label class="check-row"><input name="active" type="checkbox" ${r?.active!==false?'checked':''}><span>Plantilla activa</span></label></div><div class="toolbar"><button class="primary">Guardar consentimiento</button><button type="button" class="ghost" data-settings-cancel>Cancelar</button></div></form>`:'<div class="toolbar"><button class="primary" data-settings-new="consent">+ Nuevo consentimiento</button></div>';
  return settingsEditorShell('Consentimientos','Las plantillas modificadas se usarán al crear nuevos documentos.',`<div class="admin-list admin-scroll">${rows}</div>${form}`);
}
function renderDocsSettingsEditor(){
  const editing=state.settingsEditType==='template', r=editing?settingsRecord('template'):null;
  const rows=(db.templates||[]).map(t=>`<div class="admin-row"><span><strong>${esc(t.title)}</strong><small>${esc(t.category||'General')}</small></span><div class="admin-row-actions"><button class="ghost mini" data-settings-edit="template:${t.id}">Editar</button><button class="danger mini" data-settings-delete="template:${t.id}">Eliminar</button></div></div>`).join('');
  const form=editing?`<form id="templateAdminForm" class="admin-form"><input type="hidden" name="id" value="${r?.id||''}"><div class="form-grid"><label class="field">Título<input name="title" required value="${esc(r?.title||'')}"></label><label class="field">Categoría<input name="category" value="${esc(r?.category||'General')}"></label><label class="field admin-span-2">Contenido<textarea name="text" class="admin-textarea-tall">${esc(r?.text||'')}</textarea></label></div><div class="toolbar"><button class="primary">Guardar plantilla</button><button type="button" class="ghost" data-settings-cancel>Cancelar</button></div></form>`:'<div class="toolbar"><button class="primary" data-settings-new="template">+ Nueva plantilla</button></div>';
  return settingsEditorShell('Documentación para pacientes','Plantillas de textos clínicos y documentos entregables.',`<div class="admin-list">${rows}</div>${form}`);
}
function renderUsersSettingsEditor(){
  const editing=state.settingsEditType==='user', r=editing?settingsRecord('user'):null;
  const currentId=Number(db.currentUser?.id||0);
  const session=`<form id="currentUserForm" class="admin-form session-user-form"><h3>Usuario activo en esta sesión</h3><div class="form-grid"><label class="field">Trabajar como<select name="user_id">${(db.users||[]).filter(u=>u.active!==false).map(u=>`<option value="${u.id}" ${Number(u.id)===currentId?'selected':''}>${esc(u.name)} · ${esc(u.role)}</option>`).join('')}</select></label></div><button class="ghost">Cambiar usuario activo</button></form>`;
  const rows=(db.users||[]).map(u=>{ const linked=emp(u.employee_id); return `<div class="admin-row"><span><strong>${esc(u.name)}</strong><small>${esc(u.role)}${linked?` · agenda: ${esc(linked.name)}`:''} · ${u.pin_required?'PIN requerido':'sin PIN'} · ${u.active!==false?'activo':'inactivo'}${Number(u.id)===currentId?' · EN USO':''}</small></span><div class="admin-row-actions"><button class="ghost mini" data-settings-edit="user:${u.id}">Editar</button><button class="ghost mini" data-settings-toggle="user:${u.id}">${u.active!==false?'Desactivar':'Activar'}</button></div></div>`; }).join('');
  const employeeOptions=['<option value="">Sin vínculo</option>',...(db.employees||[]).filter(e=>String(e.role||'').toLowerCase().includes('odont')).map(e=>`<option value="${e.id}" ${Number(r?.employee_id)===Number(e.id)?'selected':''}>${esc(e.name)}</option>`)].join('');
  const form=editing?`<form id="userAdminForm" class="admin-form"><input type="hidden" name="id" value="${r?.id||''}"><div class="form-grid"><label class="field">Nombre<input name="name" required value="${esc(r?.name||'')}"></label><label class="field">Rol<select name="role"><option value="admin" ${r?.role==='admin'?'selected':''}>Administrador</option><option value="dentist" ${r?.role==='dentist'?'selected':''}>Odontólogo</option><option value="reception" ${r?.role==='reception'?'selected':''}>Recepción / Secretaría</option></select></label><label class="field">Profesional vinculado<select name="employee_id">${employeeOptions}</select></label><label class="check-row"><input name="pin_required" type="checkbox" ${r?.pin_required?'checked':''}><span>Requerir PIN</span></label><label class="check-row"><input name="active" type="checkbox" ${r?.active!==false?'checked':''}><span>Usuario activo</span></label></div><div class="toolbar"><button class="primary">Guardar usuario</button><button type="button" class="ghost" data-settings-cancel>Cancelar</button></div></form>`:'<div class="toolbar"><button class="primary" data-settings-new="user">+ Nuevo usuario</button></div>';
  const perms=Object.entries(db.rolePermissions||{}).map(([role,arr])=>`<form class="rolePermissionsForm admin-row permission-row" data-role="${esc(role)}"><span><strong>${esc(role)}</strong><small>Permisos separados por comas</small></span><input name="permissions" value="${esc((arr||[]).join(', '))}"><button class="ghost mini">Guardar</button></form>`).join('');
  return settingsEditorShell('Usuarios y acceso','Usuarios locales, rol, PIN y permisos que controlan la navegación.',`${session}<div class="admin-list">${rows}</div>${form}<h3>Permisos por rol</h3><div class="admin-list">${perms}</div>`);
}
function renderAppearanceSettingsEditor(){
  return settingsEditorShell('Apariencia','La preferencia se guarda en esta instalación.',`<form id="appearanceSettingsForm" class="admin-form"><div class="form-grid"><label class="field">Tema<select name="appearance"><option value="light" ${db.settings.appearance==='light'?'selected':''}>Claro</option><option value="dark" ${db.settings.appearance==='dark'?'selected':''}>Oscuro</option><option value="system" ${db.settings.appearance==='system'?'selected':''}>Automático del sistema</option></select></label><label class="field">Densidad<select name="density"><option value="comfortable" ${db.settings.density!=='compact'?'selected':''}>Cómoda</option><option value="compact" ${db.settings.density==='compact'?'selected':''}>Compacta</option></select></label></div><button class="primary">Aplicar apariencia</button></form>`);
}
function renderPaymentsSettingsEditor(){
  const p=db.settings.payments||{}, readers=paymentRuntime.readers||[];
  const defaultOptions=readerOptions(p.default_reader_id);
  const siteRows=(db.sites||[]).filter(site=>site.active!==false).map(site=>{ const selected=String(p.reader_by_site?.[String(site.id)]||''); return `<label class="field">${esc(site.name)}<select class="siteReaderSelect" data-site-id="${site.id}">${readerOptions(selected)}</select></label>`; }).join('');
  const rows=readers.length?readers.map(r=>`<div class="admin-row terminal-reader-row" data-reader-row="${esc(r.id)}"><span><strong>${esc(r.name)}</strong><small>${esc(r.device?.model||'lector')} · ${esc(r.device?.identifier||r.id)}</small></span><div class="reader-live-state" data-reader-state="${esc(r.id)}">${esc(r.status||'desconocido')}</div></div>`).join(''):'<div class="empty-state" id="paymentReadersEmpty">Pulsa “Actualizar datáfonos” para consultar el servidor.</div>';
  return settingsEditorShell('Pagos y datáfonos','Configura y prueba el flujo de cobro desde esta página. En preview se usa un datáfono virtual; un proveedor real se conecta después mediante backend seguro.',`<div id="paymentProviderStatus" class="payment-provider-status">Proveedor sin consultar.</div><form id="paymentSettingsForm" class="admin-form"><div class="form-grid"><label class="field">Moneda<input name="currency" value="${esc(p.currency||'EUR')}" maxlength="3"></label><label class="field">Datáfono predeterminado<select name="default_reader_id" id="paymentDefaultReaderSelect">${defaultOptions}</select></label></div><h3>Datáfono por sede</h3><div class="form-grid" id="paymentSiteReaders">${siteRows}</div><div class="toolbar"><button class="primary">Guardar asignación</button><button type="button" class="ghost" id="refreshPaymentReaders">Actualizar datáfonos</button></div></form><h3>Lectores vinculados</h3><div class="admin-list" id="paymentReaderList">${rows}</div><h3>Emparejar SumUp Solo</h3><form id="pairTerminalForm" class="admin-form"><div class="form-grid"><label class="field">Nombre del datáfono<input name="name" value="Recepción" maxlength="80"></label><label class="field">Código de emparejamiento<input name="pairing_code" required minlength="8" maxlength="9" placeholder="4WLFDSBF" autocomplete="off"></label></div><div class="toolbar"><button class="primary">Emparejar datáfono</button></div></form><pre id="paymentSettingsResult" class="result-box">Preview web: el datáfono virtual funciona directamente desde esta página, sin configuración externa.</pre>`);
}
async function refreshPaymentSettings(){
  const statusEl=$('#paymentProviderStatus'), list=$('#paymentReaderList'); if(statusEl)statusEl.textContent='Consultando sistema de pagos…';
  const readers=await loadPaymentReaders({silent:true}), cfg=paymentRuntime.providerStatus||{};
  if(statusEl){ statusEl.className=`payment-provider-status ${cfg.enabled?'ready':'error'}`; statusEl.textContent=cfg.enabled?`Proveedor ${cfg.provider} · ${cfg.mode||'activo'}${cfg.merchant_code_masked?' · comercio '+cfg.merchant_code_masked:''}`:`Pagos no configurados · ${cfg.error||cfg.provider||'off'}`; }
  const states={};
  await Promise.all(readers.map(async r=>{ try{ const out=await paymentApi(`/api/payments/reader-status?reader_id=${encodeURIComponent(r.id)}`); states[r.id]=out.status||{}; }catch{ states[r.id]={status:'DESCONOCIDO'}; } }));
  paymentRuntime.readerStatus=states;
  if(list) list.innerHTML=readers.length?readers.map(r=>{const st=states[r.id]||{};return `<div class="admin-row terminal-reader-row"><span><strong>${esc(r.name)}</strong><small>${esc(r.device?.model||'lector')} · ${esc(r.device?.identifier||r.id)}</small></span><div class="reader-live-state ${String(st.status||'').toLowerCase()}"><b>${esc(st.status||r.status||'desconocido')}</b><small>${esc(st.state||'')}</small></div></div>`;}).join(''):'<div class="empty-state">No hay datáfonos vinculados.</div>';
  const p=db.settings.payments||{};
  const def=$('#paymentDefaultReaderSelect'); if(def){def.innerHTML=readerOptions(p.default_reader_id);def.value=p.default_reader_id||'';}
  $$('.siteReaderSelect').forEach(sel=>{const siteId=String(sel.dataset.siteId);const selected=String(p.reader_by_site?.[siteId]||'');sel.innerHTML=readerOptions(selected);sel.value=selected;});
}
async function pairTerminalFromSettings(form){
  const out=$('#paymentSettingsResult'); if(out)out.textContent='Emparejando…'; const d=formData(form);
  try{ const data=await paymentApi('/api/payments/readers/pair',{method:'POST',body:JSON.stringify({name:d.name,pairing_code:d.pairing_code})}); if(out)out.textContent=`Datáfono ${data.reader?.name||''} enviado a emparejamiento.`; form.elements.pairing_code.value=''; await refreshPaymentSettings(); toast('Datáfono vinculado'); }
  catch(err){ if(out)out.textContent=paymentErrorText(err); toast('No se pudo emparejar el datáfono'); }
}

function renderServerSettingsEditor(){ const s=db.settings.server||{}; return settingsEditorShell('Servidor local','Configuración visible del PC clínico. Las credenciales sensibles permanecen fuera del navegador.',`<form id="serverSettingsForm" class="admin-form"><div class="form-grid"><label class="field">Nombre<input name="name" value="${esc(s.name||'')}"></label><label class="field">URL base<input name="base_url" value="${esc(s.base_url||'')}"></label><label class="field">SQLite<input name="sqlite_path" value="${esc(s.sqlite_path||'denty.sqlite')}"></label><label class="check-row"><input name="enabled" type="checkbox" ${s.enabled!==false?'checked':''}><span>Servidor habilitado</span></label></div><div class="toolbar"><button class="primary">Guardar servidor</button><button type="button" class="ghost" id="checkLocalServer">Comprobar conexión</button></div><pre id="localServerResult" class="result-box">Sin comprobar.</pre></form>`); }
function renderSyncSettingsEditor(){ const s=db.settings.sync||{}; return settingsEditorShell('Denty Sync','Controla si esta instalación intenta sincronizar con el servidor local.',`<form id="syncSettingsForm" class="admin-form"><div class="form-grid"><label class="check-row"><input name="enabled" type="checkbox" ${s.enabled?'checked':''}><span>Activar Sync</span></label><label class="field">Modo<select name="mode"><option value="manual" ${s.mode==='manual'?'selected':''}>Manual</option><option value="auto" ${s.mode==='auto'?'selected':''}>Automático</option></select></label><label class="field">Intervalo automático (min)<input name="auto_minutes" type="number" min="5" value="${Number(s.auto_minutes||15)}"></label></div><div class="toolbar"><button class="primary">Guardar Sync</button><button type="button" class="ghost" id="syncPullNow">Probar lectura del servidor</button></div><pre id="syncResult" class="result-box">Sync ${s.enabled?'activado':'desactivado'}.</pre></form>`); }

function renderMcpSettingsEditor(){ const m=db.settings.mcp||{}; return settingsEditorShell('MCP / IA externa','El endpoint proxy es editable; tokens y secretos siguen únicamente en el PC servidor.',`<form id="mcpSettingsForm" class="admin-form"><div class="form-grid"><label class="check-row"><input name="enabled" type="checkbox" ${m.enabled?'checked':''}><span>Permitir escalado MCP</span></label><label class="field">Ruta proxy MCP<input name="path" value="${esc(m.path||'/api/mcp/interpret')}"></label></div><div class="toolbar"><button class="primary">Guardar MCP</button></div><div class="admin-hint">La URL remota y el token no se muestran ni se guardan en el navegador. Se mantienen en server.py / variables de entorno por seguridad.</div></form>`); }
function renderBackupSettingsEditor(){ const b=db.settings.backup||{}; return settingsEditorShell('Copias locales y seguridad','Controla cuántas copias de recuperación conserva Denty.',`<form id="backupSettingsForm" class="admin-form"><div class="form-grid"><label class="field">Snapshots a conservar<input name="retention" type="number" min="1" max="50" value="${Number(b.retention||12)}"></label></div><button class="primary">Guardar política de copias</button></form>${renderSafetyPanel()}`); }

function renderSettingsAdminPanel(kind){
  if(kind==='clinic') return renderClinicSettingsEditor();
  if(kind==='doctors') return renderDoctorsSettingsEditor();
  if(kind==='sites') return renderSitesSettingsEditor();
  if(kind==='tariffs') return renderTariffsSettingsEditor();
  if(kind==='labs') return renderLabsSettingsEditor();
  if(kind==='consents') return renderConsentsSettingsEditor();
  if(kind==='docs') return renderDocsSettingsEditor();
  if(kind==='users') return renderUsersSettingsEditor();
  if(kind==='appearance') return renderAppearanceSettingsEditor();
  if(kind==='payments') return renderPaymentsSettingsEditor();
  if(kind==='servers') return renderServerSettingsEditor();
  if(kind==='sync') return renderSyncSettingsEditor();
  if(kind==='localai') return settingsEditorShell('Denty Local AI','NLU local y escalado opcional.',settingsCatalogList('localai'));
  if(kind==='mcp') return renderMcpSettingsEditor();
  if(kind==='backup') return renderBackupSettingsEditor();
  return renderClinicSettingsEditor();
}
function renderRestrictedAccess(){
  return `<section><div class="page-head"><div><h1>Acceso restringido</h1><p>Solo administrador puede modificar ajustes de la clinica.</p></div></div><article class="card"><p>Esta cuenta puede trabajar con pacientes, agenda, laboratorios y finanzas, pero no cambiar configuracion administrativa.</p><button class="primary" data-go="today">Volver a Hoy</button></article></section>`;
}
function renderSettings(){ if(!canAccess('ajustes')) return renderRestrictedAccess();
  const nav=SETTINGS_ADMIN_ITEMS.map(([key,icon,label])=>`<button type="button" class="settings-nav-item ${state.settingsPanel===key?'active':''}" data-settings-panel="${key}"><span>${icon}</span><b>${esc(label)}</b></button>`).join('');
  return `<section><div class="page-head"><div><h1>Ajustes</h1><p>${esc(labelForPanel(state.settingsPanel))} · editable y persistente</p></div></div><div class="settings-admin-layout"><aside class="settings-admin-nav">${nav}</aside><div class="settings-admin-main">${renderSettingsAdminPanel(state.settingsPanel)}</div></div></section>`;
}
function applyAppearance(){
  const pref=db.settings?.appearance||'light';
  const resolved=pref==='system'?(window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light'):pref;
  document.documentElement.dataset.theme=resolved;
  document.documentElement.dataset.density=db.settings?.density||'comfortable';
  document.title=`${db.settings?.clinicProfile?.name||'Denty'} · Denty`;
}
function resetSettingsEdit(){ state.settingsEditType=null; state.settingsEditId=null; }
function startSettingsEdit(type,id=null){ state.settingsEditType=type; state.settingsEditId=id==null?null:Number(id); render(); }
function adminUpsert(listName, data, transform=x=>x){
  const list=db[listName]||(db[listName]=[]), rid=Number(data.id||0); let rec=list.find(x=>Number(x.id)===rid);
  const values=transform(data);
  if(rec) Object.assign(rec,values); else { rec={id:id(db),...values}; list.push(rec); }
  return rec;
}
async function checkLocalServer(){ const out=$('#localServerResult'); if(out) out.textContent='Comprobando…'; try{ const r=await fetch('/api/ai/status'); const data=await r.json(); if(out) out.textContent=`Conectado · HTTP ${r.status}\n`+JSON.stringify(data,null,2); }catch(err){ if(out) out.textContent='No disponible desde este origen\n'+String(err?.message||err); } }
async function syncPullNow(){ const out=$('#syncResult'); if(out) out.textContent='Consultando…'; try{ const r=await fetch('/api/sync/pull'); const data=await r.json(); if(out) out.textContent=`Servidor responde · HTTP ${r.status}\n`+JSON.stringify(data,null,2).slice(0,3000); }catch(err){ if(out) out.textContent='Sync no disponible\n'+String(err?.message||err); } }
function bindSettingsAdmin(){
  $$('[data-settings-panel]').forEach(b=>b.onclick=()=>{ state.settingsPanel=b.dataset.settingsPanel; resetSettingsEdit(); render(); });
  $$('[data-settings-edit]').forEach(b=>b.onclick=()=>{ const [type,rid]=b.dataset.settingsEdit.split(':'); startSettingsEdit(type,rid); });
  $$('[data-settings-new]').forEach(b=>b.onclick=()=>startSettingsEdit(b.dataset.settingsNew,null));
  $$('[data-settings-cancel]').forEach(b=>b.onclick=()=>{ resetSettingsEdit(); render(); });
  $$('[data-settings-toggle]').forEach(b=>b.onclick=()=>{ const [type,rid]=b.dataset.settingsToggle.split(':'); const map={doctor:'employees',site:'sites',tariff:'procedures',lab:'labs',consent:'consents',user:'users'}; const rec=(db[map[type]]||[]).find(x=>Number(x.id)===Number(rid)); if(!rec)return; snapshot(`settings.${type}.toggle`); rec.active=rec.active===false; persist(); render(); });
  $$('[data-settings-delete]').forEach(b=>b.onclick=()=>{ const [type,rid]=b.dataset.settingsDelete.split(':'); const map={shift:'shifts',template:'templates'}; const key=map[type]; if(!key)return; if(!confirmDanger(`¿Eliminar ${type}?`,`settings.${type}.delete`))return; snapshot(`settings.${type}.delete`); db[key]=db[key].filter(x=>Number(x.id)!==Number(rid)); persist(); render(); });
  const bindForm=(selector, action, handler)=>{ const f=$(selector); if(!f)return; f.onsubmit=e=>{ e.preventDefault(); const d=formData(f); snapshot(action); handler(d,f); persist(); resetSettingsEdit(); render(); toast('Cambios guardados'); }; };
  bindForm('#clinicSettingsForm','settings.clinic.update',(d,f)=>{ db.settings.clinicProfile={...db.settings.clinicProfile,name:d.name.trim(),legal_name:d.legal_name.trim(),tax_id:d.tax_id.trim(),phone:d.phone.trim(),email:d.email.trim(),address:d.address.trim(),website:d.website.trim(),default_site_id:Number(d.default_site_id||0)}; db.settings.clinic=db.settings.clinicProfile.name; db.settings.slotMinutes=Math.max(5,Number(d.slotMinutes||20)); db.settings.safeDelete=!!f.elements.safeDelete.checked; db.settings.agenda={...db.settings.agenda,day_start:d.day_start,day_end:d.day_end,default_duration:Math.max(5,Number(d.default_duration||40))}; });
  bindForm('#doctorAdminForm','settings.doctor.save',(d,f)=>{ const site=db.sites.find(x=>Number(x.id)===Number(d.site_id)); adminUpsert('employees',d,x=>({name:x.name.trim(),role:x.role,site_id:Number(x.site_id),site:site?.name||'',phone:x.phone.trim(),email:x.email.trim(),color:x.color||'#409bd7',active:!!f.elements.active.checked,doctor_id:Number(x.id)||null})); db.doctors=db.employees.filter(e=>String(e.role||'').toLowerCase().includes('odont')).map(e=>({id:e.doctor_id||e.id,name:e.name,color:e.color,active:e.active,site_id:e.site_id})); });
  bindForm('#shiftAdminForm','settings.shift.create',(d)=>{ db.shifts.push({id:id(db),employee_id:Number(d.employee_id),weekday:Number(d.weekday),start_time:d.start_time,end_time:d.end_time,site_id:Number(d.site_id)}); });
  bindForm('#siteAdminForm','settings.site.save',(d,f)=>{ adminUpsert('sites',d,x=>({name:x.name.trim(),address:x.address.trim(),phone:x.phone.trim(),email:x.email.trim(),active:!!f.elements.active.checked})); });
  bindForm('#cabinetAdminForm','settings.cabinet.save',(d,f)=>{ adminUpsert('cabinets',d,x=>({name:x.name.trim(),site_id:Number(x.site_id),active:!!f.elements.active.checked})); });
  bindForm('#tariffAdminForm','settings.tariff.save',(d,f)=>{ adminUpsert('procedures',d,x=>({name:x.name.trim(),category:x.category.trim()||'General',price:Number(x.price||0),duration:Number(x.duration||0),unit:x.unit.trim()||'unidad',consent:x.consent||'',color:x.color||'#607D8B',icon:x.icon||'◉',active:!!f.elements.active.checked})); });
  bindForm('#labAdminForm','settings.lab.save',(d,f)=>{ adminUpsert('labs',d,x=>({name:x.name.trim(),contact:x.contact.trim(),phone:x.phone.trim(),email:x.email.trim(),notes:x.notes.trim(),active:!!f.elements.active.checked})); });
  bindForm('#consentAdminForm','settings.consent.save',(d,f)=>{ adminUpsert('consents',d,x=>({title:x.title.trim(),version:Math.max(1,Number(x.version||1)),signers:x.signers.split(',').map(v=>v.trim()).filter(Boolean),text:x.text,active:!!f.elements.active.checked})); });
  bindForm('#templateAdminForm','settings.template.save',(d)=>{ adminUpsert('templates',d,x=>({title:x.title.trim(),category:x.category.trim()||'General',text:x.text})); });
  bindForm('#userAdminForm','settings.user.save',(d,f)=>{ adminUpsert('users',d,x=>({name:x.name.trim(),role:x.role,employee_id:x.employee_id?Number(x.employee_id):null,pin_required:!!f.elements.pin_required.checked,active:!!f.elements.active.checked})); });
  const currentUserForm=$('#currentUserForm'); if(currentUserForm) currentUserForm.onsubmit=e=>{ e.preventDefault(); const u=db.users.find(x=>Number(x.id)===Number(currentUserForm.elements.user_id.value)); if(!u)return; snapshot('settings.current_user.update'); setSessionUser({id:u.id,role:u.role,name:u.name,employee_id:u.employee_id??null}); pinUnlocked=false; render(); toast('Usuario activo en esta sesion: '+u.name); };
  $$('.rolePermissionsForm').forEach(f=>f.onsubmit=e=>{ e.preventDefault(); snapshot('settings.permissions.update'); db.rolePermissions[f.dataset.role]=String(f.elements.permissions.value||'').split(',').map(x=>x.trim()).filter(Boolean); persist(); render(); toast('Permisos guardados'); });
  bindForm('#paymentSettingsForm','settings.payments.update',(d,f)=>{ const reader_by_site={}; $$('.siteReaderSelect',f).forEach(sel=>{ if(sel.value) reader_by_site[String(sel.dataset.siteId)]=sel.value; }); db.settings.payments={...db.settings.payments,currency:String(d.currency||'EUR').toUpperCase().slice(0,3),default_reader_id:d.default_reader_id||'',reader_by_site}; });
  const pairForm=$('#pairTerminalForm'); if(pairForm) pairForm.onsubmit=e=>{ e.preventDefault(); pairTerminalFromSettings(pairForm); };
  if($('#refreshPaymentReaders')) $('#refreshPaymentReaders').onclick=refreshPaymentSettings;
  if(state.settingsPanel==='payments') setTimeout(refreshPaymentSettings,0);
  bindForm('#appearanceSettingsForm','settings.appearance.update',(d)=>{ db.settings.appearance=d.appearance; db.settings.density=d.density; setTimeout(applyAppearance,0); });
  bindForm('#serverSettingsForm','settings.server.update',(d,f)=>{ db.settings.server={...db.settings.server,name:d.name.trim(),base_url:d.base_url.trim(),sqlite_path:d.sqlite_path.trim(),enabled:!!f.elements.enabled.checked}; });
  bindForm('#syncSettingsForm','settings.sync.update',(d,f)=>{ db.settings.sync={...db.settings.sync,enabled:!!f.elements.enabled.checked,mode:d.mode,auto_minutes:Math.max(5,Number(d.auto_minutes||15))}; });
  bindForm('#mcpSettingsForm','settings.mcp.update',(d,f)=>{ db.settings.mcp={...db.settings.mcp,enabled:!!f.elements.enabled.checked,path:d.path.trim()||'/api/mcp/interpret'}; });
  bindForm('#backupSettingsForm','settings.backup.update',(d)=>{ db.settings.backup={...db.settings.backup,retention:Math.max(1,Math.min(50,Number(d.retention||12)))}; });
  if($('#checkLocalServer')) $('#checkLocalServer').onclick=checkLocalServer;
  if($('#syncPullNow')) $('#syncPullNow').onclick=syncPullNow;
}

function bindAgendaV12Operations(){
  $$('[data-agenda-resize]').forEach(btn=>btn.onclick=e=>{
    e.stopPropagation();
    const appt=db.appointments.find(a=>Number(a.id)===Number(btn.dataset.agendaId));
    if(!appt) return toast('Cita no encontrada');
    const nextDuration=Math.max(10,Number(appt.duration_minutes||durationMinutes(appt.start_time,appt.end_time)||40)+Number(btn.dataset.agendaResize||0));
    try{ snapshot('agenda.resize',appt.patient_id); agendaResizeAppointment(db,appt.id,nextDuration,sessionUser?.role||'local'); persist(); render(); toast('Duracion actualizada'); }
    catch(err){ toast(err?.message||'No se pudo cambiar la duracion'); }
  });
  $$('[data-agenda-mode]').forEach(btn=>btn.onclick=()=>{
    const mode=btn.dataset.agendaMode;
    if(mode==='block'){
      const reason=prompt('Motivo del bloqueo')||'Bloqueo de agenda';
      const start=prompt('Hora de inicio', '13:00')||'13:00';
      const end=prompt('Hora de fin', '14:00')||'14:00';
      try{ snapshot('agenda.block'); agendaCreateBlock(db,{scope:'clinic',date:state.date,start_time:start,end_time:end,reason},sessionUser?.role||'local'); persist(); render(); toast('Bloqueo creado'); }
      catch(err){ toast(err?.message||'No se pudo crear el bloqueo'); }
      return;
    }
    if(mode==='waiting'){
      const matches=agendaWaitingListMatches(db,{date:state.date,start_time:'09:00',end_time:'20:00',employee_id:db.employees?.[0]?.id,site_id:db.sites?.[0]?.id});
      toast(matches.length?matches.length+' paciente(s) compatibles en lista de espera':'Lista de espera sin candidatos compatibles');
      return;
    }
    toast(mode==='move'?'Selecciona una cita y usa Reprogramar':'Usa +10 / -10 min dentro de cada cita');
  });
  $('#agendaAutoPlanClinical')?.addEventListener('click',()=>{
    const pid=state.patientId||activePatients()[0]?.id;
    if(!pid) return toast('Elige un paciente');
    try{ snapshot('agenda.plan_clinical',pid); const planned=agendaPlanClinicalSequence(db,{patient_id:pid,start_date:state.date,employee_id:db.employees?.[0]?.id,cabinet_id:db.cabinets?.[0]?.id,site_id:db.sites?.[0]?.id}); persist(); render(); toast(planned.length+' cita(s) planificadas'); }
    catch(err){ toast(err?.message||'No se pudo planificar el plan clinico'); }
  });
  $$('[data-agenda-action="cancel"]').forEach(btn=>btn.onclick=()=>{
    const appt=db.appointments.find(a=>Number(a.id)===Number(btn.dataset.agendaId));
    if(!appt) return toast('Cita no encontrada');
    const reason=prompt('Motivo de cancelacion')||'Cancelacion';
    try{ snapshot('agenda.cancel',appt.patient_id); agendaCancelAppointment(db,appt.id,reason,sessionUser?.role||'local'); const gap={date:appt.date,start_time:appt.start_time,end_time:appt.end_time,duration_minutes:appt.duration_minutes,employee_id:appt.employee_id,site_id:appt.site_id}; const matches=agendaWaitingListMatches(db,gap); const options=agendaRescheduleOptions(db,appt.id,{days:7,limit:3}); const cascade=agendaCascadeSuggestions(db,appt.id,{gap_days:1}); persist(); render(); toast(matches.length?'Cita cancelada. '+matches.length+' candidato(s) para cubrir el hueco':'Cita cancelada. '+options.length+' nuevo(s) horario(s) posibles; '+cascade.length+' ajuste(s) en cascada'); }
    catch(err){ toast(err?.message||'No se pudo cancelar la cita'); }
  });
}

function bindScreen(){
  bindSettingsAdmin();
  $$('[data-go]').forEach(el=>el.onclick=()=>setView(el.dataset.go,{settingsPanel:el.dataset.panel||state.settingsPanel}));
  $$('[data-open-task]').forEach(el=>el.onclick=openQuickTaskModal);
  $$('[data-task-done]').forEach(el=>el.onclick=()=>completeTask(Number(el.dataset.taskDone)));
  if($('#openPatientModal')) $('#openPatientModal').onclick=()=>openPatientModal();
  if($('#toggleTrash')) $('#toggleTrash').onclick=()=>{ state.trash=!state.trash; render(); };
  if($('#patientSearch')) $('#patientSearch').oninput=e=>filterPatients(e.target.value);
  bindPatientCards();
  $$('[data-patient-action]').forEach(b=>b.onclick=()=>handlePatientAction(b.dataset.patientAction));
  $$('[data-ptab]').forEach(b=>b.onclick=()=>{ state.patientTab=b.dataset.ptab; render(); });
  $$('[data-patient-portal-tab]').forEach(b=>b.onclick=()=>{ state.patientPortalTab=b.dataset.patientPortalTab; render(); });
  $$('[data-patient-alt-preference]').forEach(b=>b.onclick=()=>{ const [groupId,optionId]=String(b.dataset.patientAltPreference).split(':').map(Number); const p=portalPatient(); snapshot('patient_portal.alternative.preference',p.id); setPatientAlternativePreference(db,{group_id:groupId,option_id:optionId,patient_id:p.id}); recordAudit('patient_portal.alternative.preference',p.id,`grupo ${groupId} opcion ${optionId}`); persist(); render(); toast('Preferencia guardada para comentarla con la clínica'); });
  $$('[data-portal-payment-months]').forEach(b=>b.onclick=()=>patientPortalPaymentMonths(Number(b.dataset.portalPaymentMonths)));
  $$('[data-portal-prep]').forEach(b=>b.onchange=()=>patientPortalTogglePreparation(b.dataset.portalPrep));
  if($('#patientPortalConfirmAppointment')) $('#patientPortalConfirmAppointment').onclick=()=>patientPortalConfirmAppointment();
  if($('#patientPortalReschedule')) $('#patientPortalReschedule').onclick=()=>openPatientRescheduleModal();
  if($('#patientPortalCheckIn')) $('#patientPortalCheckIn').onclick=()=>patientPortalCheckIn();
  if($('#patientPortalWaitingListToggle')) $('#patientPortalWaitingListToggle').onclick=()=>patientPortalWaitingListToggle();
  if($('#patientPortalSupport')) $('#patientPortalSupport').onclick=()=>openPatientSupportModal();
  if($('#patientPortalMedicalUpdate')) $('#patientPortalMedicalUpdate').onclick=()=>openPatientSupportModal('Cambio medico');
  if($('#patientPortalAttendanceCertificate')) $('#patientPortalAttendanceCertificate').onclick=()=>printPatientAttendanceCertificate();
  if($('#patientPortalExit')) $('#patientPortalExit').onclick=()=>showAccountChooser();
  if($('#patientNewAppointment')) $('#patientNewAppointment').onclick=()=>openAppointmentModal({patient_id:state.patientId});
  if($('#tabNewAppointment')) $('#tabNewAppointment').onclick=()=>openAppointmentModal({patient_id:state.patientId});
  if($('#patientNewPlan')) $('#patientNewPlan').onclick=()=>{ state.patientTab='planificacion'; render(); openTreatmentPlanModal(); };
  if($('#patientNewWork')) $('#patientNewWork').onclick=()=>quickCreateWork();
  if($('#newGlobalWork')) $('#newGlobalWork').onclick=()=>quickCreateWork();
  if($('#newGlobalPayment')) $('#newGlobalPayment').onclick=()=>openPaymentModal(null,state.patientId);
  if($('#newTreatmentPlan')) $('#newTreatmentPlan').onclick=()=>openTreatmentPlanModal();
  if($('#syncClinicalFromOdonto')) $('#syncClinicalFromOdonto').onclick=syncCurrentClinicalPlanFromOdonto;
  if($('#newClinicalItem')) $('#newClinicalItem').onclick=openClinicalItemModal;
  if($('#addMissingAlternative')) $('#addMissingAlternative').onclick=createMissingAlternativeForCurrentPatient;
  if($('#syncClinicalBudget')) $('#syncClinicalBudget').onclick=syncCurrentClinicalBudget;
  $$('[data-clinical-status]').forEach(b=>b.onclick=()=>{ const [itemId,status]=String(b.dataset.clinicalStatus).split(':'); snapshot('clinical_plan.item.status',state.patientId); setClinicalPlanItemStatus(db,Number(itemId),status); persist(); render(); toast(status==='completed'?'Tratamiento marcado como completado':'Tratamiento reabierto'); });
  $$('[data-alt-context]').forEach(box=>box.onchange=()=>{ const [groupId,key]=String(box.dataset.altContext).split(':'); snapshot('clinical_plan.alternative.context',state.patientId); updateClinicalAlternativeContext(db,{group_id:Number(groupId),key,value:box.checked}); persist(); render(); });
  $$('[data-approve-alt]').forEach(b=>b.onclick=()=>approveAlternative(b.dataset.approveAlt));
  $$('[data-schedule-step]').forEach(b=>b.onclick=()=>schedulePlanStep(b.dataset.scheduleStep));
  if($('#tabNewWork')) $('#tabNewWork').onclick=()=>quickCreateWork();
  if($('#patientNewBudget')) $('#patientNewBudget').onclick=()=>quickCreateBudget();
  if($('#newGlobalBudget')) $('#newGlobalBudget').onclick=()=>quickCreateBudget();
  if($('#tabNewBudget')) $('#tabNewBudget').onclick=()=>quickCreateBudget();
  if($('#patientPayment')) $('#patientPayment').onclick=()=>quickPayment();
  $$('[data-pay-budget]').forEach(b=>b.onclick=()=>openPaymentModal(Number(b.dataset.payBudget)));
  $$('[data-work-status]').forEach(b=>b.onclick=()=>updateWorkStatus(b.dataset.workStatus));
  if($('#archivePatientBtn')) $('#archivePatientBtn').onclick=()=>{ if(confirm('¿Archivar este paciente? Podrás recuperarlo desde Papelera.')){ snapshot(); archivePatient(db,state.patientId); persist(); setView('patients'); toast('Paciente archivado'); }};
  if($('#newConsentDoc')) $('#newConsentDoc').onclick=()=>openConsentModal();
  $$('[data-sign-doc]').forEach(b=>b.onclick=()=>openSignatureModal(Number(b.dataset.signDoc)));
  $$('[data-view-doc]').forEach(b=>b.onclick=()=>viewDoc(Number(b.dataset.viewDoc)));
  if($('#addAlert')) $('#addAlert').onclick=()=>{ const text=prompt('Alerta clinica'); if(text){ snapshot('clinical_alert.create',state.patientId); db.clinicalAlerts.push({id:id(db),patient_id:state.patientId,type:'Alerta clinica',severity:'alta',text,active:true,created_at:new Date().toISOString()}); persist(); render(); }};
  if($('#addComment')) $('#addComment').onclick=()=>{ const text=prompt('Comentario'); if(text){ snapshot(); db.comments.push({id:id(db),patient_id:state.patientId,category:'General',text,created_at:new Date().toISOString()}); persist(); render(); }};
  if($('#importPatientFiles')) $('#importPatientFiles').onclick=()=>importPatientFiles();
  if($('#odontogramPatient')) $('#odontogramPatient').onchange=e=>{ state.patientId=Number(e.target.value); render(); };
  bindOdonto();
  if($('#openAppointmentModal')) $('#openAppointmentModal').onclick=()=>openAppointmentModal();
  $$('[data-agenda-view]').forEach(b=>b.onclick=()=>{ state.agendaView=b.dataset.agendaView; state.agendaQuickId=null; render(); });
  if($('#agendaDate')) $('#agendaDate').onchange=e=>{ state.date=e.target.value; state.agendaQuickId=null; render(); };
  if($('#prevDay')) $('#prevDay').onclick=()=>{ state.date=shiftDate(state.date,-1); state.agendaQuickId=null; render(); };
  if($('#nextDay')) $('#nextDay').onclick=()=>{ state.date=shiftDate(state.date,1); state.agendaQuickId=null; render(); };
  if($('#agendaToday')) $('#agendaToday').onclick=()=>{ state.date=today(); state.agendaQuickId=null; render(); };
  $$('[data-new-appt-emp]').forEach(b=>b.onclick=()=>openAppointmentModal({employee_id:Number(b.dataset.newApptEmp),date:state.date}));
  $$('[data-slot-time]').forEach(b=>b.onclick=()=>openAppointmentModal({employee_id:Number(b.dataset.slotEmp),date:state.date,start_time:b.dataset.slotTime}));
  $$('[data-agenda-open]').forEach(b=>b.onclick=()=>{ const ap=db.appointments.find(a=>Number(a.id)===Number(b.dataset.agendaOpen)); if(ap){ state.agendaQuickId=Number(ap.id); if(state.view!=='agenda'){ state.view='agenda'; state.date=ap.date||state.date; } render(); } });
  $$('[data-agenda-close]').forEach(b=>b.onclick=()=>{ state.agendaQuickId=null; render(); });
  $$('[data-agenda-action]').forEach(b=>b.onclick=()=>{ const action=b.dataset.agendaAction, appointmentId=Number(b.dataset.agendaId); if(action==='reschedule') return openAgendaRescheduleModal(appointmentId); if(action==='patient'){ const ap=db.appointments.find(a=>Number(a.id)===appointmentId); if(ap){ state.agendaQuickId=null; state.patientId=Number(ap.patient_id); setView('patientDetail'); } return; } updateAgendaAppointmentState(appointmentId,action); });
  bindAgendaV12Operations();
  if($('#runCommandBtn')) $('#runCommandBtn').onclick=()=>runCommand($('#commandInput').value,'typed');
  if($('#commandInput')) $('#commandInput').onkeydown=e=>{ if(e.key==='Enter') runCommand($('#commandInput').value,'typed'); };
  $$('[data-command]').forEach(b=>b.onclick=()=>runCommand(b.dataset.command,'quick'));
  if($('#voiceBtn')) $('#voiceBtn').onclick=startSpeech;
  if($('#voiceAiMode')) $('#voiceAiMode').onchange=e=>{ ensureVoiceSettings().ai_mode=e.target.value; persist(); toast('Ruta de voz actualizada'); };
  if($('#voiceContinuous')) $('#voiceContinuous').onchange=e=>{ ensureVoiceSettings().continuous=!!e.target.checked; persist(); toast(e.target.checked?'Escucha continua activada':'Escucha continua desactivada'); };
  if($('#voiceReadback')) $('#voiceReadback').onchange=e=>{ ensureVoiceSettings().readback=!!e.target.checked; persist(); toast(e.target.checked?'Confirmación por voz activada':'Confirmación por voz desactivada'); };
  if($('#checkAiStatus')) $('#checkAiStatus').onclick=refreshAiStatus;
  if($('#previewImport')) $('#previewImport').onclick=previewImport;
  if($('#commitImport')) $('#commitImport').onclick=commitImport;
  if($('#templateForm')) $('#templateForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); snapshot(); db.templates.push({id:id(db),title:d.title,category:d.category||'General',text:d.text}); persist(); render(); toast('Plantilla guardada'); };
  if($('#employeeForm')) $('#employeeForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); snapshot(); db.employees.push({id:id(db),name:d.name,role:d.role,site:d.site||'Sin sede',phone:d.phone||'',active:true,color:['#409bd7','#ef941f','#e66c9e','#23a98b'][db.employees.length%4]}); persist(); render(); toast('Empleado creado'); };
  if($('#shiftForm')) $('#shiftForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); snapshot(); db.shifts.push({id:id(db),employee_id:Number(d.employee_id),weekday:Number(d.weekday),start_time:d.start_time,end_time:d.end_time}); persist(); render(); toast('Turno guardado'); };
  if($('#absenceForm')) $('#absenceForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); snapshot(); db.absences.push({id:id(db),employee_id:Number(d.employee_id),type:d.type,start_date:d.start_date,end_date:d.end_date||d.start_date,start_time:d.start_time||'',end_time:d.end_time||'',reason:d.reason||'',cancelled:false}); persist(); render(); toast('Ausencia guardada'); };
  if($('#backupBtn')) $('#backupBtn').onclick=()=>{ if(requirePin('exportar copia')) createBackup(); };
  if($('#autoBackupBtn')) $('#autoBackupBtn').onclick=createRecoveryNow;
  if($('#archivePatientBtn')) $('#archivePatientBtn').onclick=()=>{ if(requirePin('archivar paciente')&&confirmDanger('Archivar este paciente? Podras recuperarlo desde Papelera.','archive.patient')){ snapshot('archive.patient',state.patientId); archivePatient(db,state.patientId); persist(); setView('patients'); toast('Paciente archivado'); }};
  $$('[data-print-doc]').forEach(b=>b.onclick=()=>printClinicalDocument(b.dataset.printDoc));
  $$('[data-pdf-doc]').forEach(b=>b.onclick=()=>downloadClinicalPdf(b.dataset.pdfDoc));
}
function handlePatientAction(action){ if(action==='odontogram') return setView('odontogram',{patientId:state.patientId}); if(action==='documents') {state.patientTab='documentos'; return render();} if(action==='alerts'){state.patientTab='alertas';return render();} if(action==='files'){state.patientTab='archivos';return render();} }
function quickCreateWork(){ openWorkModal(); }
function quickCreateBudget(){ openBudgetModal(); }
function quickPayment(){ openPaymentModal(); }
function shiftDate(date,days){ const d=new Date(date+'T12:00:00'); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }

function applyToolToTooth(tooth, surface=''){
  const p=currentPatient(); if(!p)return toast('Primero elige un paciente');
  const code=state.odontoToolCode || '';
  if(!code){ state.selectedTooth=String(tooth); render(); return openToothStateSheet(tooth); }
  snapshot();
  try{ setToothLegendState(db,p.id,tooth,code,surface); syncClinicalPlanFromOdontogram(db,p.id); state.selectedTooth=String(tooth); state.selectedSurface=surface||null; persist(); render(); toast(`${STATUS_LABELS[code]||code} · ${tooth}${surface?' '+surface:''}`); }
  catch(err){ toast(err.message||'No se pudo marcar el odontograma'); }
}
function cycleLegend(base){
  state.odontoLegendState = state.odontoLegendState || {};
  const wasActive = state.odontoToolBase===base;
  if(ODONTO_LEGEND_CYCLES[base] && wasActive) state.odontoLegendState[base]=legendNextIndex(base, state.odontoLegendState[base]||0);
  if(!wasActive && state.odontoLegendState[base]==null) state.odontoLegendState[base]=0;
  const idx=Number(state.odontoLegendState[base]||0);
  state.odontoToolBase=base; state.odontoToolCode=legendVariant(base,idx);
  render(); toast(`${legendLabel(base,idx)} · ${legendStateText(base,idx)}`);
}
async function readFileAsDataUrl(file){
  return await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=()=>reject(reader.error||new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}
async function importPatientFiles(){
  const input=$('#patientFileInput');
  const files=Array.from(input?.files||[]);
  if(!files.length) return toast('Selecciona uno o varios archivos');
  const category=$('#patientFileCategory')?.value||'other';
  const notes=$('#patientFileNotes')?.value||'';
  snapshot('patient_file.import',state.patientId);
  try{
    for(const file of files){
      const dataUrl=await readFileAsDataUrl(file);
      db.files.push({
        id:id(db),
        patient_id:Number(state.patientId),
        title:file.name.replace(/\.[^.]+$/,''),
        original_name:file.name,
        type:fileKind(file),
        kind:fileKind(file),
        mime:file.type||'',
        size:file.size||0,
        category,
        notes,
        data_url:dataUrl,
        created_at:new Date().toISOString()
      });
    }
    recordAudit('patient_file.import',state.patientId,`${files.length} archivo(s)`);
    persist();
    render();
    toast(`${files.length} archivo(s) importado(s)`);
  }catch(err){
    toast(err?.message||'No se pudo importar el archivo');
  }
}
function bindOdonto(){
  $$('[data-odonto-mode]').forEach(b=>b.onclick=()=>{ state.odontoMode=b.dataset.odontoMode; render(); });
  $$('[data-select-tooth]').forEach(b=>b.onclick=()=>{ state.selectedTooth=String(b.dataset.selectTooth); render(); });
  $$('[data-legend-base]').forEach(btn=>btn.onclick=e=>{ e.preventDefault(); cycleLegend(btn.dataset.legendBase); });
  $$('[data-tooth]').forEach(btn=>{
    btn.onpointerdown=()=>{ const tooth=btn.dataset.tooth; longPressTimer=setTimeout(()=>openToothStateSheet(tooth),650); };
    btn.onpointerup=()=>clearTimeout(longPressTimer); btn.onpointerleave=()=>clearTimeout(longPressTimer); btn.onpointercancel=()=>clearTimeout(longPressTimer);
    btn.onclick=()=>{ clearTimeout(longPressTimer); applyToolToTooth(btn.dataset.tooth); };
    btn.oncontextmenu=e=>{ e.preventDefault(); openToothStateSheet(btn.dataset.tooth); };
  });
  $$('[data-surface-tooth]').forEach(seg=>seg.onclick=e=>{ e.preventDefault(); e.stopPropagation(); const tooth=seg.dataset.surfaceTooth, surface=seg.dataset.surface; const code=state.odontoToolCode||''; if(!['caries','filling','filling_bad','filling_pending'].includes(code)) return applyToolToTooth(tooth); applyToolToTooth(tooth,surface); });
  $$('[data-mark-arcade]').forEach(b=>b.onclick=()=>markMissing(b.dataset.markArcade));
  if($('#markUpperMissing')) $('#markUpperMissing').onclick=()=>markMissing('superior');
  if($('#markLowerMissing')) $('#markLowerMissing').onclick=()=>markMissing('inferior');
  if($('#cycleSelectedTooth')) $('#cycleSelectedTooth').onclick=()=>cycleSelected();
  if($('#selectFdiRange')) $('#selectFdiRange').onclick=()=>{ const v=prompt('Rango FDI, ejemplo 42-32'); if(v) runCommand('Planifica una prótesis desde '+v.replace('-', ' hasta '),'range-ui'); };
  if($('#clearOdontoTool')) $('#clearOdontoTool').onclick=()=>{ state.odontoToolBase=null; state.odontoToolCode=null; render(); toast('Herramienta desactivada'); };
  if($('#clearSelectedSurface')) $('#clearSelectedSurface').onclick=()=>{ const p=currentPatient(); if(!p||!state.selectedTooth||!state.selectedSurface)return toast('Toca antes una superficie'); snapshot(); clearToothSurface(db,p.id,state.selectedTooth,state.selectedSurface); syncClinicalPlanFromOdontogram(db,p.id); persist(); render(); toast('Superficie limpiada'); };
  $$('[data-perio-depths]').forEach(inp=>inp.onchange=e=>updatePerioNumber(e.target.dataset.tooth,'depths',e.target.dataset.perioDepths,e.target.value));
  $$('[data-perio-recession]').forEach(inp=>inp.onchange=e=>updatePerioNumber(e.target.dataset.tooth,'recession',e.target.dataset.perioRecession,e.target.value));
  $$('[data-perio-flag]').forEach(inp=>inp.onchange=e=>updatePerioFlag(e.target.dataset.tooth,e.target.dataset.perioFlag,e.target.dataset.site,e.target.checked));
  $$('[data-perio-select]').forEach(sel=>sel.onchange=e=>updatePerioSelect(e.target.dataset.tooth,e.target.dataset.perioSelect,e.target.value));
  $$('[data-pos-flag]').forEach(btn=>btn.onclick=e=>togglePositionFlag(e.currentTarget.dataset.tooth,e.currentTarget.dataset.posFlag));
  $$('[data-pos-select]').forEach(sel=>sel.onchange=e=>updatePositionSelect(e.target.dataset.tooth,e.target.dataset.posSelect,e.target.value));
}
function updatePerioNumber(tooth, group, site, value){ const p=currentPatient(); if(!p) return; snapshot('periodontal.measure',p.id); const rec=ensureOdontogram(db,p.id)[String(tooth)]; rec.periodontal[group][site]=sanitizePerioNumber(value); state.selectedTooth=String(tooth); persist(); }
function updatePerioFlag(tooth, group, site, checked){ const p=currentPatient(); if(!p) return; snapshot(); const rec=ensureOdontogram(db,p.id)[String(tooth)]; rec.periodontal[group][site]=!!checked; state.selectedTooth=String(tooth); persist(); render(); }
function updatePerioSelect(tooth, key, value){ const p=currentPatient(); if(!p) return; snapshot(); const rec=ensureOdontogram(db,p.id)[String(tooth)]; rec.periodontal[key]=value; state.selectedTooth=String(tooth); persist(); render(); }
function togglePositionFlag(tooth, key){ const p=currentPatient(); if(!p) return; snapshot(); const rec=ensureOdontogram(db,p.id)[String(tooth)]; rec.position[key]=!rec.position[key]; state.selectedTooth=String(tooth); persist(); render(); }
function updatePositionSelect(tooth, key, value){ const p=currentPatient(); if(!p) return; snapshot(); const rec=ensureOdontogram(db,p.id)[String(tooth)]; rec.position[key]=value; state.selectedTooth=String(tooth); persist(); render(); }
function legacyMarkMissing(arcade){ const p=currentPatient(); if(!p)return toast('Primero elige un paciente'); const arr=arcade==='superior'?FDI_UPPER:FDI_LOWER; const od=ensureOdontogram(db,p.id); const hasData=arr.some(t=>od[t].status!=='healthy'||Object.keys(od[t].surfaces||{}).length); if(hasData&&!confirm(`La arcada ${arcade} tiene registros. ¿Marcarla completa como ausente?`)) return; snapshot(); markArcadeMissing(db,p.id,arcade); persist(); render(); toast(`Arcada ${arcade} marcada ausente`); }
function cycleSelected(){ const p=currentPatient(); if(!p||!state.selectedTooth) return toast('Selecciona un diente'); openToothStateSheet(state.selectedTooth); }
function openToothStateSheet(tooth){
  const p=currentPatient(); if(!p)return;
  const modal=$('#consentModal');
  const record=ensureOdontogram(db,p.id)[String(tooth)];
  const active=toothWholeStates(record);
  const groups=[['Presencia',['healthy','missing','extraction']],['Correcto',['crown','endo','post','implant','prosthesis','removable']],['Insatisfactorio / revisar',['crown_bad','endo_bad','post_bad','implant_review','prosthesis_bad','removable_bad']],['Pendiente / indicado',['crown_pending','endo_indicated','post_pending','implant_indicated','prosthesis_pending','removable_pending']]];
  const activeHtml=active.length?`<section class="active-tooth-states"><h3>Estados activos en este diente</h3><div class="toolbar">${active.map(code=>`<button type="button" class="danger mini" data-remove-tooth-state="${esc(code)}">${legendSymbol(code)} ${esc(STATUS_LABELS[code]||code)} · quitar</button>`).join('')}</div><p class="tiny">Puedes combinar tratamientos distintos, por ejemplo endodoncia + perno + corona. Al cambiar un estado de la misma familia solo se sustituye esa familia.</p></section>`:'<p class="tiny">Este diente no tiene tratamientos globales activos. Puedes añadir varios y se conservarán simultáneamente.</p>';
  modal.innerHTML=`<form method="dialog" class="modal-card"><div class="modal-title"><h2>Diente ${tooth}</h2><button class="icon-btn" type="button" data-dialog-close>×</button></div>${activeHtml}${groups.map(([title,codes])=>`<h3>${title}</h3><div class="form-grid">${codes.map(code=>`<button type="button" class="ghost state-choice tone-${statusTone(code)} ${active.includes(code)?'selected':''}" data-state-code="${code}">${legendSymbol(code)} ${esc(STATUS_LABELS[code]||code)}</button>`).join('')}</div>`).join('')}</form>`;
  modal.showModal();
  $$('[data-state-code]',modal).forEach(b=>b.onclick=e=>{ e.preventDefault(); snapshot(); setToothLegendState(db,p.id,tooth,b.dataset.stateCode); syncClinicalPlanFromOdontogram(db,p.id); persist(); modal.close(); state.selectedTooth=tooth; render(); });
  $$('[data-remove-tooth-state]',modal).forEach(b=>b.onclick=e=>{ e.preventDefault(); snapshot(); removeToothWholeState(db,p.id,tooth,b.dataset.removeToothState); syncClinicalPlanFromOdontogram(db,p.id); persist(); modal.close(); state.selectedTooth=tooth; render(); toast('Estado retirado del diente'); });
}

function openPatientModal(existing=null){ const modal=$('#patientModal'); modal.innerHTML=`<form id="patientForm" method="dialog" class="modal-card"><div class="modal-title"><h2>${existing?'Editar':'Nuevo'} paciente</h2><button class="icon-btn" type="button" data-dialog-close value="cancel">×</button></div><section class="ai-card"><h3>✦ Asistente IA proactivo</h3><p>Detecta lo que falta, pregunta y escucha automáticamente después de cada respuesta.</p><span>10 datos por completar</span><button type="button" id="patientConversation" class="primary">🎙️ Conversación automática</button></section><div class="form-grid"><label class="field">Nombre<input name="first_name" value="${esc(existing?.first_name||'')}" required></label><label class="field">Apellidos<input name="last_name" value="${esc(existing?.last_name||'')}"></label><label class="field">Teléfono<input name="phone" value="${esc(existing?.phone||'')}"></label><label class="field">Email<input name="email" type="email" value="${esc(existing?.email||'')}"></label><label class="field">Fecha nacimiento<input name="birth_date" type="date" value="${esc(existing?.birth_date||'')}"></label><label class="field">Nº historia / ID<input name="ficha" value="${esc(existing?.ficha||'')}"></label><label class="field">DNI / NIE<input name="dni" value="${esc(existing?.dni||'')}"></label></div><button class="primary" type="submit">Guardar paciente</button></form>`; modal.showModal(); $('#patientConversation').onclick=()=>{ modal.close(); setView('assistant'); startSpeech(); }; $('#patientForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); snapshot(); if(existing){ Object.assign(existing,{first_name:d.first_name,last_name:d.last_name,phone:d.phone,email:d.email,birth_date:d.birth_date,ficha:d.ficha,dni:d.dni}); persist(); modal.close(); render(); toast('Paciente actualizado'); } else { const p=createPatient(db,d); persist(); modal.close(); state.patientId=p.id; state.patientTab='resumen'; setView('patientDetail'); toast('Paciente guardado'); } }; }
function openAppointmentModal(pref={}){
  if(!activePatients().length){ toast('Primero crea un paciente'); return openPatientModal(); }
  const defaultDuration=Number(db.settings?.agenda?.default_duration||40);
  const startTime=pref.start_time||'10:00';
  const defaultSiteId=Number(pref.site_id||db.settings?.clinicProfile?.default_site_id||db.sites?.[0]?.id||0);
  const defaultSite=db.sites.find(x=>Number(x.id)===defaultSiteId);
  const modal=$('#appointmentModal');
  modal.innerHTML=`<form id="appointmentForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Nueva cita</h2><button class="icon-btn" type="button" data-dialog-close value="cancel">×</button></div><div class="form-grid"><label class="field">Paciente<select name="patient_id">${activePatients().map(p=>`<option value="${p.id}" ${Number(pref.patient_id||state.patientId)===Number(p.id)?'selected':''}>${esc(patientFullName(p))}</option>`).join('')}</select></label><label class="field">Doctor / empleado<select name="employee_id">${db.employees.filter(e=>e.active!==false).map(e=>`<option value="${e.id}" ${Number(pref.employee_id)===Number(e.id)?'selected':''}>${esc(e.name)}</option>`).join('')}</select></label><label class="field">Sede<select name="site_id">${db.sites.filter(s=>s.active!==false).map(x=>`<option value="${x.id}" ${Number(x.id)===defaultSiteId?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label class="field">Gabinete<select name="cabinet_id">${(db.cabinets||[]).filter(c=>c.active!==false).map(c=>`<option value="${c.id}" ${Number(pref.cabinet_id||1)===Number(c.id)?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label class="field">Fecha<input name="date" type="date" value="${pref.date||state.date}"></label><label class="field">Inicio<input name="start_time" type="time" value="${startTime}"></label><label class="field">Fin<input name="end_time" type="time" value="${pref.end_time||addMinutes(startTime,defaultDuration)}"></label><label class="field">Estado<select name="status"><option>programada</option><option>confirmada</option><option>espera</option><option>cancelada</option></select></label></div><label class="field">Motivo de visita<input name="title" value="${esc(pref.title||'Revisión')}"></label><label class="field">Detalle clínico de la cita<textarea name="detail" placeholder="Qué se va a hacer, dientes, material, fase del plan...">${esc(pref.detail||'')}</textarea></label><div id="availabilityBox" class="warn-banner">Calculando disponibilidad…</div><label><input name="confirmed" type="checkbox"> Confirmada por el paciente</label><button class="primary" type="submit">Crear cita</button></form>`;
  modal.showModal(); const form=$('#appointmentForm');
  const syncCabinets=()=>{ const sid=Number(form.elements.site_id.value); const current=String(form.elements.cabinet_id.value||''); [...form.elements.cabinet_id.options].forEach(o=>{ const c=db.cabinets.find(x=>Number(x.id)===Number(o.value)); o.hidden=!!c&&Number(c.site_id)!==sid; }); if(![...form.elements.cabinet_id.options].some(o=>o.value===current&&!o.hidden)){ const first=[...form.elements.cabinet_id.options].find(o=>!o.hidden); if(first) form.elements.cabinet_id.value=first.value; } };
  const refresh=()=>{ syncCabinets(); const d=formData(form); const av=appointmentAvailability(db,d); $('#availabilityBox').className=av.status==='ok'?'ok-banner':av.status==='conflict'?'danger-banner':'warn-banner'; $('#availabilityBox').textContent=av.message; return av; };
  ['employee_id','site_id','cabinet_id','date','start_time','end_time'].forEach(n=>form.elements[n].onchange=refresh); refresh();
  form.onsubmit=e=>{ e.preventDefault(); const d=formData(form); const av=refresh(); if(av.status!=='ok'&&!confirm(av.message+'\n\n¿Guardar igualmente?')) return; const site=db.sites.find(x=>Number(x.id)===Number(d.site_id)); snapshot('appointment.create',Number(d.patient_id)); db.appointments.push({id:id(db),patient_id:Number(d.patient_id),employee_id:Number(d.employee_id),cabinet_id:Number(d.cabinet_id||1),site_id:Number(d.site_id||0),chain_id:pref.chain_id||'',date:d.date,start_time:d.start_time,end_time:d.end_time,duration_minutes:durationMinutes(d.start_time,d.end_time),title:d.title,reason:d.title,detail:d.detail,status:d.status,site:site?.name||'',confirmed:!!d.confirmed,availability_status:av.status,availability_message:av.status==='ok'?'':av.message,created_at:new Date().toISOString()}); persist(); modal.close(); render(); toast(av.status==='ok'?'Cita guardada':'Cita guardada con aviso'); };
}
function legacyOpenConsentModal(){ const p=patient(state.patientId); if(!p)return; const modal=$('#consentModal'); modal.innerHTML=`<form id="consentForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Nuevo consentimiento</h2><button class="icon-btn" type="button" data-dialog-close value="cancel">×</button></div><label class="field">Plantilla<select name="consent_id">${db.consents.filter(c=>c.active!==false).map(c=>`<option value="${c.id}">${esc(c.title)} · v${esc(c.version||1)}</option>`).join('')}</select></label><div class="consent-help">Consentimientos definidos con diagnóstico, beneficios, riesgos, alternativas, cuidados y firma.</div><label class="field">Título<input name="title" value="Consentimiento informado"></label><button class="primary">Crear documento</button></form>`; modal.showModal(); $('#consentForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); snapshot(); const doc=createConsentDocument(db,{patient_id:p.id,consent_id:Number(d.consent_id),title:d.title}); persist(); modal.close(); state.patientTab='documentos'; render(); toast('Documento creado'); openSignatureModal(doc.id); }; }
function viewDoc(docId){ const d=db.documents.find(x=>Number(x.id)===Number(docId)); if(!d)return; const modal=$('#consentModal'); const body=d.type==='attendance_certificate'?`<pre class="attendance-document-text">${esc(d.text)}</pre>`:`<p>${esc(d.text)}</p>`; modal.innerHTML=`<form method="dialog" class="modal-card"><div class="modal-title"><h2>${esc(d.title)}</h2><button class="icon-btn" type="button" data-dialog-close>×</button></div>${body}<div class="${d.status==='firmado'||d.status==='emitido'?'ok-banner':'warn-banner'}">Estado: ${esc(d.status)} ${d.hash?'· hash '+esc(d.hash):''}</div>${d.signature_data?`<img class="doc-signature" src="${esc(d.signature_data)}" alt="Firma">`:''}</form>`; modal.showModal(); }
function prepareSignatureCanvas(canvas){
  if(!canvas || typeof canvas.getContext!=='function') return null;
  const ctx=canvas.getContext('2d'); if(!ctx) return null;
  const rect=canvas.getBoundingClientRect();
  const dpr=Math.max(1,Math.min(3,Number(window.devicePixelRatio)||1));
  const cssWidth=Math.max(1,Math.round(rect.width||620));
  const cssHeight=Math.max(1,Math.round(rect.height||240));
  canvas.width=Math.round(cssWidth*dpr);
  canvas.height=Math.round(cssHeight*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.lineWidth=4; ctx.lineCap='round'; ctx.strokeStyle='#153b4b';
  return {ctx, point:(event)=>{ const r=canvas.getBoundingClientRect(); const p=event.touches?event.touches[0]:event; return {x:p.clientX-r.left,y:p.clientY-r.top}; }};
}
function clearSignatureCanvas(canvas,ctx){
  if(!canvas||!ctx) return;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.restore();
}
function openSignatureModal(docId){
  const doc=db.documents.find(d=>Number(d.id)===Number(docId)); if(!doc)return;
  const modal=$('#signatureModal'); if(!modal) return;
  modal.innerHTML=`<form id="signatureForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Firmar documento</h2><button class="icon-btn" type="button" data-dialog-close value="cancel" aria-label="Cerrar firma">×</button></div><p>${esc(doc.title)}</p><div class="consent-scroll">${esc(doc.text)}</div><canvas id="signatureCanvas" class="signature-pad" aria-label="Área de firma"></canvas><label class="field">Nombre firmante<input name="signer_name" value="${esc(patientFullName(patient(doc.patient_id)))}"></label><label class="accept-line"><input name="accepted" type="checkbox" required> He leído y acepto este consentimiento informado</label><div class="toolbar"><button type="button" class="ghost" id="clearSignature">Limpiar</button><button class="primary">Guardar firma</button></div></form>`;
  modal.showModal();
  const canvas=$('#signatureCanvas'), prepared=prepareSignatureCanvas(canvas); if(!prepared){ modal.close(); toast('No se pudo inicializar la firma'); return; }
  const {ctx,point}=prepared; let drawing=false;
  const startDraw=e=>{drawing=true; const p=point(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); e.preventDefault();};
  const move=e=>{ if(!drawing)return; const p=point(e); ctx.lineTo(p.x,p.y); ctx.stroke(); e.preventDefault();};
  const endDraw=()=>{drawing=false;};
  canvas.addEventListener('pointerdown',startDraw); canvas.addEventListener('pointermove',move); canvas.addEventListener('pointerup',endDraw); canvas.addEventListener('pointerleave',endDraw);
  bindClick('#clearSignature',()=>clearSignatureCanvas(canvas,ctx));
  const form=$('#signatureForm'); if(!form) return;
  form.onsubmit=e=>{ e.preventDefault(); snapshot(); const fd=formData(e.target); signDocument(db,docId,{signature_data:canvas.toDataURL('image/png'),signer_name:fd.signer_name,accepted:!!fd.accepted,device_info:navigator.userAgent||'navegador'}); persist(); modal.close(); state.patientTab='documentos'; render(); toast('Documento firmado'); };
}
async function requestExternalVoiceInterpret(text, source='typed'){
  const voice=db.settings?.voice||{};
  const mode=voice.ai_mode||'auto';
  if(mode==='off'||mode==='rules') return null;
  const p=currentPatient();
  const payload={text:String(text||''),context:{patient_id:p?.id||null,patient_name:p?patientFullName(p):'',view:state.view,date:state.date||today(),source}};
  const aiPath=voice.ai_path||'/api/ai/interpret'; const mcpPath=db.settings?.mcp?.path||'/api/mcp/interpret';
  const endpoints=mode==='mcp'?[mcpPath]:mode==='llm'?[aiPath]:[aiPath,...(db.settings?.mcp?.enabled?[mcpPath]:[])];
  for(const endpoint of endpoints){
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),4500);
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      if(!response.ok) continue;
      const data=await response.json();
      const externalCommand=data.command||data;
      const checked=validateStructuredCommand(externalCommand);
      if(checked.ok) return {...checked.command,source:endpoint.includes('mcp')?'mcp':'llm'};
    }catch{} finally{ clearTimeout(timer); }
  }
  return null;
}
function voiceCommandMutates(intent){ return !['navigation.open','patient.select'].includes(intent); }
function updateVoiceResult(res){
  lastCommandResult=res||null;
  const box=$('#commandResult'); if(box) box.textContent=JSON.stringify(res,null,2);
}
function applyVoiceNavigation(res){
  if(res?.patient){ state.patientId=res.patient.id; }
  if(res?.navigation?.target){
    const target=res.navigation.target;
    if(target==='odontogram'&&!state.patientId) return toast('Selecciona antes un paciente');
    return setView(target,{patientId:state.patientId});
  }
  if(res?.intent==='patient.create'||res?.intent==='patient.select') return setView('patientDetail',{patientId:res.patient.id,patientTab:'resumen'});
  render();
}
async function runCommand(text, source){
  if(!String(text||'').trim()) return;
  const localCommand=parseVoiceCommand(text,{now:state.date||today()});
  let command=localCommand;
  if(command.intent==='unknown') command=await requestExternalVoiceInterpret(text,source) || command;
  if(command.intent!=='unknown'){
    const checked=validateStructuredCommand(command);
    if(!checked.ok){ const invalid={handled:false,message:'La orden interpretada no es válida.',error:checked.error}; updateVoiceResult(invalid); toast(invalid.message); return invalid; }
    command=checked.command;
    if(command.requires_confirmation && !confirm(`Denty ha entendido: ${command.intent}. ¿Ejecutar esta acción?`)) return {handled:false,cancelled:true,message:'Acción cancelada'};
    if(voiceCommandMutates(command.intent)) snapshot(`voice.${command.intent}`,state.patientId);
    const res=executeVoiceCommand(db,command,{source,patientId:state.patientId,now:state.date||today()});
    if(res.handled){
      if(res.terminal_required&&res.payment_request){
        updateVoiceResult({...res,command});
        toast(res.message||'Cobro preparado');
        openPaymentModal(res.payment_request.budget_id||null,res.patient?.id||state.patientId,res.payment_request);
        return res;
      }
      if(voiceCommandMutates(command.intent)) persist();
      updateVoiceResult({...res,command});
      toast(res.message||'Acción realizada');
      if(db.settings?.voice?.readback!==false && source==='voice') speak(res.message||'Acción realizada');
      applyVoiceNavigation(res);
      return res;
    }
    updateVoiceResult(res); toast(res.message||'No he podido ejecutar la orden'); return res;
  }
  snapshot('voice.legacy',state.patientId);
  const legacy=runAction(db,text,{source,patientId:state.patientId});
  if(legacy.type==='EXECUTED'||legacy.type==='OPEN') persist();
  updateVoiceResult(legacy);
  if(legacy.patient){ state.patientId=legacy.patient.id; state.patientTab='resumen'; setView('patientDetail'); }
  else if(legacy.type==='OPEN'&&legacy.target==='odontogram') setView('odontogram',{patientId:legacy.patient_id});
  toast(legacy.message); if(legacy.speak&&db.settings?.voice?.readback!==false) speak(legacy.message);
  return legacy;
}
function syncVoiceButtons(){
  const labels=[['#globalVoiceBtn','🎙️'],['#voiceBtn',voiceListening?'⏹ Detener':'🎙️ Hablar']];
  for(const [sel,label] of labels){ const b=$(sel); if(!b) continue; b.classList.toggle('listening',voiceListening); if(sel==='#voiceBtn') b.textContent=label; b.setAttribute('aria-pressed',voiceListening?'true':'false'); }
}
function startSpeech(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ toast('Voz web no disponible en este navegador'); return; }
  if(voiceListening){ recognition?.stop?.(); return; }
  recognition?.abort?.(); recognition=new SR(); recognition.lang='es-ES'; recognition.continuous=!!(db.settings?.voice?.continuous); recognition.interimResults=false;
  recognition.onstart=()=>{ voiceListening=true; syncVoiceButtons(); toast('Escuchando…'); };
  recognition.onresult=e=>{ for(let i=e.resultIndex||0;i<e.results.length;i++){ if(e.results[i].isFinal===false) continue; const text=e.results[i]?.[0]?.transcript||''; if($('#commandInput')) $('#commandInput').value=text; runCommand(text,'voice'); } };
  recognition.onerror=e=>{ voiceListening=false; syncVoiceButtons(); toast('Voz: '+(e.error||'error')); };
  recognition.onend=()=>{ voiceListening=false; syncVoiceButtons(); };
  recognition.start();
}
async function legacyPreviewImport(){ const file=$('#importFile')?.files?.[0]; if(!file) return toast('Elige un archivo'); if(file.name.toLowerCase().endsWith('.xlsx')){ $('#importResult').textContent='XLSX detectado. Esta preview estática no incluye lector XLSX pesado; exporta desde Clinic Cloud/Gesden a CSV para probar en Vercel. La versión servidor sí puede procesar XLSX grande.'; return; } const text=await file.text(); const parsed=csvRows(text); importRows=parsed.rows; importMapping=parsed.mapping; $('#commitImport').disabled=!importRows.length; $('#importResult').textContent=`${importRows.length} filas detectadas. Campos: ${Object.keys(importMapping).join(', ')}`; $('#importPreview').innerHTML=`<table><thead><tr>${parsed.headers.slice(0,8).map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${importRows.slice(0,12).map(r=>`<tr>${parsed.headers.slice(0,8).map(h=>`<td>${esc(r[h])}</td>`).join('')}</tr>`).join('')}</tbody></table>`; }
function legacyCommitImport(){ if(!importRows.length)return; snapshot(); let ok=0,skip=0; for(const row of importRows){ const data=patientFromRow(row,importMapping); if(!data.first_name){skip++; continue;} const dup=db.patients.some(p=>data.ficha&&p.ficha===data.ficha); if(dup){skip++; continue;} try{createPatient(db,data); ok++;}catch{skip++;} } persist(); importRows=[]; render(); toast(`Importados ${ok}; omitidos ${skip}`); }
function markMissing(arcade){
  const p=currentPatient();
  if(!p) return toast('Primero elige un paciente');
  const arr=arcade==='superior'?FDI_UPPER:FDI_LOWER;
  const od=ensureOdontogram(db,p.id);
  const hasData=arr.some(t=>od[t].status!=='healthy'||Object.keys(od[t].surfaces||{}).length);
  if(hasData&&!confirmDanger(`La arcada ${arcade} tiene registros. Marcarla completa como ausente?`,'mark.arcade.missing')) return;
  snapshot('mark.arcade.missing',p.id);
  markArcadeMissing(db,p.id,arcade);
  persist();
  render();
  toast(`Arcada ${arcade} marcada ausente`);
}
function createRecoveryNow(){
  snapshot('manual.recovery.snapshot', state.patientId);
  persist();
  render();
  toast('Snapshot de recuperacion creado');
}
function createBackup(){
  const payload={
    schema_version:'denty-web-preview-1.6-terminal',
    app_version:'1.6',
    exported_at:new Date().toISOString(),
    source:'local-preview',
    safety:{kind:'browser-local-backup', patients:db.patients.length, audit_events:(db.auditLog||[]).length},
    db
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`denty-web-preview-1.6-${today()}-secure-backup.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
  recordAudit('backup.export', state.patientId, 'exportacion segura json');
  persist();
  if($('#backupResult')) $('#backupResult').textContent=`Copia segura creada\nVersion: ${payload.schema_version}\nFecha: ${new Date(payload.exported_at).toLocaleString('es-ES')}\nPacientes incluidos: ${payload.safety.patients}\nEventos auditados: ${payload.safety.audit_events}`;
}
function patientRiskCounts(patientId){
  const alerts=db.clinicalAlerts.filter(a=>Number(a.patient_id)===Number(patientId)&&a.active!==false);
  const unsigned=db.documents.filter(d=>Number(d.patient_id)===Number(patientId)&&d.status!=='firmado');
  const due=db.appointments.filter(a=>Number(a.patient_id)===Number(patientId)&&a.date>=today()).length;
  return {alerts, unsigned, due};
}
function renderPatientRiskStrip(p){
  const r=patientRiskCounts(p.id);
  const tone=r.alerts.length?'danger':(r.unsigned.length?'warn':'ok');
  return `<div class="patient-risk-strip ${tone}"><div><b>${r.alerts.length?'Atencion clinica activa':'Seguridad clinica'}</b><span>${r.alerts.length?`${r.alerts.length} alerta(s) activa(s)`:r.unsigned.length?`${r.unsigned.length} documento(s) pendiente(s) de firma`:'Sin alertas activas ni consentimientos pendientes'}</span></div><div class="risk-pills"><span>${r.due} cita(s) futura(s)</span><span>${r.unsigned.length} consentimiento(s) pendiente(s)</span><span>${r.alerts.length} alerta(s)</span></div></div>`;
}
function portalPatient(){
  let p=currentPatient();
  if(!p){ p=createPatient(db,{first_name:'Paciente',last_name:'Demo',phone:'',email:'',ficha:'DEMO'}); persist(); }
  state.patientId=Number(p.id);
  ensurePatientPortalState(db,p.id);
  return p;
}
function portalPrettyDate(date){
  if(!date) return 'Pendiente';
  try{return new Date(String(date)+'T12:00:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short',year:'numeric'});}catch{return String(date);}
}
function portalTreatmentTimeline(s){
  return Array.isArray(s.steps)?s.steps:[];
}
function patientPortalPreparationItems(next){
  const text=normalizeText(`${next?.title||''} ${next?.reason||''} ${next?.detail||''}`);
  const items=[
    {id:'questions',label:'Anota las dudas que quieras resolver durante la visita.'},
    {id:'changes',label:'Comunica si ha cambiado tu medicacion, alergias o estado de salud.'}
  ];
  if(/implante|cirugia|extraccion|regeneracion|seno/.test(text)) items.unshift({id:'instructions',label:'Revisa las indicaciones preoperatorias entregadas por tu clinica.'});
  if(/ortodoncia|alineador|bracket/.test(text)) items.unshift({id:'appliance',label:'Trae tus alineadores o aparato si el equipo te lo ha indicado.'});
  if(/escaneo|medidas|protesis|corona/.test(text)) items.unshift({id:'records',label:'Comprueba que la cita sigue confirmada antes de desplazarte.'});
  return items;
}
function patientPortalContext(p){
  const s=patientTreatmentSnapshot(p);
  const portal=ensurePatientPortalState(db,p.id);
  const delayDays=patientPortalDelayDays(portal.appointment_changes);
  const projectedDate=patientPortalProjectedDate(s.estimatedDate,portal.appointment_changes)||s.estimatedDate;
  const alerts=(db.clinicalAlerts||[]).filter(a=>Number(a.patient_id)===Number(p.id)&&a.active!==false);
  const health=patientPortalHealth({hasNextAppointment:!!s.next,unsignedCount:s.unsigned.length,delayDays,clinicalAlertsCount:alerts.length});
  const waitingRoom=patientPortalWaitingRoom(db,p.id,today());
  const dentalFindings=patientPortalDentalFindings(db,p.id);
  const clinical=patientClinicalPlanProjection(db,p.id);
  const lastVisit=s.apps.filter(a=>a.date<today()&&normalizeText(a.status)!=='cancelada').sort((a,b)=>(b.date+b.start_time).localeCompare(a.date+a.start_time))[0]||null;
  const waitingListActive=!!(s.next&&portal.waiting_list.some(x=>Number(x.appointment_id)===Number(s.next.id)&&x.active!==false));
  const decisions=[];
  if(s.unsigned.length) decisions.push({label:`Revisar ${s.unsigned.length} documento(s) pendiente(s)`,tab:'documentos'});
  if(!s.next) decisions.push({label:'Reservar la siguiente cita para que el plan pueda continuar',tab:'citas'});
  else if(!s.next.confirmed) decisions.push({label:`Confirmar la cita del ${portalPrettyDate(s.next.date)}`,tab:'citas'});
  if(s.pending>0) decisions.push({label:`Revisar como quieres organizar ${s.pending.toFixed(2)} EUR pendientes`,tab:'pagos'});
  const pendingSupport=portal.support_requests.filter(r=>r.status!=='resuelto');
  if(pendingSupport.length) decisions.push({label:`Tienes ${pendingSupport.length} solicitud(es) enviadas a la clinica`,tab:'ayuda'});
  if(!decisions.length) decisions.push({label:'Seguir con la proxima fase segun la planificacion actual',tab:'tratamiento'});
  return {s,portal,delayDays,projectedDate,alerts,health,waitingRoom,dentalFindings,clinical,lastVisit,waitingListActive,decisions,pendingSupport};
}
function renderPatientPortalNav(){
  const tabs=[['inicio','Inicio'],['tratamiento','Tratamiento'],['citas','Citas'],['pagos','Pagos'],['documentos','Documentos'],['ayuda','Ayuda']];
  return `<nav class="patient-portal-nav" aria-label="Denty Paciente">${tabs.map(([id,label])=>`<button type="button" class="${state.patientPortalTab===id?'active':''}" data-patient-portal-tab="${id}">${iconLabel(id,label,{stacked:true})}</button>`).join('')}</nav>`;
}
function renderPatientPortalStatus(d){
  return `<section class="portal-health ${esc(d.health.tone)}" aria-label="Estado del tratamiento"><span class="portal-health-dot" aria-hidden="true"></span><div><small>Estado del tratamiento</small><strong>${esc(d.health.label)}</strong><p>${esc(d.health.message)}</p></div>${d.delayDays?`<b>+${d.delayDays} dias</b>`:'<b>Sin retrasos</b>'}</section>`;
}
function renderPatientPortalRoute(d,{compact=false}={}){
  const clinical=d.clinical?.items||[];
  const timeline=clinical.length?clinical:portalTreatmentTimeline(d.s);
  const currentIndex=clinical.length?Math.max(0,timeline.findIndex(x=>!treatmentDoneStatus(x.status))):d.s.currentIndex;
  const visible=compact?timeline.slice(0,Math.min(4,timeline.length)):timeline;
  const dates=d.s.estimatedDate?`<div class="portal-route-meta"><span><small>Prevision inicial</small><strong>${esc(portalPrettyDate(d.s.estimatedDate))}</strong></span><span><small>Prevision actual</small><strong>${esc(portalPrettyDate(d.projectedDate))}</strong></span><span><small>Retraso acumulado</small><strong>${d.delayDays?`+${d.delayDays} dias`:'0 dias'}</strong></span></div>`:'<div class="portal-muted-state">La clínica todavía no ha definido una fecha final fiable. Denty no inventa tiempos biológicos.</div>';
  const route=visible.length?`<div class="treatment-timeline portal-timeline clinical-patient-route">${visible.map((step,i)=>`<div class="timeline-phase ${treatmentStepStatus(step,i,currentIndex)}"><span>${i+1}</span><div><strong>${esc(step.patient_title||step.title||step.phase||'Fase')}</strong><small>${esc(step.phase_label||step.phase||'Tratamiento')} · ${esc(clinicalStatusLabel(step.status))}</small>${compact?'':`<p>${esc(step.patient_explanation||step.detail||'Esta fase forma parte de tu plan clínico.')}</p><div class="patient-why-order"><b>¿Por qué va ahora?</b> ${esc(step.why_order||step.reason||'La clínica ha definido este orden según las necesidades registradas en tu caso.')}</div>`}</div></div>`).join('')}</div>`:'<div class="portal-muted-state">Aún no existe una ruta clínica secuenciada para tu caso. Denty la mostrará cuando la clínica defina tratamientos reales.</div>';
  return `<article class="patient-portal-card portal-route-card"><div class="section-title"><div><h2>Ruta hasta terminar</h2><p>Es el mismo plan que usa tu clínica, explicado en lenguaje sencillo y con el motivo del orden.</p></div><button class="ghost mini" type="button" data-patient-portal-tab="tratamiento">${compact?'Ver ruta completa':'Ver plan clinico'}</button></div>${dates}${route}</article>`;
}
function renderPatientPortalAlternatives(d){
  const groups=d.clinical?.alternatives||[]; if(!groups.length) return '';
  return `<section class="patient-alternatives"><div class="section-title"><div><h2>Opciones que puedes valorar</h2><p>Puedes indicar cuál te interesa más. Tu preferencia no sustituye la validación clínica del profesional.</p></div></div>${groups.map(group=>{ const approved=group.options?.find(o=>Number(o.id)===Number(group.approved_option_id)); const preferred=group.options?.find(o=>Number(o.id)===Number(group.patient_preference?.option_id)); return `<article class="patient-portal-card patient-alt-group"><div class="section-title"><div><h3>${esc(group.title)}</h3><p>${esc(group.context||'')}</p></div>${approved?`<span class="portal-status-chip ok">Clínica: ${esc(approved.title)}</span>`:'<span class="portal-status-chip warn">En estudio</span>'}</div><div class="patient-alt-options">${(group.options||[]).map(option=>{ const isPreferred=Number(preferred?.id)===Number(option.id), isApproved=Number(approved?.id)===Number(option.id), missing=(option.required_context||[]).filter(key=>!group.context_checks?.[key]); return `<section class="patient-alt-option ${isApproved?'approved':''} ${isPreferred?'preferred':''}"><div class="section-title"><div><h4>${esc(option.title)}</h4><p>${esc(option.summary||'')}</p></div>${isPreferred?'<span class="portal-status-chip ok">Tu preferencia</span>':''}</div><div class="alt-procon"><div><strong>Ventajas</strong><ul>${(option.pros||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><strong>Inconvenientes</strong><ul>${(option.cons||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div><div class="patient-alt-facts"><span><b>Tiempo</b>${esc(option.time_relative||'A confirmar')}</span><span><b>Coste</b>${esc(option.cost_relative||'A confirmar')}</span><span><b>Mantenimiento</b>${esc(option.maintenance||'A confirmar')}</span><span><b>Invasividad</b>${esc(option.invasiveness||'A confirmar')}</span></div><details><summary>Recorrido si se elige esta opción</summary><ol>${(option.plan||[]).map(step=>`<li>${esc(step.title||step.treatment)}</li>`).join('')}</ol><p>${esc(option.limitations||'')}</p></details>${missing.length?`<div class="portal-muted-state">La clínica aún debe revisar ${missing.length} dato(s) antes de poder validar esta opción.</div>`:''}${isApproved?'<div class="ok-banner">Esta opción ha sido validada por la clínica para este caso.</div>':`<button class="${isPreferred?'ghost':'primary'} mini" type="button" data-patient-alt-preference="${group.id}:${option.id}">${isPreferred?'Preferencia guardada':'Me interesa esta opción'}</button>`}</section>`; }).join('')}</div></article>`; }).join('')}</section>`;
}
function renderPatientPortalDecisions(d){
  return `<article class="patient-portal-card"><div class="section-title"><div><h2>Decisiones pendientes</h2><p>Solo mostramos lo que puedes resolver ahora.</p></div><span class="portal-count">${d.decisions.length}</span></div><div class="portal-decision-list">${d.decisions.map(item=>`<button type="button" data-patient-portal-tab="${esc(item.tab)}"><span>${esc(item.label)}</span><b aria-hidden="true">›</b></button>`).join('')}</div></article>`;
}
function renderPatientPortalWaitingRoom(p,d){
  const todayAppt=(db.appointments||[]).filter(a=>Number(a.patient_id)===Number(p.id)&&a.date===today()&&normalizeText(a.status)!=='cancelada').sort((a,b)=>String(a.start_time).localeCompare(String(b.start_time)))[0]||null;
  if(!todayAppt) return `<article class="patient-portal-card waiting-room-card"><div class="section-title"><div><h2>Sala de espera</h2><p>El check-in y la estimacion aparecen el dia de tu cita.</p></div><span class="portal-room-icon" aria-hidden="true">◷</span></div><div class="portal-muted-state">Hoy no tienes una cita activa.</div></article>`;
  if(!d.waitingRoom.checked_in) return `<article class="patient-portal-card waiting-room-card"><div class="section-title"><div><h2>Sala de espera</h2><p>${esc(portalPrettyDate(todayAppt.date))} · ${esc(todayAppt.start_time||'')}</p></div><span class="portal-room-icon" aria-hidden="true">◷</span></div><p>Cuando llegues, registra tu llegada para que recepcion y el gabinete sepan que estas aqui.</p><button class="primary" type="button" id="patientPortalCheckIn">He llegado</button></article>`;
  return `<article class="patient-portal-card waiting-room-card checked-in"><div class="section-title"><div><h2>Sala de espera</h2><p>Check-in registrado</p></div><span class="portal-room-icon" aria-hidden="true">✓</span></div><strong class="waiting-room-position">${esc(d.waitingRoom.label)}</strong><p>${d.waitingRoom.ahead?`Espera estimada: ${d.waitingRoom.eta_min}-${d.waitingRoom.eta_max} minutos.`:'El equipo te llamara cuando el gabinete este preparado.'}</p><small>La estimacion usa el estado actual de la agenda y puede cambiar si una atencion necesita mas tiempo.</small></article>`;
}
function renderPatientPortalPreparation(d){
  if(!d.s.next) return `<article class="patient-portal-card"><h2>Preparar mi cita</h2><div class="portal-muted-state">Primero necesitamos programar tu siguiente visita.</div></article>`;
  const items=patientPortalPreparationItems(d.s.next);
  const completed=new Set(d.portal.preparation[String(d.s.next.id)]||[]);
  return `<article class="patient-portal-card"><div class="section-title"><div><h2>Preparar mi cita</h2><p>${esc(portalPrettyDate(d.s.next.date))} · ${esc(d.s.next.start_time||'')} · ${esc(d.s.next.reason||d.s.next.title||'Revision')}</p></div><span class="portal-count">${completed.size}/${items.length}</span></div><div class="portal-checklist">${items.map(item=>`<label><input type="checkbox" data-portal-prep="${esc(item.id)}" ${completed.has(item.id)?'checked':''}><span>${esc(item.label)}</span></label>`).join('')}</div></article>`;
}
function renderPatientPortalMoney(d){
  const plan=patientPortalPaymentPlan(d.s.pending,d.portal.payment_months||6);
  const choices=[1,3,6,12];
  return `<article class="patient-portal-card portal-money-card"><div class="section-title"><div><h2>Mi economia del tratamiento</h2><p>Deuda real y tratamiento futuro se muestran por separado.</p></div><button class="ghost mini" type="button" data-patient-portal-tab="pagos">Ver detalle</button></div><div class="treatment-money-grid"><div><small>Tratamiento total</small><strong>${d.s.total.toFixed(2)} EUR</strong></div><div><small>Ya realizado</small><strong>${d.s.treatmentRealized.toFixed(2)} EUR</strong></div><div><small>Ya pagado</small><strong>${d.s.paid.toFixed(2)} EUR</strong></div><div><small>Pendiente de pago</small><strong>${d.s.pending.toFixed(2)} EUR</strong></div><div><small>Tratamiento futuro</small><strong>${d.s.future.toFixed(2)} EUR</strong></div><div><small>Simulacion actual</small><strong>${plan.monthly.toFixed(2)} EUR/mes</strong></div></div><div class="payment-simulator"><b>Como prefieres visualizarlo</b>${choices.map(months=>`<button type="button" class="${plan.months===months?'active':''}" data-portal-payment-months="${months}">${months===1?'Pago completo':months+' meses'}</button>`).join('')}<p>${plan.total?`Simulacion: ${plan.monthly.toFixed(2)} EUR durante ${plan.months} mes(es)${plan.months>1?`, ultimo pago ${plan.last_payment.toFixed(2)} EUR`:''}.`: 'No tienes saldo pendiente registrado.'} Esto no activa cargos recurrentes ni constituye financiacion.</p></div></article>`;
}
function renderPatientPortalMedia(d){
  const safeUrl=value=>/^https?:\/\//i.test(String(value||''))?String(value):'';
  const smile=safeUrl(d.portal.smilecloud_url), arch=safeUrl(d.portal.archform_url);
  const links=d.portal.education_links.filter(x=>safeUrl(x?.url));
  return `<article class="patient-portal-card"><div class="section-title"><div><h2>Mi sonrisa y planificacion</h2><p>Fotos, simulaciones y recursos que tu clinica haya vinculado a tu caso.</p></div></div><div class="portal-media-actions">${smile?`<a class="ghost" href="${esc(smile)}" target="_blank" rel="noopener">Abrir Smilecloud</a>`:'<span class="portal-integration-off">Smilecloud · no enlazado</span>'}${arch?`<a class="ghost" href="${esc(arch)}" target="_blank" rel="noopener">Abrir ArchForm</a>`:'<span class="portal-integration-off">ArchForm · no enlazado</span>'}</div><h3>Videos aprobados por tu clinica</h3>${links.length?`<div class="portal-education-links">${links.map(link=>`<a href="${esc(link.url)}" target="_blank" rel="noopener"><strong>${esc(link.title||'Ver video')}</strong><span>Recurso externo revisado por la clinica ↗</span></a>`).join('')}</div>`:'<div class="portal-muted-state">Tu clinica todavia no ha asociado videos educativos a este tratamiento.</div>'}</article>`;
}
function renderPatientPortalDentalFindings(d,{compact=false}={}){
  const findings=(d.dentalFindings||[]).slice(0,compact?4:20);
  return `<article class="patient-portal-card portal-dental-card"><div class="section-title"><div><h2>Mi boca ahora</h2><p>Esta vista se actualiza desde el mismo odontograma que utiliza tu clínica.</p></div>${d.dentalFindings?.length?`<span class="portal-count">${d.dentalFindings.length}</span>`:''}</div>${findings.length?`<div class="portal-dental-findings">${findings.map(item=>`<div class="portal-dental-finding ${esc(item.tone)}"><span class="portal-tooth-number">${esc(item.tooth)}</span><div><strong>${esc(item.title)}</strong><small>${item.surfaces?.length?`Superficie ${esc(item.surfaces.join(', '))} · `:''}${esc(item.message)}</small></div></div>`).join('')}</div>${compact&&d.dentalFindings.length>findings.length?`<button class="ghost mini" type="button" data-patient-portal-tab="tratamiento">Ver todos los hallazgos</button>`:''}`:'<div class="portal-muted-state">No hay hallazgos odontológicos activos marcados para mostrarte ahora mismo.</div>'}<small class="portal-clinical-note">La explicación es orientativa. El diagnóstico y las alternativas las confirma tu profesional.</small></article>`;
}
function renderPatientPortalHome(p,d){
  const next=d.s.next;
  return `${renderPatientPortalStatus(d)}${renderPatientPortalDentalFindings(d,{compact:true})}<article class="patient-portal-hero"><div class="section-title"><div><h2>Tu tratamiento ahora</h2><p>${esc(d.s.current?.title||d.s.phase||'Plan clinico activo')}</p></div><strong>${d.s.progress}%</strong></div><div class="treatment-progress-bar" aria-label="Progreso del tratamiento"><span style="width:${d.s.progress}%"></span></div><div class="treatment-now-grid"><div><small>Fase actual</small><strong>${esc(d.s.current?.phase||d.s.phase||'Plan activo')}</strong><span>${esc(d.s.current?.detail||'Seguimiento clinico en curso.')}</span></div><div><small>Finalizacion estimada</small><strong>${esc(portalPrettyDate(d.projectedDate))}</strong><span>${d.delayDays?`La previsión incluye ${d.delayDays} dia(s) añadidos por cambios de cita.`:'Sigues la planificacion temporal disponible.'}</span></div><div><small>Proxima cita</small><strong>${next?`${esc(portalPrettyDate(next.date))} · ${esc(next.start_time||'')}`:'Sin cita programada'}</strong><span>${next?esc(next.reason||next.title||'Revision'):'El plan necesita una nueva cita.'}</span><button class="primary mini" type="button" data-patient-portal-tab="citas">${next?'Gestionar cita':'Ver agenda'}</button></div></div><div class="treatment-impact"><strong>Impacto temporal</strong><p>Cuando cambias una cita, Denty separa el posible retraso clinico de cualquier politica economica de cancelacion. No aplicamos cargos automaticamente.</p></div></article><div class="patient-portal-grid">${renderPatientPortalDecisions(d)}${renderPatientPortalWaitingRoom(p,d)}</div>${renderPatientPortalRoute(d,{compact:true})}<div class="patient-portal-grid">${renderPatientPortalPreparation(d)}${d.lastVisit?`<article class="patient-portal-card"><h2>Resumen de la ultima visita</h2><p><strong>${esc(portalPrettyDate(d.lastVisit.date))}</strong> · ${esc(d.lastVisit.title||d.lastVisit.reason||'Visita dental')}</p><p>${esc(d.lastVisit.detail||'La clinica no ha añadido un resumen detallado a esta cita.')}</p><button class="ghost mini" type="button" data-patient-portal-tab="tratamiento">Ver siguiente fase</button></article>`:`<article class="patient-portal-card"><h2>Resumen de la ultima visita</h2><div class="portal-muted-state">Aun no hay una visita anterior registrada en este tratamiento.</div></article>`}</div>${renderPatientPortalMoney(d)}`;
}
function renderPatientTreatmentDisclosure({title,subtitle='',body='',open=false,badge=''}){
  return `<details class="patient-treatment-disclosure" ${open?'open':''}><summary><span><strong>${esc(title)}</strong>${subtitle?`<small>${esc(subtitle)}</small>`:''}</span>${badge?`<b>${esc(badge)}</b>`:''}<i aria-hidden="true">⌄</i></summary><div class="patient-treatment-disclosure-body">${body}</div></details>`;
}
function renderPatientPortalTreatment(p,d){
  const current=d.clinical?.items?.find(x=>!treatmentDoneStatus(x.status))||d.s.current;
  const routeCount=d.clinical?.items?.length||portalTreatmentTimeline(d.s).length||0;
  const alternativeCount=d.clinical?.alternatives?.length||0;
  const dentalCount=d.dentalFindings?.length||0;
  const routeBody=renderPatientPortalRoute(d).replace(/^<article class="patient-portal-card portal-route-card">|<\/article>$/g,'');
  const alternativesBody=renderPatientPortalAlternatives(d) || '<div class="portal-muted-state">No hay alternativas abiertas para comparar en este momento.</div>';
  const orderBody=`<article class="patient-portal-card"><p>${esc(current?.why_order||current?.patient_explanation||current?.detail||'El plan intenta resolver primero lo que condiciona las fases siguientes.')}</p><ul><li>Las dependencias vienen del mismo plan que usa la clínica.</li><li>Las alternativas muestran ventajas e inconvenientes antes de expresar una preferencia.</li><li>Una preferencia del paciente nunca se convierte automáticamente en indicación clínica.</li></ul></article>`;
  const delayBody=`<article class="patient-portal-card"><p>La fase actual es <strong>${esc(current?.patient_title||current?.title||d.s.phase||'tu tratamiento activo')}</strong>. Aplazar revisiones puede desplazar fases que dependen de esta y alargar la ruta global.</p><div class="treatment-impact"><strong>${d.delayDays?`Retraso acumulado: +${d.delayDays} dias`:'Ahora mismo no hay retraso acumulado'}</strong><p>La evolución clínica exacta depende de tu caso y la confirma siempre tu profesional.</p></div></article>`;
  const patientRoleBody=`<article class="patient-portal-card"><div class="patient-tasks"><span>Acudir o reprogramar con la mayor antelacion posible.</span><span>Seguir las instrucciones individualizadas entregadas por tu profesional.</span><span>Comunicar cambios de salud, medicacion o alergias para que el equipo los revise.</span></div><h3>Responsabilidad de la clínica</h3><p>Validar las opciones, explicar alternativas, actualizar el progreso y avisarte si una fase necesita cambiar.</p></article>`;
  return `${renderPatientPortalStatus(d)}<div class="patient-treatment-accordion">${renderPatientTreatmentDisclosure({title:'Mi boca ahora',subtitle:'Hallazgos que la clínica ha marcado en tu odontograma',body:renderPatientPortalDentalFindings(d),badge:dentalCount?`${dentalCount}`:''})}${renderPatientTreatmentDisclosure({title:'Ruta hasta terminar',subtitle:'Orden del tratamiento y por qué una fase depende de otra',body:routeBody,badge:routeCount?`${routeCount} pasos`:''})}${renderPatientTreatmentDisclosure({title:'Opciones de tratamiento',subtitle:'Compara ventajas, inconvenientes y recorridos posibles',body:alternativesBody,badge:alternativeCount?`${alternativeCount}`:''})}${renderPatientTreatmentDisclosure({title:'Por qué este orden',subtitle:'Por que me recomiendan esto y qué condiciona la secuencia clínica',body:orderBody})}${renderPatientTreatmentDisclosure({title:'Qué pasa si lo retraso',subtitle:'Impacto posible de mover fases o revisiones',body:delayBody,badge:d.delayDays?`+${d.delayDays} días`:''})}${renderPatientTreatmentDisclosure({title:'Qué tengo que hacer yo',subtitle:'Tus próximos pasos y los de la clínica',body:patientRoleBody})}${renderPatientTreatmentDisclosure({title:'Mi sonrisa y planificación',subtitle:'Simulaciones, recursos y material compartido',body:renderPatientPortalMedia(d)})}</div>`;
}
function renderPatientPortalAppointments(p,d){
  const next=d.s.next;
  const changes=d.portal.appointment_changes.slice().sort((a,b)=>String(b.changed_at||'').localeCompare(String(a.changed_at||'')));
  const lateNotice=next?(()=>{ const when=new Date(`${next.date}T${next.start_time||'12:00'}:00`).getTime(); const hours=(when-Date.now())/3600000; return Number.isFinite(hours)&&hours>=0&&hours<24; })():false;
  return `<div class="patient-portal-grid"><article class="patient-portal-card portal-next-appointment"><div class="section-title"><div><h2>Proxima cita</h2><p>${next?`${esc(portalPrettyDate(next.date))} · ${esc(next.start_time||'')}`:'No hay una cita futura programada'}</p></div>${next?`<span class="portal-status-chip ${next.confirmed?'ok':'warn'}">${next.confirmed?'Confirmada':'Por confirmar'}</span>`:''}</div>${next?`<h3>${esc(next.reason||next.title||'Revision')}</h3><p>${esc(next.detail||'La clinica no ha añadido instrucciones especificas para esta cita.')}</p><div class="toolbar">${next.confirmed?'':`<button class="primary" type="button" id="patientPortalConfirmAppointment">Confirmar cita</button>`}<button class="ghost" type="button" id="patientPortalReschedule">Necesito cambiarla</button></div>${lateNotice?'<div class="portal-policy-warning"><strong>Cambio con menos de 24 horas</strong><p>La politica economica de cancelaciones de la clinica, si existe y fue aceptada, se revisa aparte del impacto temporal del tratamiento. Denty no aplica cargos automaticamente.</p></div>':''}`:'<p>Puedes contactar con la clinica desde Ayuda para coordinar la siguiente fase.</p>'}</article><article class="patient-portal-card"><h2>Lista de espera</h2><p>Si se libera un hueco compatible antes de tu cita, la clinica podra ofrecertelo.</p>${next?`<button class="${d.waitingListActive?'danger':'ghost'}" type="button" id="patientPortalWaitingListToggle">${d.waitingListActive?'Salir de la lista de espera':'Avisarme si se libera antes'}</button>`:'<div class="portal-muted-state">Necesitas una cita futura para activar esta opcion.</div>'}<small>No cambia tu cita actual hasta que aceptes una alternativa.</small></article></div>${renderPatientPortalPreparation(d)}${renderPatientPortalWaitingRoom(p,d)}<article class="patient-portal-card"><div class="section-title"><div><h2>Historial de cambios</h2><p>Asi puedes ver cuanto tiempo han añadido las reprogramaciones.</p></div><strong>${d.delayDays?`+${d.delayDays} dias`:'0 dias'}</strong></div>${changes.length?`<div class="portal-history">${changes.map(change=>`<div><span><strong>${esc(portalPrettyDate(change.old_date))} → ${esc(portalPrettyDate(change.new_date))}</strong><small>${esc(change.reason||'Cambio solicitado')} · ${esc(change.changed_at?new Date(change.changed_at).toLocaleString('es-ES'):'')}</small></span><b>${Number(change.impact_days||0)>0?`+${Number(change.impact_days)} dias`:'Sin retraso'}</b></div>`).join('')}</div>`:'<div class="portal-muted-state">No has reprogramado citas desde que se activo este seguimiento.</div>'}</article>`;
}
function renderPatientPortalPayments(p,d){
  const rows=d.s.rows;
  return `${renderPatientPortalMoney(d)}<article class="patient-portal-card"><div class="section-title"><div><h2>Presupuestos en lenguaje claro</h2><p>Lo pagado, lo pendiente y el tratamiento aun no realizado no se mezclan.</p></div></div>${rows.length?`<div class="portal-budget-list">${rows.map(row=>`<div><span><strong>${esc(row.title||'Presupuesto')}</strong><small>${row.tooth?`Diente ${esc(row.tooth)} · `:''}${esc(row.source||'clinica')}</small></span><span class="money-stack"><b>${Number(row.total||0).toFixed(2)} EUR</b><small>Pagado ${Number(row.paid||0).toFixed(2)} · Pendiente ${Number(row.pending||0).toFixed(2)}</small></span></div>`).join('')}</div>`:'<div class="portal-muted-state">No hay presupuestos asociados a tu ficha.</div>'}<div class="portal-finance-note"><strong>Importante</strong><p>El simulador organiza visualmente el saldo. Una financiacion real debe mostrar proveedor, intereses, TAE, cuotas y consentimiento antes de contratarse.</p></div></article>`;
}
function renderPatientPortalDocuments(p,d){
  const docs=(db.documents||[]).filter(doc=>Number(doc.patient_id)===Number(p.id)).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const files=(db.files||[]).filter(file=>Number(file.patient_id)===Number(p.id));
  return `<article class="patient-portal-card"><div class="section-title"><div><h2>Documentos</h2><p>Consentimientos, justificantes y archivos que forman parte de tu tratamiento.</p></div><button class="ghost mini" type="button" id="patientPortalAttendanceCertificate">Justificante de asistencia</button></div>${docs.length?`<div class="portal-document-list">${docs.map(doc=>`<div><span><strong>${esc(doc.title||'Documento')}</strong><small>${esc(doc.status||'pendiente')} · ${esc(doc.created_at?new Date(doc.created_at).toLocaleDateString('es-ES'):'')}</small></span><div class="toolbar"><button class="ghost mini" type="button" data-view-doc="${doc.id}">Ver</button><button class="ghost mini" type="button" data-pdf-doc="doc:${doc.id}">PDF</button></div></div>`).join('')}</div>`:'<div class="portal-muted-state">No tienes documentos asociados todavia.</div>'}</article><article class="patient-portal-card"><h2>Archivos de mi caso</h2>${files.length?`<div class="portal-document-list">${files.map(file=>`<div><span><strong>${esc(file.original_name||file.title||'Archivo')}</strong><small>${esc(file.category||file.kind||'archivo')} · ${Number(file.size||0)?`${Math.max(1,Math.round(Number(file.size)/1024))} KB`:''}</small></span>${file.data_url?`<a class="ghost mini" href="${esc(file.data_url)}" download="${esc(file.original_name||file.title||'archivo')}">Descargar</a>`:''}</div>`).join('')}</div>`:'<div class="portal-muted-state">No hay archivos compartidos en esta preview.</div>'}</article>`;
}
function renderPatientPortalHelp(p,d){
  const requests=d.portal.support_requests.slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  return `<div class="patient-portal-grid"><article class="patient-portal-card"><h2>Necesito ayuda</h2><p>Envia la consulta con contexto para que llegue al equipo como una tarea pendiente.</p><div class="portal-help-actions"><button class="primary" type="button" id="patientPortalSupport">Enviar consulta</button><button class="ghost" type="button" id="patientPortalMedicalUpdate">Comunicar cambio medico</button></div><small>Un cambio medico queda pendiente de revision. Denty no modifica automaticamente diagnosticos, alergias ni medicacion.</small></article><article class="patient-portal-card"><h2>Mis solicitudes</h2>${requests.length?`<div class="portal-support-list">${requests.map(req=>`<div><span><strong>${esc(req.category)}</strong><small>${esc(req.created_at?new Date(req.created_at).toLocaleString('es-ES'):'')}</small><p>${esc(req.message)}</p></span><b class="portal-status-chip ${req.status==='resuelto'?'ok':'warn'}">${esc(req.status||'pendiente')}</b></div>`).join('')}</div>`:'<div class="portal-muted-state">No tienes solicitudes abiertas.</div>'}</article></div>${renderPatientPortalMedia(d)}<article class="patient-portal-card"><h2>Privacidad y acceso familiar</h2><p>La delegacion a padres, tutores o familiares requiere autenticacion y permisos de servidor. Esta preview no concede acceso a otras fichas para evitar simular una seguridad que aun no existe.</p></article>`;
}
function renderPatientPortal(){
  const p=portalPatient();
  const d=patientPortalContext(p);
  const tab=state.patientPortalTab||'inicio';
  let body=renderPatientPortalHome(p,d);
  if(tab==='tratamiento') body=renderPatientPortalTreatment(p,d);
  else if(tab==='citas') body=renderPatientPortalAppointments(p,d);
  else if(tab==='pagos') body=renderPatientPortalPayments(p,d);
  else if(tab==='documentos') body=renderPatientPortalDocuments(p,d);
  else if(tab==='ayuda') body=renderPatientPortalHelp(p,d);
  return `<section class="patient-portal"><header class="patient-portal-brandbar"><div><span class="patient-brand-mark" aria-hidden="true">${iconSvg('patient')}</span><span><strong>Denty Paciente</strong><small>Espacio personal de ${esc(patientFullName(p))}</small></span></div><button class="ghost" type="button" id="patientPortalExit">Cambiar cuenta</button></header><div class="patient-portal-top"><div><span>Mi espacio</span><h1>Hola, ${esc(p.first_name||'Paciente')}</h1><p>Tu tratamiento, citas, dinero y decisiones en un solo recorrido.</p></div></div>${renderPatientPortalNav()}<div class="patient-portal-body">${body}</div></section>`;
}
function patientPortalPaymentMonths(months){
  const p=portalPatient(), portal=ensurePatientPortalState(db,p.id);
  portal.payment_months=Math.max(1,Number(months||6));
  persist(); render();
}
function patientPortalConfirmAppointment(){
  const p=portalPatient(), d=patientPortalContext(p), next=d.s.next;
  if(!next) return toast('No hay una cita futura que confirmar');
  snapshot('patient_portal.appointment.confirm',p.id);
  next.confirmed=true; next.status='confirmada';
  recordAudit('patient_portal.appointment.confirm',p.id,`cita ${next.id}`);
  persist(); render(); toast('Cita confirmada');
}
function patientPortalTogglePreparation(key){
  const p=portalPatient(), d=patientPortalContext(p), next=d.s.next;
  if(!next) return toast('No hay una proxima cita');
  const portal=ensurePatientPortalState(db,p.id), idKey=String(next.id);
  const set=new Set(portal.preparation[idKey]||[]);
  set.has(key)?set.delete(key):set.add(key);
  portal.preparation[idKey]=[...set];
  persist(); render();
}
function patientPortalCheckIn(){
  const p=portalPatient();
  const appt=(db.appointments||[]).filter(a=>Number(a.patient_id)===Number(p.id)&&a.date===today()&&normalizeText(a.status)!=='cancelada').sort((a,b)=>String(a.start_time).localeCompare(String(b.start_time)))[0];
  if(!appt) return toast('El check-in solo esta disponible el dia de tu cita');
  const portal=ensurePatientPortalState(db,p.id);
  snapshot('patient_portal.checkin',p.id);
  const checkedInAt=new Date().toISOString();
  appt.status='espera'; appt.confirmed=true; appt.arrived_at=checkedInAt; appt.absent_at=''; appt.updated_at=checkedInAt;
  if(!portal.checkins.some(x=>Number(x.appointment_id)===Number(appt.id))) portal.checkins.unshift({appointment_id:appt.id,checked_in_at:checkedInAt});
  recordAudit('patient_portal.checkin',p.id,`cita ${appt.id}`);
  persist(); render(); toast('Llegada registrada');
}
function patientPortalWaitingListToggle(){
  const p=portalPatient(), d=patientPortalContext(p), next=d.s.next;
  if(!next) return toast('No hay una cita futura para la lista de espera');
  const portal=ensurePatientPortalState(db,p.id);
  let item=portal.waiting_list.find(x=>Number(x.appointment_id)===Number(next.id));
  if(!item){ item={appointment_id:next.id,active:true,created_at:new Date().toISOString()}; portal.waiting_list.unshift(item); }
  else item.active=item.active===false;
  recordAudit('patient_portal.waiting_list',p.id,`${next.id}:${item.active?'on':'off'}`);
  persist(); render(); toast(item.active?'Lista de espera activada':'Lista de espera desactivada');
}
function openPatientRescheduleModal(){
  const p=portalPatient(), d=patientPortalContext(p), next=d.s.next;
  if(!next) return toast('No hay una cita futura que reprogramar');
  const candidates=patientPortalRescheduleCandidates(db,next,{days:35,max:8,step:20});
  if(!candidates.length) return toast('No hay huecos compatibles disponibles en los proximos dias');
  const modal=$('#appointmentModal');
  modal.innerHTML=`<form id="patientRescheduleForm" method="dialog" class="modal-card portal-reschedule-modal"><div class="modal-title"><div><h2>Cambiar mi cita</h2><p>${esc(portalPrettyDate(next.date))} · ${esc(next.start_time||'')}</p></div><button class="icon-btn" type="button" data-dialog-close value="cancel" aria-label="Cerrar">×</button></div><label class="field">Motivo<select name="reason" required><option value="">Selecciona un motivo</option><option>Trabajo</option><option>Enfermedad</option><option>Viaje</option><option>Imprevisto familiar</option><option>Otro</option></select></label><div class="portal-reschedule-options">${candidates.map((slot,index)=>`<label><input type="radio" name="slot" value="${index}" ${index===0?'checked':''}><span><strong>${esc(portalPrettyDate(slot.date))} · ${esc(slot.start_time)}</strong><small>${slot.impact_days?`Impacto temporal estimado: +${slot.impact_days} dia(s)`:'Sin retraso estimado'}</small></span></label>`).join('')}</div><div class="portal-policy-warning"><strong>Antes de confirmar</strong><p>Este calculo muestra impacto temporal clinico. Si existe una politica economica de cancelacion tardia aceptada por ti, se revisa por separado y nunca se carga automaticamente desde esta pantalla.</p></div><label class="portal-ack"><input type="checkbox" name="ack" required> Entiendo que cambiar la cita puede mover la fecha final del tratamiento.</label><button class="primary" type="submit">Confirmar cambio</button></form>`;
  modal.showModal();
  $('#patientRescheduleForm').onsubmit=e=>{
    e.preventDefault(); const data=formData(e.target); const candidate=candidates[Number(data.slot||0)];
    if(!candidate) return toast('Selecciona un hueco');
    const portal=ensurePatientPortalState(db,p.id), old={date:next.date,start_time:next.start_time,end_time:next.end_time};
    snapshot('patient_portal.appointment.reschedule',p.id);
    portal.appointment_changes.unshift({id:id(db),appointment_id:next.id,old_date:old.date,old_start_time:old.start_time,new_date:candidate.date,new_start_time:candidate.start_time,impact_days:candidate.impact_days,reason:data.reason,changed_at:new Date().toISOString()});
    next.date=candidate.date; next.start_time=candidate.start_time; next.end_time=candidate.end_time; next.duration_minutes=durationMinutes(candidate.start_time,candidate.end_time); next.confirmed=false; next.status='programada'; next.availability_status='ok'; next.availability_message='';
    recordAudit('patient_portal.appointment.reschedule',p.id,`${old.date} ${old.start_time} -> ${candidate.date} ${candidate.start_time}`);
    persist(); modal.close(); state.patientPortalTab='citas'; render(); toast('Cita reprogramada');
  };
}
function openPatientSupportModal(defaultCategory=''){
  const p=portalPatient(), modal=$('#consentModal');
  const categories=['Dolor o molestia','Cita','Pago','Documento','Cambio medico','Otro'];
  modal.innerHTML=`<form id="patientSupportForm" method="dialog" class="modal-card"><div class="modal-title"><div><h2>Necesito ayuda</h2><p>Tu mensaje llegara a la lista de tareas de la clinica.</p></div><button class="icon-btn" type="button" data-dialog-close value="cancel" aria-label="Cerrar">×</button></div><label class="field">Tipo de consulta<select name="category" required>${categories.map(c=>`<option ${normalizeText(c)===normalizeText(defaultCategory)?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label class="field">Cuentalo con tus palabras<textarea name="message" required placeholder="Explica brevemente que necesitas"></textarea></label><div class="portal-policy-warning"><strong>Si es una urgencia</strong><p>No esperes una respuesta del portal para una emergencia. Contacta con la clinica o con los servicios sanitarios que correspondan.</p></div><button class="primary" type="submit">Enviar a la clinica</button></form>`;
  modal.showModal();
  $('#patientSupportForm').onsubmit=e=>{
    e.preventDefault(); const data=formData(e.target), portal=ensurePatientPortalState(db,p.id), requestId=id(db);
    snapshot('patient_portal.support',p.id);
    portal.support_requests.unshift({id:requestId,category:data.category,message:data.message,status:'pendiente',created_at:new Date().toISOString()});
    db.tasks=db.tasks||[];
    db.tasks.push({id:id(db),patient_id:p.id,title:`Paciente · ${data.category}: ${String(data.message).slice(0,80)}`,status:'pendiente',due_date:today(),created_at:new Date().toISOString(),source:'patient-portal'});
    recordAudit('patient_portal.support',p.id,data.category);
    persist(); modal.close(); state.patientPortalTab='ayuda'; render(); toast('Consulta enviada a la clinica');
  };
}
function printPatientAttendanceCertificate(){
  const p=portalPatient(), modal=$('#consentModal');
  const eligible=(db.appointments||[]).filter(a=>Number(a.patient_id)===Number(p.id)&&attendanceAppointmentIsEligible(a,today())).sort((a,b)=>`${b.date||''}${b.start_time||''}`.localeCompare(`${a.date||''}${a.start_time||''}`));
  if(!eligible.length) return toast('La clínica debe marcar una cita como realizada antes de emitir un justificante');
  modal.innerHTML=`<form id="patientAttendanceForm" method="dialog" class="modal-card attendance-certificate-config"><div class="modal-title"><div><h2>Justificante de asistencia</h2><p>Genera un documento de una visita que conste como realizada.</p></div><button class="icon-btn" type="button" data-dialog-close aria-label="Cerrar">×</button></div><label class="field">Visita<select name="appointment_id" required>${eligible.map(a=>`<option value="${a.id}">${esc(portalPrettyDate(a.date))} · ${esc(a.start_time||'')} · ${esc(a.title||a.reason||'Atención odontológica')}</option>`).join('')}</select></label><fieldset class="attendance-detail-choice"><legend>Detalle que aparecerá</legend><label><input type="radio" name="detail" value="generic" checked><span><strong>Asistencia odontológica</strong><small>Recomendado. Acredita la visita sin revelar el procedimiento concreto.</small></span></label><label><input type="radio" name="detail" value="procedure"><span><strong>Incluir procedimiento concreto</strong><small>Usará el motivo/tratamiento registrado en la cita.</small></span></label></fieldset><div class="portal-policy-warning"><strong>Privacidad</strong><p>El justificante acredita asistencia. Evita incluir diagnóstico u otros datos clínicos que no sean necesarios.</p></div><button class="primary" type="submit">Generar justificante</button></form>`;
  modal.showModal();
  $('#patientAttendanceForm').onsubmit=e=>{
    e.preventDefault();
    const data=formData(e.target), includeProcedure=data.detail==='procedure';
    snapshot('patient_portal.attendance_certificate',p.id);
    try{
      const doc=createAttendanceCertificateDocument(db,{patient_id:p.id,appointment_id:Number(data.appointment_id),include_procedure:includeProcedure,issued_date:today()});
      recordAudit('patient_portal.attendance_certificate',p.id,`cita ${data.appointment_id}${includeProcedure?' · procedimiento incluido':' · detalle mínimo'}`);
      persist(); modal.close(); state.patientPortalTab='documentos'; render(); printClinicalDocument(`doc:${doc.id}`);
    }catch(err){ toast(err?.message||'No se pudo generar el justificante'); }
  };
}

function renderPatientDetail(){
  const p=patient(state.patientId);
  if(!p) return `<button class="ghost" data-go="patients">Pacientes</button><div class="empty-state">Paciente no encontrado.</div>`;
  const apps=db.appointments.filter(a=>Number(a.patient_id)===Number(p.id));
  const docs=db.documents.filter(d=>Number(d.patient_id)===Number(p.id));
  const works=db.works.filter(w=>Number(w.patient_id)===Number(p.id));
  const pending=db.budgets.filter(b=>Number(b.patient_id)===Number(p.id)).reduce((s,b)=>s+Number(b.pending||b.total||0),0);
  const next=apps.filter(a=>a.date>=today()).sort((a,b)=>(a.date+a.start_time).localeCompare(b.date+b.start_time))[0];
  return `<section><button class="ghost" data-go="patients">Pacientes</button><article class="card patient-profile"><div class="patient-hero"><div class="avatar">${esc(initials(p))}</div><div><h1>${esc(patientFullName(p))}</h1><div class="patient-meta"><span>Tel. ${esc(p.phone||'-')}</span><span>${esc(p.email||'Sin email')}</span>${p.ficha?`<span>Ficha ${esc(p.ficha)}</span>`:''}</div></div></div>${renderPatientRiskStrip(p)}<div class="stats-grid"><div class="metric"><div class="k">Proxima cita</div><div class="v" style="font-size:22px">${next?esc(next.date+' '+next.start_time):'Sin cita'}</div></div><div class="metric"><div class="k">Trabajos activos</div><div class="v">${works.length}</div></div><div class="metric"><div class="k">Pendiente</div><div class="v money">${pending.toFixed(2)} EUR</div></div><div class="metric"><div class="k">Docs firmados</div><div class="v">${docs.filter(d=>d.status==='firmado').length}</div></div></div><div class="patient-primary-actions"><button class="primary" id="patientNewAppointment">Nueva cita</button><button class="ghost" id="patientNewPlan">Plan tratamiento</button><button class="ghost" id="patientNewWork">Nuevo trabajo</button><button class="ghost" id="patientNewBudget">Nuevo presupuesto</button><button class="ghost" id="patientPayment">Registrar pago</button></div><div class="action-grid">${patientDetailActions().filter(a=>!['appointment','work','budget','payment'].includes(a.id)).map(a=>`<button class="${a.id==='odontogram'?'primary':'ghost'}" data-patient-action="${a.id}" id="${a.id==='odontogram'?'patientOpenOdontogram':a.id==='documents'?'patientOpenDocuments':''}">${esc(a.label)}</button>`).join('')}<button class="danger" id="archivePatientBtn">Archivar paciente</button></div></article><article class="card denty-box"><h2>Denty Box Ambiental</h2><p>Acciones rapidas, notas y comandos del paciente.</p><button class="ghost" data-go="assistant">Abrir comandos</button></article><div class="tabs">${['resumen','tratamiento','planificacion','agenda','trabajos','presupuestos','documentos','alertas','comentarios','archivos','imprimir'].map(t=>`<button class="tab ${state.patientTab===t?'active':''}" data-ptab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div><div id="patientTabBody">${renderPatientTab(p)}</div></section>`;
}
function renderAgendaSafetyBanner(){
  const day=db.appointments.filter(a=>a.date===state.date);
  const patientIds=new Set(day.map(a=>Number(a.patient_id)));
  const alerts=db.clinicalAlerts.filter(a=>patientIds.has(Number(a.patient_id))&&a.active!==false);
  const unsigned=db.documents.filter(d=>patientIds.has(Number(d.patient_id))&&d.status!=='firmado');
  return `<div class="agenda-safety-banner"><b>Revision previa de agenda</b><span>${day.length} cita(s), ${alerts.length} alerta(s) activa(s), ${unsigned.length} consentimiento(s) pendiente(s).</span></div>`;
}
function renderAgenda(){
  const c=agendaVisibleCounters(), view=state.agendaView==='doctors'?renderAgendaByDoctors():state.agendaView==='list'?renderAgendaList():renderAgendaTimeline();
  return `<section class="agenda-v10"><header class="agenda-commandbar"><div class="agenda-title-block"><span class="eyebrow">Organización clínica</span><h1>Agenda</h1><p>${esc(prettyDate(state.date))}</p></div><div class="agenda-day-controls"><button type="button" class="agenda-nav-arrow" id="prevDay" aria-label="Día anterior">‹</button><button type="button" class="agenda-today-btn" id="agendaToday">Hoy</button><input id="agendaDate" type="date" value="${state.date}" aria-label="Fecha de agenda"><button type="button" class="agenda-nav-arrow" id="nextDay" aria-label="Día siguiente">›</button></div><button class="primary agenda-new-btn" id="openAppointmentModal">+ Cita</button></header><div class="agenda-v12-tools" role="toolbar" aria-label="Operaciones de agenda"><button type="button" data-agenda-mode="move">Mover citas</button><button type="button" data-agenda-mode="resize">Duracion</button><button type="button" data-agenda-mode="block">Bloquear hueco</button><button type="button" data-agenda-mode="waiting">Lista de espera</button><button type="button" id="agendaAutoPlanClinical">Planificar plan clinico</button></div><div class="agenda-v12-panels"><div class="agenda-waiting-panel">Lista de espera inteligente preparada para huecos libres.</div><div class="agenda-cascade-panel">Reprogramacion en cascada disponible desde cada cita.</div><div class="agenda-block-card">Bloqueos y vacaciones se validan antes de guardar nuevas citas.</div></div><div class="agenda-overview"><div><strong>${c.total}</strong><span>Citas</span></div><div><strong>${c.confirmed}</strong><span>Confirmadas</span></div><div><strong>${c.waiting}</strong><span>En espera</span></div><div class="${c.conflicts?'attention':''}"><strong>${c.conflicts+c.overlaps}</strong><span>Avisos</span></div></div>${renderAgendaSafetyBanner()}<div class="agenda-viewbar" role="tablist" aria-label="Vista de agenda"><button class="${state.agendaView==='doctors'?'active':''}" data-agenda-view="doctors">Doctores</button><button class="${state.agendaView==='timeline'||state.agendaView==='hours'?'active':''}" data-agenda-view="timeline">Día</button><button class="${state.agendaView==='list'?'active':''}" data-agenda-view="list">Lista</button></div><div class="agenda-content">${view}</div>${renderAgendaQuickPanel()}</section>`;
}
function renderDocumentsTab(p){
  const docs=db.documents.filter(d=>Number(d.patient_id)===Number(p.id)).sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
  return `<div class="toolbar"><button class="primary" id="newConsentDoc">Nuevo consentimiento</button></div>${docs.length?docs.map(d=>`<article class="doc-card phase2-doc ${d.locked_at?'locked-doc':''}"><div class="section-title"><h2>${esc(d.title)}</h2><span class="${d.status==='firmado'?'ok-banner':'warn-banner'}">${d.locked_at?'firmado y bloqueado':esc(d.status)}</span></div><p>${esc(d.text)}</p><div class="consent-checklist"><span class="${d.accepted?'done':''}">Informacion aceptada</span><span class="${d.accepted_risks?'done':''}">Riesgos revisados</span><span class="${d.signature_data?'done':''}">Firma capturada</span><span class="${d.hash?'done':''}">Huella generada</span></div><small>v${d.version||1} ${d.locked_at?'· bloqueado '+new Date(d.locked_at).toLocaleString('es-ES'):''} ${d.hash?'· hash '+esc(d.hash.slice(0,16)):' '}</small>${d.signature_data?`<img class="doc-signature" src="${esc(d.signature_data)}" alt="Firma guardada" />`:''}<div class="toolbar"><button class="ghost" data-view-doc="${d.id}">Ver</button><button class="ghost" data-pdf-doc="doc:${d.id}">PDF</button>${d.locked_at?'':'<button class="primary" data-sign-doc="'+d.id+'">Firmar</button>'}</div></article>`).join(''):'<div class="empty-state">Sin documentos firmados.</div>'}`;
}
function renderAlertsTab(p){
  const list=db.clinicalAlerts.filter(a=>Number(a.patient_id)===Number(p.id));
  return `<div class="toolbar"><button class="primary" id="addAlert">+ Alerta clinica</button></div>${list.map(a=>`<div class="clinical-alert-card ${esc(a.severity||'alta')}"><strong>${esc(a.type||'Alerta')}</strong><div>${esc(a.text||'')}</div><small>${esc(a.severity||'alta')} · ${a.active===false?'inactiva':'activa'}</small></div>`).join('')||'<div class="empty-state">Sin alertas clinicas.</div>'}`;
}
function openConsentModal(){
  const p=patient(state.patientId);
  if(!p) return;
  const modal=$('#consentModal');
  modal.innerHTML=`<form id="consentForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Nuevo consentimiento</h2><button class="icon-btn" type="button" data-dialog-close value="cancel">x</button></div><label class="field">Plantilla<select name="consent_id">${db.consents.filter(c=>c.active!==false).map(c=>`<option value="${c.id}">${esc(c.title)} · v${esc(c.version||1)}</option>`).join('')}</select></label><div class="consent-help">Incluye diagnostico, beneficios, riesgos, alternativas, cuidados y firmante responsable.</div><div class="consent-checklist editor"><label><input name="accepted_info" type="checkbox" required> Informacion explicada al paciente</label><label><input name="accepted_risks" type="checkbox" required> Riesgos y alternativas revisados</label><label><input name="accepted_privacy" type="checkbox" required> Uso y custodia del documento aceptados</label></div><label class="field">Titulo<input name="title" value="Consentimiento informado"></label><button class="primary">Crear documento</button></form>`;
  modal.showModal();
  $('#consentForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); snapshot('consent.create',p.id); const doc=createConsentDocument(db,{patient_id:p.id,consent_id:Number(d.consent_id),title:d.title}); doc.accepted_info=!!d.accepted_info; doc.accepted_risks=!!d.accepted_risks; doc.accepted_privacy=!!d.accepted_privacy; persist(); modal.close(); state.patientTab='documentos'; render(); toast('Documento creado'); openSignatureModal(doc.id); };
}
function paidAmountForBudget(budgetId){ return paymentAmountForBudget(db,budgetId); }
function budgetFinancialRows(patientId=null){
  return db.budgets.filter(b=>patientId==null||Number(b.patient_id)===Number(patientId)).map(b=>{
    const total=Number(b.total||0);
    const paid=paidAmountForBudget(b.id);
    return {...b,total,paid,pending:Math.max(0,total-paid)};
  });
}
function renderPatientWorksTab(p){
  const works=db.works.filter(w=>Number(w.patient_id)===Number(p.id));
  return `<div class="toolbar"><button class="primary" id="tabNewWork">+ Trabajo</button></div>${works.length?`<div class="lab-kanban patient-lab">${works.map(workCard).join('')}</div>`:'<div class="empty-state">Sin trabajos.</div>'}`;
}
function renderPatientBudgetsTab(p){
  const rows=budgetFinancialRows(p.id);
  return `<div class="toolbar"><button class="primary" id="tabNewBudget">+ Presupuesto</button><button class="ghost" id="patientPayment">Registrar pago</button></div>${rows.length?`<div class="finance-ledger">${rows.map(budgetRow).join('')}</div>`:'<div class="empty-state">Sin presupuestos.</div>'}`;
}
function renderPlanPhaseSummary(p){
  const plans=treatmentPlanHierarchy(db,p.id);
  const steps=plans.flatMap(plan=>plan.steps||[]);
  const phases=['Diagnostico','Urgencia','Tratamiento causal','Rehabilitacion','Mantenimiento'];
  return `<div class="plan-phase-summary">${phases.map(phase=>{ const count=steps.filter(s=>normalizeText(s.phase||'').includes(normalizeText(phase))).length; return `<span><b>${count}</b>${esc(phase)}</span>`; }).join('')}</div>`;
}
function clinicalStatusLabel(status){
  const n=normalizeText(status||'planned');
  if(['completed','completado','hecho','finalizado','realizada'].includes(n)) return 'Completado';
  if(['in progress','in_progress','en curso'].includes(n)) return 'En curso';
  if(['cancelled','cancelado'].includes(n)) return 'Cancelado';
  return 'Pendiente';
}
function renderClinicalAlternativeAdmin(group){
  const contextKeys=[...new Set((group.options||[]).flatMap(o=>o.required_context||[]))];
  const approved=group.options?.find(o=>Number(o.id)===Number(group.approved_option_id));
  const preferred=group.options?.find(o=>Number(o.id)===Number(group.patient_preference?.option_id));
  return `<article class="card clinical-alt-admin"><div class="section-title"><div><h2>${esc(group.title)}</h2><p>${esc(group.context||'Alternativas clínicas para comentar con el paciente.')}</p></div><span class="portal-status-chip ${approved?'ok':'warn'}">${approved?'Validada':'Por decidir'}</span></div>${preferred?`<div class="ok-banner"><strong>Preferencia del paciente:</strong> ${esc(preferred.title)}. Esta preferencia no sustituye la validación clínica.</div>`:''}<div class="clinical-context-grid">${contextKeys.map(key=>`<label><input type="checkbox" data-alt-context="${group.id}:${esc(key)}" ${group.context_checks?.[key]?'checked':''}> <span>${esc(clinicalAlternativeContextLabel(key))}</span></label>`).join('')}</div><div class="clinical-alt-options">${(group.options||[]).map(option=>{ const isApproved=Number(group.approved_option_id)===Number(option.id); const missing=(option.required_context||[]).filter(key=>!group.context_checks?.[key]); return `<section class="clinical-alt-option ${isApproved?'approved':''}"><div class="section-title"><div><h3>${esc(option.title)}</h3><p>${esc(option.summary||'')}</p></div>${isApproved?'<span class="portal-status-chip ok">Plan elegido</span>':''}</div><div class="alt-procon"><div><strong>Ventajas</strong><ul>${(option.pros||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><strong>Inconvenientes</strong><ul>${(option.cons||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div><p class="tiny"><b>Tiempo relativo:</b> ${esc(option.time_relative||'A confirmar')} · <b>Coste relativo:</b> ${esc(option.cost_relative||'A confirmar')}</p>${missing.length?`<div class="warn-banner">Falta validar: ${missing.map(clinicalAlternativeContextLabel).map(esc).join(' · ')}</div>`:''}<button class="${isApproved?'ghost':'primary'} mini" type="button" data-approve-alt="${group.id}:${option.id}" ${isApproved?'disabled':''}>${isApproved?'Opción validada':'Validar esta opción'}</button></section>`; }).join('')}</div></article>`;
}
function renderClinicalPlanAdmin(p){
  const graph=clinicalPlanGraph(db,p.id), alternatives=(db.clinicalAlternativeGroups||[]).filter(g=>Number(g.patient_id)===Number(p.id)&&g.status!=='closed');
  const phases=graph.phases.length?graph.phases.map(phase=>`<article class="card clinical-phase-card"><div class="clinical-phase-head"><span>${phase.rank}</span><div><h2>${esc(phase.label)}</h2><p>${phase.items.length} tratamiento(s) en esta fase</p></div></div><div class="clinical-plan-items">${phase.items.map(item=>`<div class="clinical-plan-item ${treatmentDoneStatus(item.status)?'done':''}"><div class="clinical-item-order">${phase.rank}</div><div class="grow"><strong>${esc(item.title)}</strong><small>${item.tooth?`Diente ${esc(item.tooth)} · `:''}${esc(item.priority_reason||'')}</small>${item.dependency_explanations?.length?`<p class="clinical-dependency"><b>Depende de:</b> ${item.dependency_explanations.map(x=>`${esc(x.title)}. ${esc(x.reason)}`).join(' ')}</p>`:''}<p class="tiny"><b>Paciente verá:</b> ${esc(item.patient_title||item.title)}</p></div><div class="clinical-item-actions"><span class="portal-status-chip ${treatmentDoneStatus(item.status)?'ok':'warn'}">${esc(clinicalStatusLabel(item.status))}</span><button class="ghost mini" type="button" data-clinical-status="${item.id}:${treatmentDoneStatus(item.status)?'planned':'completed'}">${treatmentDoneStatus(item.status)?'Reabrir':'Completar'}</button></div></div>`).join('')}</div></article>`).join(''):'<div class="empty-state">No hay tratamientos clínicos activos. Puedes sincronizar lo indicado en el odontograma o añadir un tratamiento manualmente.</div>';
  return `<div class="clinical-plan-admin"><div class="toolbar"><button class="primary" id="syncClinicalFromOdonto">Sincronizar desde odontograma</button><button class="ghost" id="newClinicalItem">+ Tratamiento</button><button class="ghost" id="addMissingAlternative">+ Alternativas por ausencia</button><button class="ghost" id="syncClinicalBudget">Presupuesto desde plan</button></div><div class="clinical-plan-principle"><strong>Orden clínico recuperado de Denty APK</strong><p>1. dolor/infección · 2. periodontal · 3. saneamiento · 4. ausencias · 5. rehabilitación. Las dependencias explícitas siempre tienen prioridad sobre el orden general.</p></div>${graph.warnings.length?`<div class="danger-banner">${graph.warnings.map(esc).join(' ')}</div>`:''}${phases}${alternatives.length?`<section class="clinical-alternatives-admin"><h2>Planes alternativos</h2><p>La preferencia del paciente se registra aparte de la validación profesional.</p>${alternatives.map(renderClinicalAlternativeAdmin).join('')}</section>`:''}</div>`;
}
function openClinicalItemModal(){
  const p=patient(state.patientId); if(!p)return toast('Elige paciente'); const modal=$('#consentModal');
  modal.innerHTML=`<form id="clinicalItemForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Añadir tratamiento al plan</h2><button class="icon-btn" type="button" data-dialog-close value="cancel">×</button></div><div class="form-grid"><label class="field">Tratamiento<input name="treatment" placeholder="Endodoncia, corona, raspado..."></label><label class="field">Diente / zona<input name="tooth" placeholder="26"></label><label class="field">Causa clínica<input name="clinical_cause" placeholder="pulpitis, caries, ausencia..."></label><label class="field">Precio orientativo<input name="price" type="number" min="0" step="0.01" value="0"></label></div><label class="field">Título clínico<input name="title" placeholder="Ej. Endodoncia 26"></label><label class="field">Nota del profesional<textarea name="clinician_note" placeholder="Motivo, condicionantes o explicación específica"></textarea></label><p class="tiny">Denty ordenará el tratamiento indicado. No crea diagnósticos ni tiempos biológicos por su cuenta.</p><button class="primary">Añadir al plan</button></form>`;
  modal.showModal();
  $('#clinicalItemForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); if(!d.treatment.trim()) return toast('Indica el tratamiento'); snapshot('clinical_plan.item.create',p.id); createClinicalPlanItem(db,{patient_id:p.id,treatment:d.treatment,tooth:d.tooth,clinical_cause:d.clinical_cause,title:d.title,price:Number(d.price||0),clinician_note:d.clinician_note}); persist(); modal.close(); render(); toast('Tratamiento añadido al plan clínico'); };
}
function syncCurrentClinicalPlanFromOdonto(){
  const p=patient(state.patientId); if(!p)return; snapshot('clinical_plan.sync_odontogram',p.id); const result=syncClinicalPlanFromOdontogram(db,p.id); persist(); render(); toast(`${result.created.length} tratamiento(s) nuevos · ${result.alternatives.length} grupo(s) de alternativas`);
}
function createMissingAlternativeForCurrentPatient(){
  const p=patient(state.patientId); if(!p)return; const tooth=prompt('Diente ausente (FDI), por ejemplo 36'); if(!tooth)return; snapshot('clinical_plan.alternatives.create',p.id); createMissingToothAlternatives(db,{patient_id:p.id,tooth:String(tooth).trim()}); persist(); render(); toast('Alternativas creadas para el diente '+tooth);
}
function syncCurrentClinicalBudget(){
  const p=patient(state.patientId); if(!p)return; snapshot('clinical_plan.budget.sync',p.id); const budget=syncClinicalPlanBudget(db,p.id); persist(); state.patientTab='presupuestos'; render(); toast(`Presupuesto borrador actualizado: ${Number(budget.total||0).toFixed(2)} EUR`);
}
function approveAlternative(key){
  const [groupId,optionId]=String(key).split(':').map(Number); try{ snapshot('clinical_plan.alternative.approve',state.patientId); approveClinicalAlternativeOption(db,{group_id:groupId,option_id:optionId}); persist(); render(); toast('Alternativa validada y añadida al plan'); }catch(err){ toast(err?.message||'No se pudo validar la alternativa'); }
}

const phase3LegacyPlanningTab = legacyRenderPlanningTab;
function renderPlanningTab(p){
  const hasNew=(db.clinicalPlanItems||[]).some(x=>Number(x.patient_id)===Number(p.id)&&x.active!==false)||(db.clinicalAlternativeGroups||[]).some(x=>Number(x.patient_id)===Number(p.id)&&x.status!=='closed');
  return `${renderClinicalPlanAdmin(p)}${hasNew?'':`<details class="legacy-plan-details"><summary>Planificador anterior</summary>${renderPlanPhaseSummary(p)}${phase3LegacyPlanningTab(p)}</details>`}`;
}
function workCard(w){
  const p=patient(w.patient_id);
  const status=w.status||'recibido';
  return `<article class="lab-work-card status-${esc(status)}"><div><b>${esc(w.title||'Trabajo laboratorio')}</b><span>${esc(patientFullName(p))}</span><small>${esc(w.lab||db.labs?.find(l=>Number(l.id)===Number(w.lab_id))?.name||'Laboratorio pendiente')} · ${esc(w.due_date||'sin fecha')}</small></div><div class="lab-status-flow">${['recibido','enviado','prueba','terminado','entregado'].map(s=>`<button class="${status===s?'active':''}" data-work-status="${w.id}:${s}">${esc(s)}</button>`).join('')}</div></article>`;
}
function budgetRow(b){
  const p=patient(b.patient_id);
  return `<article class="finance-row"><div><b>${esc(b.title||'Presupuesto')}</b><span>${esc(patientFullName(p))}</span><small>${esc(b.tooth?`Diente ${b.tooth}`:'Sin diente asociado')} · ${esc(b.source||'manual')}</small></div><div class="money-stack"><b>${b.total.toFixed(2)} EUR</b><span>Pagado ${b.paid.toFixed(2)} · Pendiente ${b.pending.toFixed(2)}</span></div><button class="ghost mini" data-pay-budget="${b.id}">Pago</button></article>`;
}
function renderJobsDashboard(){
  const active=db.works.filter(w=>(w.status||'recibido')!=='entregado');
  const delivered=db.works.filter(w=>(w.status||'recibido')==='entregado');
  return `<section class="phase3-dashboard"><div class="page-head"><div><h1>Trabajos / laboratorio</h1><p>${active.length} activos · ${delivered.length} entregados</p></div><button class="primary" id="newGlobalWork">+ Trabajo</button></div><div class="lab-kanban">${(db.works.length?db.works:[]).map(workCard).join('')||'<div class="empty-state">Sin trabajos de laboratorio.</div>'}</div></section>`;
}
function paymentStatusLabel(status){ return ({paid:'Pagado',successful:'Pagado',pending:'Pendiente',sent_to_terminal:'Enviado',awaiting_customer:'Esperando tarjeta',cancel_requested:'Cancelando',failed:'Rechazado',cancelled:'Cancelado',error:'Error',verification_required:'Revisar estado'})[status]||status||'Pagado'; }
function renderPaymentHistory(){
  const attempts=(db.payments||[]).slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,30);
  if(!attempts.length) return '<div class="empty-state">Todavía no hay cobros registrados.</div>';
  return `<div class="payment-history">${attempts.map(p=>{ const pat=patient(p.patient_id), settled=isSettledPayment(p); return `<div class="payment-history-row ${settled?'settled':'unsettled'}"><span><strong>${Number(p.amount||0).toFixed(2)} ${esc(p.currency||'EUR')}</strong><small>${esc(patientFullName(pat)||'Paciente')} · ${esc(p.method||'')} · ${esc(p.concept||'')}</small></span><span class="payment-history-status status-${esc(p.status||'paid')}"><b>${esc(paymentStatusLabel(p.status))}</b><small>${esc(p.provider||'manual')}${p.reader_id?' · '+esc(p.reader_id):''}</small></span></div>`; }).join('')}</div>`;
}
function renderFinancesDashboard(){
  const rows=budgetFinancialRows();
  const total=rows.reduce((s,b)=>s+b.total,0);
  const paid=rows.reduce((s,b)=>s+b.paid,0);
  const pending=rows.reduce((s,b)=>s+b.pending,0);
  return `<section class="phase3-dashboard"><div class="page-head"><div><h1>Finanzas</h1><p>Presupuestos, pagos y pendiente por paciente</p></div><div class="toolbar"><button class="ghost" id="newGlobalPayment">Cobrar</button><button class="primary" id="newGlobalBudget">+ Presupuesto</button></div></div><div class="finance-summary"><div><span>Total</span><b>${total.toFixed(2)} EUR</b></div><div><span>Cobrado</span><b>${paid.toFixed(2)} EUR</b></div><div><span>Pendiente</span><b>${pending.toFixed(2)} EUR</b></div></div><div class="finance-ledger">${rows.length?rows.map(budgetRow).join(''):'<div class="empty-state">Sin presupuestos.</div>'}</div><article class="card finance-payment-history"><h2>Últimos cobros e intentos</h2><p>Los intentos pendientes, rechazados o cancelados no reducen el saldo del paciente.</p>${renderPaymentHistory()}</article></section>`;
}
function procedureOptions(){
  return db.procedures.filter(p=>p.active!==false).slice(0,120).sort((a,b)=>Number(b.price||0)-Number(a.price||0)).map(p=>`<option value="${p.id}">${esc(p.name)} · ${Number(p.price||0).toFixed(2)} EUR</option>`).join('');
}
function openBudgetModal(){
  const p=currentPatient();
  if(!p) return toast('Primero elige un paciente');
  const modal=$('#consentModal');
  modal.innerHTML=`<form id="budgetForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Nuevo presupuesto</h2><button class="icon-btn" type="button" data-dialog-close value="cancel">x</button></div><label class="field">Tratamiento<select name="procedure_id">${procedureOptions()}</select></label><div class="form-grid"><label class="field">Diente<input name="tooth" placeholder="36"></label><label class="field">Cantidad<input name="qty" type="number" min="1" value="1"></label></div><label class="field">Titulo<input name="title" value="Presupuesto ${esc(patientFullName(p))}"></label><button class="primary">Crear presupuesto</button></form>`;
  modal.showModal();
  $('#budgetForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); const pr=db.procedures.find(x=>Number(x.id)===Number(d.procedure_id)); const total=Number(pr?.price||0)*Number(d.qty||1); snapshot('budget.create',p.id); db.budgets.push({id:id(db),patient_id:p.id,procedure_id:Number(d.procedure_id),title:d.title||pr?.name||'Presupuesto',tooth:d.tooth,total,pending:total,source:'catalogo',created_at:new Date().toISOString()}); persist(); modal.close(); state.patientTab='presupuestos'; render(); toast('Presupuesto creado'); };
}
function paymentErrorText(error){
  const msg=String(error?.message||error||'Error de pago');
  if(msg.includes('payment_provider_not_ready')) return 'El servidor de pagos no está configurado. Revisa Ajustes → Pagos y datáfonos.';
  if(msg.includes('reader-offline')||msg.toLowerCase().includes('offline')) return 'El datáfono está desconectado. Comprueba Wi-Fi/datos y vuelve a intentarlo.';
  if(msg.includes('401')||msg.toLowerCase().includes('unauthorized')) return 'SumUp rechazó las credenciales del servidor.';
  return msg;
}
function previewPaymentApi(path, options={}){
  const method=String(options.method||'GET').toUpperCase();
  let body={}; try{ body=options.body?JSON.parse(options.body):{}; }catch{}
  if(path==='/api/payments/status') return {ok:true,payments:{enabled:true,provider:'preview',mode:'browser-sandbox',preview:true}};
  if(path==='/api/payments/readers') return {ok:true,readers:previewGateway.readers};
  if(path.startsWith('/api/payments/reader-status')) return {ok:true,status:{status:'ONLINE',state:'PREVIEW'}};
  if(path==='/api/payments/readers/pair'&&method==='POST'){
    const reader={id:`preview-reader-${previewGateway.readers.length+1}`,name:body.name||'Datáfono de prueba',status:'ONLINE',device:{model:'Preview',identifier:body.pairing_code||'PREVIEW'}};
    previewGateway.readers.push(reader); return {ok:true,reader};
  }
  if(path==='/api/payments/checkout'&&method==='POST'){
    const checkout_id=`preview-checkout-${Date.now()}`;
    previewGateway.checkouts.set(checkout_id,{count:0,status:'pending',reader_id:body.reader_id});
    return {ok:true,provider:'preview',checkout:{checkout_id,client_transaction_id:body.transaction_id||checkout_id,status:'pending'}};
  }
  if(path.startsWith('/api/payments/checkout')&&method==='GET'){
    const q=new URLSearchParams(path.split('?')[1]||''); const id=q.get('checkout_id'); const c=previewGateway.checkouts.get(id);
    if(!c) return {ok:false,error:'checkout_not_found'};
    c.count+=1; if(c.status!=='cancelled'&&c.count>=2)c.status='successful';
    return {ok:true,provider:'preview',checkout:{checkout_id:id,status:c.status}};
  }
  if(path==='/api/payments/terminate'&&method==='POST'){
    for(const c of previewGateway.checkouts.values()) if(c.status==='pending') c.status='cancelled';
    return {ok:true,status:'cancelled'};
  }
  throw new Error('preview_endpoint_not_available');
}
async function paymentApi(path, options={}){
  const init={...options,headers:{'Accept':'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}};
  try{
    const response=await fetch(path,init);
    let data={}; try{ data=await response.json(); }catch{}
    if(!response.ok||data?.ok===false){ const detail=typeof data?.detail==='string'?data.detail:(data?.detail?.detail||data?.error||`HTTP ${response.status}`); const err=new Error(detail); err.payload=data; err.status=response.status; throw err; }
    return data;
  }catch(err){
    if(location.protocol==='file:' || location.hostname.endsWith('vercel.app') || err?.status===404 || err instanceof TypeError) return previewPaymentApi(path,options);
    throw err;
  }
}
function paymentSiteId(){ return Number(db.settings?.clinicProfile?.default_site_id||db.sites?.[0]?.id||0); }
function preferredReaderForSite(siteId){
  const pay=db.settings?.payments||{};
  return String(pay.reader_by_site?.[String(siteId)]||pay.default_reader_id||'');
}
function readerOptions(selected='', includeEmpty=true){
  const items=paymentRuntime.readers||[];
  return `${includeEmpty?'<option value="">Selecciona datáfono</option>':''}${items.map(r=>`<option value="${esc(r.id)}" ${String(selected)===String(r.id)?'selected':''}>${esc(r.name)} · ${esc(r.device?.model||'lector')}</option>`).join('')}`;
}
async function loadPaymentReaders({silent=false}={}){
  try{
    const status=await paymentApi('/api/payments/status');
    paymentRuntime.providerStatus=status.payments||null;
    const readers=await paymentApi('/api/payments/readers');
    paymentRuntime.readers=readers.readers||[];
    return paymentRuntime.readers;
  }catch(err){
    paymentRuntime.providerStatus={enabled:false,provider:'off',error:paymentErrorText(err)};
    paymentRuntime.readers=[];
    if(!silent) toast(paymentErrorText(err));
    return [];
  }
}
function terminalPaymentMessage(payment, remoteStatus=''){
  const status=remoteStatus||payment?.status||'pending';
  if(status==='paid'||status==='successful') return ['success','Pago confirmado','El datáfono ha confirmado el cobro.'];
  if(status==='failed') return ['error','Pago rechazado','La operación no se ha cobrado. Puedes intentarlo de nuevo.'];
  if(status==='cancelled') return ['muted','Pago cancelado','No se ha registrado ningún importe como cobrado.'];
  if(status==='error'||status==='verification_required') return ['error','No se pudo verificar el cobro','Denty no lo considera pagado. Revisa el datáfono antes de repetir.'];
  if(status==='cancel_requested') return ['pending','Cancelando…','Esperando confirmación del datáfono.'];
  return ['pending','Esperando al paciente…','Acerque o inserte la tarjeta en el datáfono.'];
}
function updateTerminalPaymentUi(payment, remoteStatus=''){
  const box=$('#terminalPaymentStatus'); if(!box)return;
  const [tone,title,detail]=terminalPaymentMessage(payment,remoteStatus);
  box.className=`terminal-payment-status ${tone}`;
  box.innerHTML=`<strong>${esc(title)}</strong><span>${esc(detail)}</span>${payment?.checkout_id?`<small>Operación ${esc(payment.checkout_id)}</small>`:''}`;
  const cancel=$('#cancelTerminalPaymentBtn'); if(cancel) cancel.hidden=!['awaiting_customer','pending','sent_to_terminal','cancel_requested'].includes(payment?.status);
}
function createLocalPaymentRecord({patient_id,budget_id,amount,method,concept,site_id,status='paid',provider='manual',reader_id=''}){
  const created=new Date().toISOString();
  const rec={id:id(db),patient_id:Number(patient_id),budget_id:budget_id?Number(budget_id):null,amount:Number(amount),currency:db.settings?.payments?.currency||'EUR',method,concept:concept||'',status,provider,reader_id:reader_id||'',checkout_id:'',client_transaction_id:'',site_id:Number(site_id||0)||null,created_at:created,completed_at:status==='paid'?created:'',failure_reason:''};
  db.payments.push(rec); return rec;
}
function currentBudgetPending(budgetId){ return budgetFinancialRows().find(b=>Number(b.id)===Number(budgetId))?.pending??null; }
async function startTerminalPayment(data, form, modal){
  const amount=Number(data.amount||0), amountCents=Math.round(amount*100), pid=Number(data.patient_id), readerId=String(data.reader_id||'');
  if(!(amountCents>0)) return toast('Indica un importe mayor que cero');
  if(!paymentRuntime.providerStatus) await loadPaymentReaders({silent:true});
  if(!paymentRuntime.providerStatus?.enabled) return toast('No hay un proveedor de pagos disponible');
  if(!readerId) return toast('Selecciona un datáfono');
  const pending=data.budget_id?currentBudgetPending(data.budget_id):null;
  if(pending!=null && amount>Number(pending)+0.009) return toast(`El presupuesto solo tiene ${Number(pending).toFixed(2)} EUR pendientes`);
  snapshot('payment.terminal.start',pid);
  const payment=createLocalPaymentRecord({patient_id:pid,budget_id:data.budget_id,amount,method:'tarjeta',concept:data.concept,site_id:data.site_id,status:'pending',provider:paymentRuntime.providerStatus?.provider||'server',reader_id:readerId});
  payment.client_transaction_id=`denty-${payment.id}-${Date.now()}`;
  paymentRuntime.activePaymentId=payment.id; persist();
  const submit=$('#paymentSubmitBtn'); if(submit){submit.disabled=true;submit.textContent='Enviando al datáfono…';}
  updateTerminalPaymentUi(payment);
  try{
    const out=await paymentApi('/api/payments/checkout',{method:'POST',body:JSON.stringify({reader_id:readerId,amount_cents:amountCents,currency:payment.currency,description:data.concept||`Cobro ${patientFullName(patient(pid))}`,transaction_id:payment.client_transaction_id})});
    const checkout=out.checkout||{};
    payment.provider=out.provider||payment.provider; payment.checkout_id=checkout.checkout_id||''; payment.client_transaction_id=checkout.client_transaction_id||payment.client_transaction_id; payment.status='awaiting_customer'; payment.failure_reason=''; persist();
    if(submit) submit.textContent='Cobro en curso';
    updateTerminalPaymentUi(payment,'pending');
    pollTerminalCheckout(payment.id,modal,0);
  }catch(err){
    const ambiguous=err?.payload?.error==='payment_provider_unreachable';
    payment.status=ambiguous?'verification_required':'error'; payment.failure_reason=paymentErrorText(err); persist(); paymentRuntime.activePaymentId=null;
    if(submit){submit.disabled=ambiguous;submit.textContent=ambiguous?'Revisa el datáfono antes de repetir':'Reintentar cobro en datáfono';}
    updateTerminalPaymentUi(payment,payment.status);
    const box=$('#terminalPaymentStatus'); if(box) box.insertAdjacentHTML('beforeend',`<small>${esc(payment.failure_reason)}</small>`);
  }
}
async function pollTerminalCheckout(paymentId, modal, networkErrors=0){
  clearTimeout(paymentRuntime.pollTimer);
  const payment=db.payments.find(p=>Number(p.id)===Number(paymentId));
  if(!payment||!payment.checkout_id||!payment.reader_id)return;
  try{
    const out=await paymentApi(`/api/payments/checkout?reader_id=${encodeURIComponent(payment.reader_id)}&checkout_id=${encodeURIComponent(payment.checkout_id)}`);
    const checkout=out.checkout||{}, remote=checkout.status||'pending';
    payment.failure_reason=checkout.failure_reason||payment.failure_reason||'';
    if(remote==='successful'){
      payment.status='paid'; payment.completed_at=new Date().toISOString(); paymentRuntime.activePaymentId=null; persist(); recordAudit('payment.terminal.paid',payment.patient_id,`${payment.amount} ${payment.currency}`); persist(); updateTerminalPaymentUi(payment,'successful');
      setTimeout(()=>{ try{modal.close();}catch{} render(); toast(`Cobro confirmado: ${payment.amount.toFixed(2)} EUR`); },900); return;
    }
    if(remote==='failed'||remote==='cancelled'){
      payment.status=remote; payment.completed_at=new Date().toISOString(); paymentRuntime.activePaymentId=null; persist(); updateTerminalPaymentUi(payment,remote);
      const submit=$('#paymentSubmitBtn'); if(submit){submit.disabled=false;submit.textContent='Intentar de nuevo';} return;
    }
    if(payment.status!=='cancel_requested') payment.status='awaiting_customer';
    persist(); updateTerminalPaymentUi(payment,remote);
    paymentRuntime.pollTimer=setTimeout(()=>pollTerminalCheckout(paymentId,modal,0),1500);
  }catch(err){
    if(networkErrors>=7){ payment.status='verification_required'; payment.failure_reason=paymentErrorText(err); persist(); paymentRuntime.activePaymentId=null; updateTerminalPaymentUi(payment,'verification_required'); const submit=$('#paymentSubmitBtn'); if(submit){submit.disabled=false;submit.textContent='Nuevo intento';} return; }
    paymentRuntime.pollTimer=setTimeout(()=>pollTerminalCheckout(paymentId,modal,networkErrors+1),2000);
  }
}
async function cancelTerminalPayment(paymentId){
  const payment=db.payments.find(p=>Number(p.id)===Number(paymentId)); if(!payment?.reader_id)return;
  const btn=$('#cancelTerminalPaymentBtn'); if(btn) btn.disabled=true;
  try{ await paymentApi('/api/payments/terminate',{method:'POST',body:JSON.stringify({reader_id:payment.reader_id})}); payment.status='cancel_requested'; persist(); updateTerminalPaymentUi(payment); }
  catch(err){ toast('No se pudo solicitar la cancelación: '+paymentErrorText(err)); if(btn)btn.disabled=false; }
}
async function preparePaymentTerminal(form){
  const panel=$('#terminalPaymentPanel'), status=$('#terminalPaymentStatus'), reader=form?.elements?.reader_id; if(!panel||!reader)return;
  panel.hidden=false; if(status){status.className='terminal-payment-status muted';status.innerHTML='<strong>Buscando datáfonos…</strong><span>Conectando con el servidor local.</span>';}
  await loadPaymentReaders({silent:true});
  const siteId=Number(form.elements.site_id?.value||paymentSiteId()), preferred=preferredReaderForSite(siteId);
  reader.innerHTML=readerOptions(preferred);
  if(preferred&&[...reader.options].some(o=>o.value===preferred)) reader.value=preferred;
  const cfg=paymentRuntime.providerStatus;
  if(!cfg?.enabled){ if(status){status.className='terminal-payment-status error';status.innerHTML=`<strong>Datáfono no configurado</strong><span>${esc(cfg?.error||'Usa el datáfono virtual de preview o configura un proveedor real en una fase posterior.')}</span>`;} }
  else if(!paymentRuntime.readers.length){ if(status){status.className='terminal-payment-status error';status.innerHTML='<strong>Sin datáfonos vinculados</strong><span>Ve a Ajustes → Pagos y datáfonos para emparejar uno.</span>';} }
  else if(status){status.className='terminal-payment-status ready';status.innerHTML=`<strong>${esc(cfg.provider==='mock'?'Modo sandbox':'Terminal listo')}</strong><span>${paymentRuntime.readers.length} datáfono(s) disponible(s).</span>`;}
}
function openPaymentModal(prefBudgetId=null,prefPatientId=null,pref={}){
  if(!activePatients().length) return openPatientModal();
  const prefBudget=db.budgets.find(b=>Number(b.id)===Number(prefBudgetId));
  const selectedPatientId=Number(prefPatientId||prefBudget?.patient_id||state.patientId||activePatients()[0].id);
  const modal=$('#consentModal');
  const patientOptions=activePatients().map(p=>`<option value="${p.id}" ${Number(p.id)===selectedPatientId?'selected':''}>${esc(patientFullName(p))}</option>`).join('');
  const siteOptions=(db.sites||[]).filter(s=>s.active!==false).map(s=>`<option value="${s.id}" ${Number(s.id)===paymentSiteId()?'selected':''}>${esc(s.name)}</option>`).join('');
  const allBudgetOptions=()=>`<option value="">Cobro directo / sin presupuesto</option>${budgetFinancialRows().map(b=>`<option value="${b.id}" data-patient="${b.patient_id}" ${Number(prefBudgetId)===Number(b.id)?'selected':''}>${esc(patientFullName(patient(b.patient_id)))} · ${esc(b.title)} · pendiente ${b.pending.toFixed(2)} EUR</option>`).join('')}`;
  modal.innerHTML=`<form id="paymentForm" class="modal-card payment-modal"><div class="modal-title"><div><h2>Cobrar</h2><small>El pago con tarjeta solo se registra cuando el datáfono lo confirma.</small></div><button class="icon-btn" type="button" data-dialog-close id="closePaymentModal">x</button></div><label class="field">Paciente<select name="patient_id">${patientOptions}</select></label><label class="field">Presupuesto opcional<select name="budget_id">${allBudgetOptions()}</select></label><div class="form-grid"><label class="field">Importe<input name="amount" type="number" min="0.01" step="0.01" value=""></label><label class="field">Método<select name="method"><option value="tarjeta">Tarjeta · datáfono</option><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="financiacion">Financiación</option></select></label><label class="field">Sede<select name="site_id">${siteOptions}</select></label><label class="field">Concepto<input name="concept" value="Cobro clínica"></label></div><div id="terminalPaymentPanel" class="terminal-payment" hidden><label class="field">Datáfono<select name="reader_id"><option value="">Buscando…</option></select></label><div id="terminalPaymentStatus" class="terminal-payment-status muted"><strong>Preparando terminal…</strong><span>Conectando con Denty Local.</span></div><button type="button" class="danger" id="cancelTerminalPaymentBtn" hidden>Cancelar en datáfono</button></div><button class="primary" id="paymentSubmitBtn">Cobrar en datáfono</button></form>`;
  modal.showModal();
  const form=$('#paymentForm'), patientSelect=form.elements.patient_id, budgetSelect=form.elements.budget_id, amount=form.elements.amount, method=form.elements.method, site=form.elements.site_id;
  const syncBudgets=()=>{ const pid=Number(patientSelect.value), current=String(budgetSelect.value||''); [...budgetSelect.options].forEach(opt=>{opt.hidden=!!opt.dataset.patient&&Number(opt.dataset.patient)!==pid;}); const selected=[...budgetSelect.options].find(o=>o.value===current&&!o.hidden); if(!selected) budgetSelect.value=''; const b=budgetFinancialRows(pid).find(x=>Number(x.id)===Number(budgetSelect.value)); if(b&&!amount.value) amount.value=b.pending.toFixed(2); };
  const syncMethod=()=>{ const card=method.value==='tarjeta'; $('#terminalPaymentPanel').hidden=!card; $('#paymentSubmitBtn').textContent=card?'Cobrar en datáfono':'Registrar cobro'; if(card) preparePaymentTerminal(form); };
  patientSelect.onchange=()=>{budgetSelect.value='';amount.value='';syncBudgets();};
  budgetSelect.onchange=()=>{const b=budgetFinancialRows(Number(patientSelect.value)).find(x=>Number(x.id)===Number(budgetSelect.value));if(b)amount.value=b.pending.toFixed(2);};
  method.onchange=syncMethod;
  site.onchange=()=>{ if(method.value==='tarjeta') preparePaymentTerminal(form); };
  syncBudgets(); if(prefBudget) amount.value=Number(prefBudget.pending??prefBudget.total??0).toFixed(2); if(pref?.amount!=null) amount.value=Number(pref.amount).toFixed(2); if(pref?.method) method.value=pref.method; if(pref?.concept) form.elements.concept.value=pref.concept; syncMethod();
  $('#closePaymentModal').onclick=()=>{ if(paymentRuntime.activePaymentId) return toast('Hay un cobro en curso. Cancélalo antes de cerrar.'); clearTimeout(paymentRuntime.pollTimer); modal.close(); };
  $('#cancelTerminalPaymentBtn').onclick=()=>paymentRuntime.activePaymentId&&cancelTerminalPayment(paymentRuntime.activePaymentId);
  form.onsubmit=async e=>{ e.preventDefault(); const d=formData(form), pid=Number(d.patient_id), value=Number(d.amount||0); if(!(value>0)) return toast('Indica un importe mayor que cero'); const pending=d.budget_id?currentBudgetPending(d.budget_id):null; if(pending!=null&&value>Number(pending)+0.009)return toast(`El presupuesto solo tiene ${Number(pending).toFixed(2)} EUR pendientes`); if(d.method==='tarjeta') return startTerminalPayment(d,form,modal); snapshot('payment.create',pid); createLocalPaymentRecord({patient_id:pid,budget_id:d.budget_id,amount:value,method:d.method,concept:d.concept,site_id:d.site_id,status:'paid',provider:'manual'}); recordAudit('payment.manual.paid',pid,`${value} EUR · ${d.method}`); persist(); modal.close(); render(); toast('Cobro registrado'); };
}

function openWorkModal(pref={}){
  if(!activePatients().length) return openPatientModal();
  const selectedPatientId=Number(pref.patient_id||state.patientId||activePatients()[0].id);
  const activeLabs=(db.labs||[]).filter(l=>l.active!==false);
  const preferredLab=activeLabs.find(l=>Number(l.id)===Number(pref.lab_id))||activeLabs.find(l=>normalizeText(l.name)===normalizeText(pref.lab||''))||activeLabs[0];
  const modal=$('#consentModal');
  modal.innerHTML=`<form id="workForm" method="dialog" class="modal-card"><div class="modal-title"><h2>${pref.status==='recibido'?'Recibir trabajo del laboratorio':'Nuevo trabajo laboratorio'}</h2><button class="icon-btn" type="button" data-dialog-close value="cancel">x</button></div><label class="field">Paciente<select name="patient_id">${activePatients().map(p=>`<option value="${p.id}" ${Number(p.id)===selectedPatientId?'selected':''}>${esc(patientFullName(p))}</option>`).join('')}</select></label><label class="field">Trabajo<input name="title" value="${esc(pref.title||'Trabajo protésico')}"></label><div class="form-grid"><label class="field">Laboratorio<select name="lab_id">${activeLabs.map(l=>`<option value="${l.id}" ${Number(l.id)===Number(preferredLab?.id)?'selected':''}>${esc(l.name)}</option>`).join('')||'<option value="">Sin laboratorio configurado</option>'}</select></label><label class="field">Fecha prevista<input name="due_date" type="date" value="${esc(pref.due_date||today())}"></label></div><label class="field">Estado<select name="status">${['recibido','enviado','prueba','terminado','entregado'].map(status=>`<option value="${status}" ${(pref.status||'recibido')===status?'selected':''}>${status[0].toUpperCase()+status.slice(1)}</option>`).join('')}</select></label><button class="primary">Guardar trabajo</button></form>`;
  modal.showModal();
  $('#workForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); const pid=Number(d.patient_id); const lab=db.labs.find(l=>Number(l.id)===Number(d.lab_id)); snapshot('lab_work.create',pid); db.works.push({id:id(db),patient_id:pid,title:d.title,lab_id:lab?.id||null,lab:lab?.name||'',status:d.status,due_date:d.due_date,received_at:d.status==='recibido'?new Date().toISOString():null,created_at:new Date().toISOString()}); persist(); modal.close(); if(state.view==='patientDetail'&&Number(state.patientId)===pid) state.patientTab='trabajos'; render(); toast(d.status==='recibido'?'Trabajo de laboratorio recibido':'Trabajo creado'); };
}
function updateWorkStatus(value){
  const [workId,status]=String(value).split(':');
  const w=db.works.find(x=>Number(x.id)===Number(workId));
  if(!w) return;
  snapshot('lab_work.status',w.patient_id);
  w.status=status;
  w.updated_at=new Date().toISOString();
  persist();
  render();
  toast('Estado de laboratorio actualizado');
}
function perioSiteValues(record){
  const depths=Object.values(record?.periodontal?.depths||{}).map(Number).filter(Number.isFinite);
  const bleeding=Object.values(record?.periodontal?.bleeding||{}).filter(Boolean).length;
  const suppuration=Object.values(record?.periodontal?.suppuration||{}).filter(Boolean).length;
  const furcation=String(record?.periodontal?.furcation||'0');
  return {depths, bleeding, suppuration, furcation, max:depths.length?Math.max(...depths):0};
}
function renderPerioSextantSummary(od){
  const sextants=[
    ['18-14',['18','17','16','15','14']],
    ['13-23',['13','12','11','21','22','23']],
    ['24-28',['24','25','26','27','28']],
    ['48-44',['48','47','46','45','44']],
    ['43-33',['43','42','41','31','32','33']],
    ['34-38',['34','35','36','37','38']]
  ];
  return `<div class="phase4-panel perio-risk-panel"><div class="section-title"><h2>Mapa periodontal por sextantes</h2><p>Bolsas, sangrado, supuracion, movilidad y furcation.</p></div><div class="perio-sextant-grid">${sextants.map(([label,teeth])=>{ const vals=teeth.map(t=>perioSiteValues(od[t])); const deep=vals.reduce((s,v)=>s+v.depths.filter(n=>n>=5).length,0); const bleed=vals.reduce((s,v)=>s+v.bleeding,0); const supp=vals.reduce((s,v)=>s+v.suppuration,0); const furc=vals.filter(v=>v.furcation&&v.furcation!=='0').length; const max=Math.max(0,...vals.map(v=>v.max)); return `<article class="${max>=6||supp?'danger':deep||bleed?'warn':'ok'}"><b>${label}</b><span>${deep} bolsas >=5 mm</span><small>${bleed} sangrado · ${supp} supuracion · ${furc} furcation</small></article>`; }).join('')}</div></div>`;
}
function renderPeriodontalMode(od){
  const base=legacyRenderPeriodontalMode(od);
  return base.replace('<article class="card perio-card compact-summary">', `${renderPerioSextantSummary(od)}<article class="card perio-card compact-summary">`);
}
function importValidationRows(){
  return importRows.map((row,index)=>{
    const data=patientFromRow(row,importMapping);
    const duplicate=!!(data.ficha&&db.patients.some(p=>p.ficha===data.ficha));
    const missing=!data.first_name;
    return {index,row,data,duplicate,missing,status:missing?'Sin nombre':duplicate?'Duplicado':'Listo'};
  });
}
function renderImportValidation(parsed=null){
  const rows=importValidationRows();
  const ok=rows.filter(r=>!r.duplicate&&!r.missing).length;
  const dup=rows.filter(r=>r.duplicate).length;
  const missing=rows.filter(r=>r.missing).length;
  const headers=parsed?.headers||Object.keys(importRows[0]||{}).slice(0,8);
  return `<div class="import-validation"><div class="import-summary"><span><b>${ok}</b> listas</span><span><b>${dup}</b> duplicadas</span><span><b>${missing}</b> incompletas</span><span><b>${headers.length}</b> campos</span></div><div class="table-wrap"><table><thead><tr><th>Estado</th><th>Paciente</th>${headers.slice(0,6).map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,30).map(r=>`<tr class="${r.duplicate?'import-duplicate-row':r.missing?'import-missing-row':'import-ready-row'}"><td>${esc(r.status)}</td><td>${esc(`${r.data.first_name||''} ${r.data.last_name||''}`.trim()||'-')}</td>${headers.slice(0,6).map(h=>`<td>${esc(r.row[h]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
}
function renderImport(){
  return `<section><div class="page-head"><div><h1>Importar</h1><p>Prevalidacion de CSV/TSV con duplicados antes de aplicar.</p></div></div><article class="card phase4-panel"><input id="importFile" type="file" accept=".csv,.tsv,.xlsx"><div class="pill-row"><button id="previewImport" class="ghost">Vista previa</button><button id="commitImport" class="primary" disabled>Importar filas validas</button></div><pre id="importResult" class="result-box">Elige un archivo CSV o TSV. La fase 4 muestra campos detectados, duplicados y filas incompletas antes de importar.</pre><div id="importPreview" class="table-wrap"></div></article></section>`;
}
async function previewImport(){
  const file=$('#importFile')?.files?.[0];
  if(!file) return toast('Elige un archivo');
  if(file.name.toLowerCase().endsWith('.xlsx')){ $('#importResult').textContent='XLSX detectado. La fase 4 mantiene CSV/TSV como via segura en navegador; XLSX pasa a fase servidor.'; return; }
  const text=await file.text();
  const parsed=csvRows(text);
  importRows=parsed.rows;
  importMapping=parsed.mapping;
  recordAudit('import.preview', null, `${file.name} · ${importRows.length} filas`);
  $('#commitImport').disabled=!importRows.length;
  $('#importResult').textContent=`${importRows.length} filas detectadas. Campos mapeados: ${Object.keys(importMapping).join(', ')||'sin mapa automatico'}`;
  $('#importPreview').innerHTML=renderImportValidation(parsed);
}
function commitImport(){
  if(!importRows.length) return;
  snapshot('import.commit');
  let ok=0,skip=0;
  for(const row of importRows){
    const data=patientFromRow(row,importMapping);
    if(!data.first_name){ skip++; continue; }
    const dup=db.patients.some(p=>data.ficha&&p.ficha===data.ficha);
    if(dup){ skip++; continue; }
    try{ createPatient(db,data); ok++; }catch{ skip++; }
  }
  recordAudit('import.commit', null, `${ok} importados · ${skip} omitidos`);
  persist();
  importRows=[];
  render();
  toast(`Importados ${ok}; omitidos ${skip}`);
}
function patientPrintSummary(p){
  const risks=patientRiskCounts(p.id);
  const budgets=budgetFinancialRows(p.id);
  const total=budgets.reduce((s,b)=>s+b.total,0);
  const paid=budgets.reduce((s,b)=>s+b.paid,0);
  return `<section class="patient-print-summary"><h3>${esc(patientFullName(p))}</h3><p>Ficha ${esc(p.ficha||'-')} · Tel. ${esc(p.phone||'-')} · ${esc(p.email||'Sin email')}</p><div><span>${risks.alerts.length} alertas</span><span>${risks.unsigned.length} consentimientos pendientes</span><span>${total.toFixed(2)} EUR total</span><span>${paid.toFixed(2)} EUR cobrado</span></div></section>`;
}
function renderPrintableDocumentCenter(p){
  const docs=db.documents.filter(d=>Number(d.patient_id)===Number(p.id));
  const budgets=budgetFinancialRows(p.id);
  return `<article class="card phase4-panel"><div class="section-title"><h2>Documentos imprimibles</h2><p>Resumen clinico, consentimientos y presupuestos preparados para imprimir o guardar en PDF.</p></div>${patientPrintSummary(p)}<div class="print-document-list"><button class="primary" data-print-doc="summary:${p.id}">Imprimir resumen paciente</button>${docs.map(d=>`<button class="ghost" data-print-doc="doc:${d.id}">Consentimiento · ${esc(d.title)}</button>`).join('')}${budgets.map(b=>`<button class="ghost" data-print-doc="budget:${b.id}">Presupuesto · ${esc(b.title)}</button>`).join('')||'<div class="empty-state">Sin presupuestos imprimibles.</div>'}</div></article>`;
}
function printableDocumentHtml(kind,id){
  if(kind==='summary'){ const p=patient(id); return p?patientPrintSummary(p):''; }
  if(kind==='doc'){ const d=db.documents.find(x=>Number(x.id)===Number(id)); const p=patient(d?.patient_id); if(!d)return ''; if(d.type==='attendance_certificate') return `<section class="print-document attendance-print-document"><pre>${esc(d.text)}</pre></section>`; return `<section class="print-document"><h1>${esc(d.title)}</h1><p>${esc(patientFullName(p))}</p><pre>${esc(d.text)}</pre><small>Estado ${esc(d.status)} · v${esc(d.version||1)} · hash ${esc(d.hash||'pendiente')}</small></section>`; }
  const b=budgetFinancialRows().find(x=>Number(x.id)===Number(id)); const p=patient(b?.patient_id);
  return b?`<section class="print-document"><h1>${esc(b.title)}</h1><p>${esc(patientFullName(p))}</p><div class="finance-summary"><div><span>Total</span><b>${b.total.toFixed(2)} EUR</b></div><div><span>Cobrado</span><b>${b.paid.toFixed(2)} EUR</b></div><div><span>Pendiente</span><b>${b.pending.toFixed(2)} EUR</b></div></div></section>`:'';
}
function printClinicalDocument(value){
  const [kind,id]=String(value).split(':');
  const html=printableDocumentHtml(kind,Number(id));
  const modal=$('#consentModal');
  modal.innerHTML=`<form method="dialog" class="modal-card print-preview-modal"><div class="modal-title"><h2>Vista imprimible</h2><button class="icon-btn" type="button" data-dialog-close value="cancel">x</button></div><div class="print-document">${html}</div><button class="primary" type="button" id="browserPrintBtn">Imprimir / guardar PDF</button></form>`;
  modal.showModal();
  $('#browserPrintBtn').onclick=()=>window.print();
}
function plainTextForPdf(html){
  const container=document.createElement('div');
  container.innerHTML=html;
  return (container.textContent||'Denty').replace(/\s+/g,' ').trim();
}
function pdfAscii(text){
  return String(text||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\x20-\x7E\n\r\t]/g,' ');
}
function pdfEscape(text){ return pdfAscii(text).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)'); }
function splitPdfLines(text, max=86){
  const words=pdfAscii(text).split(/\s+/).filter(Boolean);
  const lines=[];
  let line='';
  for(const word of words){
    const next=line ? `${line} ${word}` : word;
    if(next.length>max){ if(line) lines.push(line); line=word.slice(0,max); }
    else line=next;
  }
  if(line) lines.push(line);
  return lines.length ? lines : ['Denty'];
}
function buildSimplePdf(text){
  const encoder=new TextEncoder();
  const lines=splitPdfLines(text).slice(0,46);
  const bodyLines=lines.map((line,i)=>`BT /F1 10 Tf 50 ${780-(i*15)} Td (${pdfEscape(line)}) Tj ET`).join('\n');
  const contentBytes=encoder.encode(bodyLines);
  const objects=[
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${contentBytes.length} >> stream\n${bodyLines}\nendstream endobj`
  ];
  const chunks=[encoder.encode('%PDF-1.4\n')];
  const offsets=[];
  let byteOffset=chunks[0].length;
  for(const obj of objects){
    offsets.push(byteOffset);
    const bytes=encoder.encode(obj+'\n');
    chunks.push(bytes);
    byteOffset+=bytes.length;
  }
  const xrefStart=byteOffset;
  let xref=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(const offset of offsets) xref+=String(offset).padStart(10,'0')+' 00000 n \n';
  xref+=`trailer << /Root 1 0 R /Size ${objects.length+1} >>\nstartxref\n${xrefStart}\n%%EOF`;
  chunks.push(encoder.encode(xref));
  const total=chunks.reduce((sum,chunk)=>sum+chunk.length,0);
  const pdf=new Uint8Array(total);
  let pos=0;
  for(const chunk of chunks){ pdf.set(chunk,pos); pos+=chunk.length; }
  return pdf;
}function downloadClinicalPdf(value){
  const [kind,id]=String(value).split(':');
  const html=printableDocumentHtml(kind,Number(id));
  const pdf=buildSimplePdf(plainTextForPdf(html));
  const blob=new Blob([pdf],{type:'application/pdf'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`denty-${kind}-${id}.pdf`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
  recordAudit('document.pdf.export', state.patientId, value);
  persist();
}
document.addEventListener('click', event => {
  const closeButton = event.target?.closest?.('[data-dialog-close]');
  if (!closeButton) return;
  event.preventDefault();
  closeButton.closest('dialog')?.close();
});
initSharedStateSync(); bindAccountGateway(); bindTop(); applyAppearance(); applyPreviewRouteFromQuery(); render(); startAgendaStatusClock();
window.DentyAppReady=true;
