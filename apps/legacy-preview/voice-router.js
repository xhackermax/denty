import {
  FDI_ALL,
  addMinutes,
  createPatient,
  ensureOdontogram,
  id,
  normalizeText,
  patientFullName,
  setToothLegendState,
  stripWakeRaw,
  today
} from './logic.js';

export const VOICE_INTENTS = Object.freeze([
  'patient.select','patient.create','odontogram.set','odontogram.batch','periodontal.update',
  'appointment.create','comment.add','alert.add','budget.create','payment.record','lab.receive',
  'task.create','navigation.open'
]);

const ALLOWED_INTENTS = new Set(VOICE_INTENTS);
const ALLOWED_TOOTH_STATES = new Set([
  'healthy','missing','extraction','caries','filling','filling_bad','filling_pending','crown','crown_bad','crown_pending',
  'endo','endo_bad','endo_indicated','post','post_bad','post_pending','implant','implant_review','implant_indicated',
  'prosthesis','prosthesis_bad','prosthesis_pending','removable','removable_bad','removable_pending'
]);
const NAV_TARGETS = new Set(['today','patients','patientDetail','agenda','odontogram','assistant','tasks','jobs','finances','settings','staff']);
const METHODS = ['tarjeta','efectivo','transferencia','financiacion'];
const WEEKDAYS = {lunes:0,martes:1,miercoles:2,jueves:3,viernes:4,sabado:5,domingo:6};

function result(intent, slots={}, confidence=.9, extra={}){
  return {intent, confidence, source:'rules', slots, requires_confirmation:false, ...extra};
}
function unknown(text){ return result('unknown',{raw:String(text||'')},.1,{requires_confirmation:false}); }
function cleanRaw(text){ return stripWakeRaw(String(text||'')).replace(/\s+/g,' ').trim(); }
function ntext(text){ return normalizeText(cleanRaw(text)); }
function extractTooth(text){ const m=String(text||'').match(/\b([1-4][1-8])\b/); return m?.[1]||null; }
function extractSurface(text){
  const n=ntext(text);
  if(/\b(oclusal|oclus|o)\b/.test(n)) return 'O';
  if(/\b(incisal|incis|i)\b/.test(n)) return 'I';
  if(/\b(mesial|m)\b/.test(n)) return 'M';
  if(/\b(distal|d)\b/.test(n)) return 'D';
  if(/\b(vestibular|bucal|v)\b/.test(n)) return 'V';
  if(/\b(lingual|palatino|palatina|l|p)\b/.test(n)) return 'P';
  return '';
}
function extractAmount(text){
  const n=ntext(text).replace(',','.');
  const m=n.match(/(?:cobra|cobrar|pago|paga|importe|de)\s*(?:de\s*)?(\d+(?:\.\d{1,2})?)\s*(?:€|euros?)?/);
  if(m) return Number(m[1]);
  const any=n.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:€|euros?)\b/);
  return any?Number(any[1]):null;
}
function extractPhone(text){ const m=String(text||'').match(/(?:tel[eé]fono|movil|m[oó]vil)\s*[:\-]?\s*((?:\+?\d[\s-]*){8,15})/i); return m?m[1].replace(/[^\d+]/g,''):''; }
function extractDni(text){ const m=String(text||'').match(/(?:dni|nie|nif)\s*[:\-]?\s*([A-Z0-9-]{6,14})/i); return m?m[1].toUpperCase():''; }
function extractMethod(text){ const n=ntext(text); return METHODS.find(m=>n.includes(m)) || (n.includes('bizum')?'bizum':'efectivo'); }
function extractDuration(text){ const n=ntext(text); const m=n.match(/(?:durante|de)\s*(\d{1,3})\s*(?:min|minutos?)/); return m?Math.max(5,Math.min(360,Number(m[1]))):40; }
function extractTime(text){
  const raw=String(text||'');
  const n=ntext(text);
  let m=raw.match(/a las?\s*(\d{1,2})(?::|\s+y\s+)?(\d{2})?/i);
  if(!m) m=raw.match(/\b(\d{1,2}):(\d{2})\b/);
  if(m){ const h=Math.min(23,Number(m[1])); const min=Math.min(59,Number(m[2]||0)); return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`; }
  const words={una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20};
  m=n.match(/a las?\s+(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|veinte)\b/);
  return m?`${String(words[m[1]]).padStart(2,'0')}:00`:null;
}
function dateObj(date){ const d=new Date(`${date||today()}T12:00:00`); return Number.isNaN(d.getTime())?new Date():d; }
function ymd(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function plusDays(date,days){ const d=dateObj(date); d.setDate(d.getDate()+days); return ymd(d); }
function mondayWeekday(date){ const d=dateObj(date); return (d.getDay()+6)%7; }
export function resolveSpokenDate(text, now=today()){
  const n=ntext(text);
  if(/pasado manana/.test(n)) return plusDays(now,2);
  if(/\bmanana\b/.test(n)) return plusDays(now,1);
  if(/\bhoy\b/.test(n)) return now;
  const direct=String(text||'').match(/\b(20\d{2})-(\d{2})-(\d{2})\b/); if(direct) return direct[0];
  for(const [name,target] of Object.entries(WEEKDAYS)){
    if(new RegExp(`\\b${name}\\b`).test(n)){
      const current=mondayWeekday(now); let delta=(target-current+7)%7; if(delta===0) delta=7; return plusDays(now,delta);
    }
  }
  return now;
}
function extractTreatment(text){
  const n=ntext(text);
  const choices=[
    ['endodoncia',/endo|conductos?/],['implante',/implante/],['corona',/corona/],['perno',/perno|munon/],
    ['puente',/puente|protesis fija/],['removible',/removible/],['extraccion',/extracci|exodon/],
    ['obturacion',/obtur|empaste|reconstru/],['limpieza',/limpieza|higiene/],['periodontal',/raspado|period/]
  ];
  for(const [name,re] of choices) if(re.test(n)) return name;
  return 'tratamiento';
}
function treatmentStatus(text, base){
  const n=ntext(text);
  const bad=/repetir|repite|mal estado|insatisfactor|fallad|a retratar|retrat/.test(n);
  const pending=/hay que|pendiente|indicado|indicada|necesita|hacer|realizar|poner/.test(n);
  const good=/realizad|hech[ao]|correct[ao]|bien|colocad[ao]|terminad[ao]/.test(n);
  if(base==='endo') return bad?'endo_bad':pending&&!good?'endo_indicated':'endo';
  if(base==='post') return bad?'post_bad':pending&&!good?'post_pending':'post';
  if(base==='implant') return bad?'implant_review':pending&&!good?'implant_indicated':'implant';
  if(base==='filling') return bad?'filling_bad':pending&&!good?'filling_pending':'filling';
  if(base==='crown') return bad?'crown_bad':pending&&!good?'crown_pending':'crown';
  if(base==='prosthesis') return bad?'prosthesis_bad':pending&&!good?'prosthesis_pending':'prosthesis';
  if(base==='removable') return bad?'removable_bad':pending&&!good?'removable_pending':'removable';
  return base;
}
function odontogramCommand(text){
  const n=ntext(text), tooth=extractTooth(text), surface=extractSurface(text);
  if(!tooth) return null;
  if(/caries/.test(n)) return result('odontogram.set',{tooth,surface:surface||'O',status:'caries'},.98);
  if(/\b(sano|saludable)\b/.test(n)) return result('odontogram.set',{tooth,status:'healthy'},.96);
  if(/\b(ausente|falta|perdido)\b/.test(n)) return result('odontogram.set',{tooth,status:'missing'},.96);
  if(/extracci|exodon/.test(n)) return result('odontogram.set',{tooth,status:'extraction'},.96);
  if(/endo|conducto/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'endo')},.96);
  if(/perno|munon/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'post')},.95);
  if(/implante/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'implant')},.94);
  if(/corona/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'crown')},.95);
  if(/puente|protesis fija/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'prosthesis')},.93);
  if(/removible/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'removable')},.93);
  if(/obtur|empaste|reconstru/.test(n)) return result('odontogram.set',{tooth,surface:surface||'',status:treatmentStatus(text,'filling')},.94);
  return null;
}
function periodontalCommand(text){
  const n=ntext(text), tooth=extractTooth(text); if(!tooth) return null;
  const mob=(n.match(/movilidad\s*(\d|i{1,3})/)||[])[1];
  const depth=(n.match(/(?:bolsa|sondaje|profundidad)\s*(\d{1,2})/)||[])[1];
  if(!mob&&!depth) return null;
  return result('periodontal.update',{tooth,mobility:mob?String(mob).toUpperCase():null,depth_mm:depth?Number(depth):null,surface:extractSurface(text)||'D'},.94);
}
function extractCreatePatientName(raw){
  let s=raw.replace(/^.*?\b(?:crea|crear|nuevo|nueva|alta|registra)\b\s*(?:un|una)?\s*(?:paciente|ficha)?\s*(?:que se llama|llamad[oa])?\s*/i,'');
  s=s.replace(/\s+(?:tel[eé]fono|movil|m[oó]vil|dni|nie|nif)\b.*$/i,'').trim();
  return s;
}
function splitName(full){ const parts=String(full||'').trim().split(/\s+/).filter(Boolean); return {first_name:parts.shift()||'',last_name:parts.join(' ')}; }
function extractPatientQuery(raw, mode='generic'){
  const toothRe='(?:[1-4][1-8])';
  let m;
  if(mode==='appointment') m=raw.match(/\bcita\s+a\s+(.+?)(?=\s+(?:hoy|mañana|manana|pasado\s+mañana|pasado\s+manana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b|\s+a\s+las?\b|\s+durante\b|\s+para\b|$)/i);
  else if(mode==='payment') m=raw.match(/\b(?:a|del paciente)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ .'-]+?)\s*$/i);
  else if(mode==='lab') m=raw.match(/\b(?:de|del paciente)\s+(.+?)(?=\s+(?:corona|puente|pr[oó]tesis|férula|ferula|alineador|implante|perno|${toothRe})\b|$)/i);
  else m=raw.match(/\b(?:abre|busca|selecciona|carga|ponme)\s+(?:la\s+ficha\s+de\s+|el\s+paciente\s+|a\s+)?(.+)$/i);
  return m?.[1]?.trim()||'';
}
function extractComment(raw){ return raw.replace(/^.*?\b(?:anade|añade|agrega|pon|registra)\s+(?:un\s+)?comentario\s*/i,'').trim(); }
function extractAlert(raw){
  const n=ntext(raw);
  if(n.includes('alerg')){
    const m=raw.match(/alerg(?:ia|ico|ica)?\s+(?:a\s+)?(.+)$/i); return m?`Alergia a ${m[1].trim()}`:raw;
  }
  return raw.replace(/^.*?\b(?:anade|añade|agrega|pon|registra)\s+(?:una\s+)?alerta\s*/i,'').trim();
}
function labTitle(raw){
  const tooth=extractTooth(raw); const treatment=extractTreatment(raw);
  if(treatment!=='tratamiento') return `${treatment}${tooth?' '+tooth:''}`;
  const n=ntext(raw); if(/ferula/.test(n)) return `férula${tooth?' '+tooth:''}`; return 'Trabajo de laboratorio';
}

export function parseVoiceCommand(text, context={}){
  const raw=cleanRaw(text); const n=normalizeText(raw); if(!n) return unknown(text);

  if(/^(?:crea|crear|nuevo|nueva|alta|registra)\b.*\b(?:paciente|ficha)\b/.test(n)){
    const name=extractCreatePatientName(raw), phone=extractPhone(raw), dni=extractDni(raw), parts=splitName(name);
    if(parts.first_name) return result('patient.create',{...parts,phone,dni},.95);
  }
  if(/^(?:abre|busca|selecciona|carga|ponme)\b/.test(n) && !/(agenda|odontograma|trabajos?|laboratorio|finanzas|tareas|pendientes|ajustes|asistente)/.test(n)){
    const query=extractPatientQuery(raw); if(query) return result('patient.select',{query},.91);
  }

  const nav=[['odontogram','odontogram'],['odontograma','odontogram'],['agenda','agenda'],['laboratorio','jobs'],['trabajos','jobs'],['finanzas','finances'],['cobros','finances'],['tareas','tasks'],['pendientes','tasks'],['pacientes','patients'],['ajustes','settings'],['asistente','assistant'],['inicio','today']];
  if(/\b(abre|ir|ve|muestra|ensena|enseña)\b/.test(n)){
    for(const [word,target] of nav) if(n.includes(word)) return result('navigation.open',{target},.97);
  }

  if(/\b(comentario|nota clinica)\b/.test(n) && /\b(anade|añade|agrega|pon|registra)\b/.test(n)){
    const textValue=extractComment(raw); return result('comment.add',{text:textValue},.94);
  }
  if(/alerg|\balerta\b/.test(n) && /\b(anade|añade|agrega|pon|registra)\b|alerg/.test(n)){
    return result('alert.add',{text:extractAlert(raw),severity:'alta'},.95);
  }

  if(/\b(cobra|cobrar|registra pago|registrar pago|pago de)\b/.test(n)){
    const amount=extractAmount(raw); if(amount!=null) return result('payment.record',{amount,method:extractMethod(raw),patient_query:extractPatientQuery(raw,'payment')},.94,{requires_confirmation:true});
  }
  if(/\b(recibe|recibir|ha llegado|llego)\b.*\b(laboratorio|lab|trabajo)\b|\btrabajo\b.*\b(laboratorio|lab)\b.*\brecibid/.test(n)){
    return result('lab.receive',{patient_query:extractPatientQuery(raw,'lab'),title:labTitle(raw),status:'recibido'},.92);
  }
  if(/\b(presupuesto|presupuesta|precio)\b/.test(n)){
    return result('budget.create',{tooth:extractTooth(raw),treatment:extractTreatment(raw),patient_query:''},.92);
  }
  if(/\b(cita|agenda|programa|citar)\b/.test(n)){
    const tooth=extractTooth(raw), treatment=extractTreatment(raw), date=resolveSpokenDate(raw,context.now||today()), start_time=extractTime(raw)||'10:00', duration_minutes=extractDuration(raw);
    return result('appointment.create',{patient_query:extractPatientQuery(raw,'appointment'),date,start_time,duration_minutes,treatment,tooth,title:treatment==='tratamiento'?'Cita dental':`${treatment}${tooth?' '+tooth:''}`},.91);
  }

  const perio=periodontalCommand(raw); if(perio) return perio;
  const od=odontogramCommand(raw); if(od) return od;
  return unknown(text);
}

export function validateStructuredCommand(command){
  if(!command||typeof command!=='object') return {ok:false,error:'command_not_object'};
  if(!ALLOWED_INTENTS.has(command.intent)) return {ok:false,error:'intent_not_allowed'};
  if(command.slots!=null && (typeof command.slots!=='object'||Array.isArray(command.slots))) return {ok:false,error:'slots_invalid'};
  const slots=command.slots||{};
  if(command.intent==='navigation.open'&&!NAV_TARGETS.has(slots.target)) return {ok:false,error:'navigation_target_invalid'};
  if(command.intent==='odontogram.set' && (!/^([1-4][1-8])$/.test(String(slots.tooth||'')) || !ALLOWED_TOOTH_STATES.has(slots.status))) return {ok:false,error:'odontogram_slots_invalid'};
  if(command.intent==='periodontal.update'&&!/^([1-4][1-8])$/.test(String(slots.tooth||''))) return {ok:false,error:'periodontal_tooth_invalid'};
  if(command.intent==='payment.record' && !(Number(slots.amount)>0)) return {ok:false,error:'payment_amount_invalid'};
  return {ok:true,command:{...command,confidence:Number.isFinite(Number(command.confidence))?Number(command.confidence):.5,source:command.source||'external',slots}};
}

function resolvePatient(db, query='', fallbackId=null){
  const patients=(db.patients||[]).filter(p=>!p.archived);
  if(query){
    const q=normalizeText(query);
    const exact=patients.find(p=>normalizeText(patientFullName(p))===q || normalizeText(p.ficha||'')===q);
    if(exact) return exact;
    const contains=patients.find(p=>normalizeText(patientFullName(p)).includes(q) || q.includes(normalizeText(patientFullName(p))));
    if(contains) return contains;
    const words=q.split(' ').filter(Boolean);
    const ranked=patients.map(p=>({p,score:words.filter(w=>normalizeText(patientFullName(p)).includes(w)).length})).sort((a,b)=>b.score-a.score);
    if(ranked[0]?.score>0) return ranked[0].p;
  }
  if(fallbackId!=null){ const p=patients.find(p=>Number(p.id)===Number(fallbackId)); if(p) return p; }
  return patients[0]||null;
}
function needPatient(){ return {handled:false,needs:'patient',message:'Primero necesito saber qué paciente es.'}; }
function perioSite(surface){ return surface==='M'?'ml':surface==='V'?'v':surface==='P'?'lp':surface==='D'?'dl':surface==='I'||surface==='O'?'lp':'dl'; }
function procedureScore(pr,treatment){
  const t=normalizeText(treatment), name=normalizeText(pr.name), cat=normalizeText(pr.category); let score=0;
  if(name===t) score+=12; if(name.includes(t)) score+=6; if(cat.includes(t)) score+=4;
  for(const token of t.split(' ')) if(token.length>3&&name.includes(token)) score+=2;
  if(t==='implante'){
    if(cat.includes('implant')) score+=4;
    if(/mantenimiento|planificacion/.test(name)) score-=7;
    if(/corona/.test(name)) score-=2;
  }
  if(t==='endodoncia' && /endo/.test(name)) score+=5;
  if(t==='corona' && /corona/.test(name)) score+=5;
  if(t==='obturacion' && /obtur|reconstru|empaste/.test(name)) score+=5;
  return score;
}
function findProcedure(db,treatment){
  const rows=(db.procedures||[]).map(pr=>({pr,score:procedureScore(pr,treatment)})).sort((a,b)=>b.score-a.score||Number(b.pr.price||0)-Number(a.pr.price||0));
  return rows[0]?.score>0?rows[0].pr:null;
}

export function executeVoiceCommand(db, command, context={}){
  const checked=validateStructuredCommand(command);
  if(!checked.ok) return {handled:false,error:checked.error,message:'La orden no es válida o no está permitida.'};
  const cmd=checked.command, s=cmd.slots||{};
  const fallbackId=context.patientId??context.patient_id??null;

  if(cmd.intent==='navigation.open') return {handled:true,intent:cmd.intent,navigation:{target:s.target},message:`Abriendo ${s.target}`};
  if(cmd.intent==='patient.select'){
    const patient=resolvePatient(db,s.query,fallbackId); return patient?{handled:true,intent:cmd.intent,patient,message:`Paciente seleccionado: ${patientFullName(patient)}`}:{handled:false,needs:'patient',message:`No encuentro a ${s.query||'ese paciente'}.`};
  }
  if(cmd.intent==='patient.create'){
    if(!s.first_name) return {handled:false,needs:'patient_name',message:'Falta el nombre del paciente.'};
    const patient=createPatient(db,{first_name:s.first_name,last_name:s.last_name||'',phone:s.phone||'',dni:s.dni||'',ficha:s.ficha||''});
    return {handled:true,intent:cmd.intent,patient,message:`Paciente guardado: ${patientFullName(patient)}`};
  }

  const patient=resolvePatient(db,s.patient_query||'',s.patient_id??fallbackId);
  if(!patient) return needPatient();

  if(cmd.intent==='odontogram.set'){
    setToothLegendState(db,patient.id,String(s.tooth),s.status,s.surface||'');
    return {handled:true,intent:cmd.intent,patient,odontogram:{tooth:String(s.tooth),status:s.status,surface:s.surface||''},message:`Odontograma actualizado: ${s.tooth} ${s.status}${s.surface?' '+s.surface:''}`};
  }
  if(cmd.intent==='periodontal.update'){
    const rec=ensureOdontogram(db,patient.id)[String(s.tooth)];
    if(s.mobility!=null) rec.periodontal.mobility=String(s.mobility);
    if(Number.isFinite(Number(s.depth_mm)) && Number(s.depth_mm)>=0) rec.periodontal.depths[perioSite(s.surface||'D')]=String(Number(s.depth_mm));
    return {handled:true,intent:cmd.intent,patient,periodontal:{tooth:String(s.tooth)},message:`Periodontal actualizado en ${s.tooth}`};
  }
  if(cmd.intent==='appointment.create'){
    db.appointments=db.appointments||[]; const start=s.start_time||'10:00', duration=Math.max(5,Math.min(360,Number(s.duration_minutes||40)));
    const appointment={id:id(db),patient_id:patient.id,employee_id:Number(s.employee_id||db.employees?.[0]?.id||1),cabinet_id:Number(s.cabinet_id||db.cabinets?.[0]?.id||1),date:s.date||context.now||today(),start_time:start,end_time:addMinutes(start,duration),duration_minutes:duration,title:s.title||'Cita dental',reason:s.title||'Cita dental',detail:s.detail||'',status:'programada',site:s.site||'',confirmed:false,source:`voice:${cmd.source}`,created_at:new Date().toISOString()};
    db.appointments.push(appointment); return {handled:true,intent:cmd.intent,patient,appointment,message:`Cita creada para ${patientFullName(patient)}: ${appointment.date} ${appointment.start_time}`};
  }
  if(cmd.intent==='comment.add'){
    db.comments=db.comments||[]; const comment={id:id(db),patient_id:patient.id,category:s.category||'Voz',text:String(s.text||'').trim(),created_at:new Date().toISOString(),source:`voice:${cmd.source}`};
    if(!comment.text) return {handled:false,needs:'text',message:'Falta el comentario.'}; db.comments.push(comment); return {handled:true,intent:cmd.intent,patient,comment,message:'Comentario añadido a la ficha.'};
  }
  if(cmd.intent==='alert.add'){
    db.clinicalAlerts=db.clinicalAlerts||[]; const alert={id:id(db),patient_id:patient.id,type:s.type||'Alerta clínica',severity:s.severity||'alta',text:String(s.text||'').trim(),active:true,created_at:new Date().toISOString(),source:`voice:${cmd.source}`};
    if(!alert.text) return {handled:false,needs:'text',message:'Falta el texto de la alerta.'}; db.clinicalAlerts.push(alert); return {handled:true,intent:cmd.intent,patient,alert,message:'Alerta clínica añadida.'};
  }
  if(cmd.intent==='budget.create'){
    db.budgets=db.budgets||[]; const procedure=findProcedure(db,s.treatment||'tratamiento'); const total=Number(procedure?.price||0);
    const budget={id:id(db),patient_id:patient.id,title:s.title||`${s.treatment||'Tratamiento'}${s.tooth?' '+s.tooth:''}`,total,pending:total,tooth:s.tooth||'',procedure_id:procedure?.id||null,lines:procedure?[{procedure_id:procedure.id,name:procedure.name,qty:1,unit_price:Number(procedure.price||0),total}]:[],status:'borrador',created_at:new Date().toISOString(),source:`voice:${cmd.source}`};
    db.budgets.push(budget); return {handled:true,intent:cmd.intent,patient,budget,message:`Presupuesto creado: ${budget.title}${procedure?` · ${total.toFixed(2)} EUR`:''}`};
  }
  if(cmd.intent==='payment.record'){
    const method=s.method||'efectivo', amount=Number(s.amount), request={patient_id:patient.id,budget_id:s.budget_id?Number(s.budget_id):null,amount,method,concept:s.concept||'Cobro registrado por voz'};
    if(method==='tarjeta') return {handled:true,intent:cmd.intent,patient,terminal_required:true,payment_request:request,message:`Cobro con tarjeta preparado: ${amount.toFixed(2)} EUR. Selecciona el datáfono para continuar.`};
    db.payments=db.payments||[]; const created=new Date().toISOString(); const payment={id:id(db),...request,currency:'EUR',status:'paid',provider:'voice_manual',reader_id:'',checkout_id:'',client_transaction_id:'',created_at:created,completed_at:created,source:`voice:${cmd.source}`};
    db.payments.push(payment); return {handled:true,intent:cmd.intent,patient,payment,message:`Cobro registrado: ${payment.amount.toFixed(2)} EUR en ${payment.method}.`};
  }
  if(cmd.intent==='lab.receive'){
    db.works=db.works||[]; const work={id:id(db),patient_id:patient.id,title:s.title||'Trabajo de laboratorio',lab:s.lab||'',status:'recibido',due_date:s.due_date||'',received_at:new Date().toISOString(),created_at:new Date().toISOString(),source:`voice:${cmd.source}`};
    db.works.push(work); return {handled:true,intent:cmd.intent,patient,work,message:`Trabajo recibido: ${work.title} · ${patientFullName(patient)}`};
  }
  if(cmd.intent==='task.create'){
    db.tasks=db.tasks||[]; const task={id:id(db),patient_id:patient.id,title:s.title||'Tarea',status:'pendiente',due_date:s.due_date||'',created_at:new Date().toISOString(),source:`voice:${cmd.source}`}; db.tasks.push(task); return {handled:true,intent:cmd.intent,patient,task,message:`Tarea creada: ${task.title}`};
  }
  return {handled:false,message:'La acción todavía no tiene ejecutor.'};
}
