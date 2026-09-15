/* Denty static preview bundle. GENERATED FILE.
 * Sources of truth: logic.js, voice-router.js, app.js.
 * Rebuild: node build-static-bundle.mjs
 */

(function(){'use strict';
const DB_KEY = 'denty_web_vercel_preview_1_6_terminal';
const PREVIOUS_KEYS = ['denty_web_vercel_preview_1_5_admin','denty_web_vercel_preview_1_4_voice','denty_web_vercel_preview_1_3_3_settings_panels','denty_web_vercel_preview_1_3_clinical_nlu','denty_web_vercel_preview_0_7_clinical_planning','denty_web_vercel_preview_0_7_treatment_plans_consents','denty_web_vercel_preview_0_6_3_split_perio','denty_web_vercel_preview_0_6_2_perio_position','denty_web_vercel_preview_0_6_1_layout05_better_teeth','denty_web_vercel_preview_0_5_denty_apk_catalog','denty_web_vercel_preview_0_4_odonto_apk_like','denty_web_vercel_preview_0_3_functional_apk','denty_web_vercel_preview_0_2_visual_apk','denty_web_vercel_preview_0_1'];
const FDI_UPPER = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
const FDI_LOWER = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];
const FDI_ALL = [...FDI_UPPER, ...FDI_LOWER];
const SURFACES = ['V','M','O','D','P'];
const PERIO_SITES = ['mv','v','dv','ml','lp','dl'];
const DOCTOR_COLORS = ['#409bd7','#ef941f','#e66c9e','#23a98b','#7c6ee6'];
const STATUS_ORDER = ['healthy','filling','filling_bad','filling_pending','crown','crown_bad','crown_pending','endo','endo_bad','endo_indicated','post','post_bad','post_pending','implant','implant_review','implant_indicated','prosthesis','prosthesis_bad','prosthesis_pending','removable','removable_bad','removable_pending','caries','extraction','missing'];
const STATUS_LABELS = {
  healthy:'Sano final', filling:'Obturación correcta', filling_bad:'Obturación insatisfactoria', filling_pending:'Obturación pendiente', crown:'Corona correcta', crown_bad:'Corona insatisfactoria', crown_pending:'Corona pendiente', endo:'Endodoncia realizada', endo_bad:'Endodoncia a retratar', endo_indicated:'Endodoncia indicada', post:'Perno correcto', post_bad:'Perno insatisfactorio', post_pending:'Perno pendiente', implant:'Implante correcto', implant_review:'Implante a revisar', implant_indicated:'Implante indicado', prosthesis:'Puente / prótesis fija correcta', prosthesis_bad:'Puente insatisfactorio', prosthesis_pending:'Puente pendiente', removable:'Prótesis removible correcta', removable_bad:'Prótesis removible insatisfactoria', removable_pending:'Prótesis removible pendiente', caries:'Caries', extraction:'Extracción indicada', missing:'Ausente'
};
const ODONTO_LEGEND_MAIN = ['caries','filling','crown','endo','post','implant','prosthesis','removable','healthy','missing','extraction'];
const ODONTO_LEGEND_CYCLES = {
  filling:['filling','filling_bad','filling_pending'],
  crown:['crown','crown_bad','crown_pending'],
  endo:['endo','endo_bad','endo_indicated'],
  post:['post','post_bad','post_pending'],
  implant:['implant','implant_review','implant_indicated'],
  prosthesis:['prosthesis','prosthesis_bad','prosthesis_pending'],
  removable:['removable','removable_bad','removable_pending']
};
const ODONTO_LEGEND_BASE_LABELS = {
  caries:'Caries', filling:'Obturación', crown:'Corona', endo:'Endodoncia', post:'Perno', implant:'Implante', prosthesis:'Puente / prótesis fija', removable:'Prótesis removible', healthy:'Sano final', missing:'Ausente', extraction:'Extracción indicada'
};
const ODONTO_LEGEND_STATE_LABELS = {
  filling:['Correcto','Insatisfactorio','Pendiente'], crown:['Correcto','Insatisfactorio','Pendiente'], endo:['Realizada','A retratar','Indicada'], post:['Correcto','Insatisfactorio','Pendiente'], implant:['Correcto','A revisar','Indicado'], prosthesis:['Correcto','Insatisfactorio','Pendiente'], removable:['Correcto','Insatisfactoria','Pendiente']
};
const ODONTO_LEGEND_META = Object.freeze({
  caries:{title:'Caries',applies:'surface',icon:'surface-caries',help:'Aplicar sobre superficie: V, M, O/I, D o P/L.',steps:['Patología']},
  filling:{title:'Obturación',applies:'surface',icon:'surface-filling',help:'Aplicar sobre superficie; toque repetido cambia correcto, insatisfactorio o pendiente.',steps:['Correcto','Insatisfactorio','Pendiente']},
  crown:{title:'Corona',applies:'tooth',icon:'crown-cap',help:'Aplicar al diente completo como corona.',steps:['Correcto','Insatisfactorio','Pendiente']},
  endo:{title:'Endodoncia',applies:'tooth',icon:'root-canal',help:'Aplicar al diente completo como endodoncia.',steps:['Realizada','A retratar','Indicada']},
  post:{title:'Perno',applies:'tooth',icon:'post-core',help:'Aplicar al diente completo como perno/muñón.',steps:['Correcto','Insatisfactorio','Pendiente']},
  implant:{title:'Implante',applies:'tooth',icon:'implant-thread',help:'Aplicar al diente completo como implante.',steps:['Correcto','A revisar','Indicado']},
  prosthesis:{title:'Puente / prótesis fija',applies:'tooth',icon:'fixed-bridge',help:'Aplicar al diente completo como puente o prótesis fija.',steps:['Correcto','Insatisfactorio','Pendiente']},
  removable:{title:'Prótesis removible',applies:'tooth',icon:'removable-prosthesis',help:'Aplicar al diente completo como prótesis removible.',steps:['Correcto','Insatisfactoria','Pendiente']},
  healthy:{title:'Sano final',applies:'tooth',icon:'healthy-check',help:'Aplicar al diente completo como sano al finalizar.',steps:['Sano final']},
  missing:{title:'Ausente',applies:'tooth',icon:'missing-dashed',help:'Aplicar al diente completo como ausente.',steps:['Ausente']},
  extraction:{title:'Extracción indicada',applies:'tooth',icon:'extract-x',help:'Aplicar al diente completo como extracción indicada.',steps:['Indicado']}
});
const WHOLE_TOOTH_CODES = new Set(['healthy','crown','crown_bad','crown_pending','endo','endo_bad','endo_indicated','post','post_bad','post_pending','implant','implant_review','implant_indicated','prosthesis','prosthesis_bad','prosthesis_pending','removable','removable_bad','removable_pending','extraction','missing']);
const SURFACE_CODES = new Set(['caries','filling','filling_bad','filling_pending']);

const DEFAULT_SITES = Object.freeze([
  {id:1,name:'Avenida Navarra 17, Zaragoza',active:true,address:'Avenida Navarra 17, Zaragoza',phone:'',email:''},
  {id:2,name:'Paseo Damas',active:true,address:'Paseo Damas 32, 1ºC, Zaragoza',phone:'600 891 594',email:''},
  {id:3,name:'Cariñena',active:true,address:'Cariñena, Zaragoza',phone:'',email:''}
]);
const DEFAULT_LABS = Object.freeze([
  {id:1,name:'Laboratorio principal',contact:'',phone:'',email:'',notes:'',active:true}
]);
const DEFAULT_EMPLOYEES = Object.freeze([
  {id:1,name:'Dr. Máximo',role:'odontólogo',doctor_id:1,site:'Avenida Navarra 17, Zaragoza',site_id:1,phone:'',active:true,color:DOCTOR_COLORS[0]},
  {id:2,name:'Dr. Isaac',role:'odontólogo',doctor_id:2,site:'Paseo Damas',site_id:2,phone:'',active:true,color:DOCTOR_COLORS[1]},
  {id:3,name:'Dra. Seneida',role:'odontóloga',doctor_id:3,site:'Avenida Navarra 17, Zaragoza',site_id:1,phone:'',active:true,color:DOCTOR_COLORS[2]}
]);
const DEFAULT_SHIFTS = Object.freeze([
  {id:1,employee_id:1,weekday:0,start_time:'09:00',end_time:'14:00',site_id:1},
  {id:2,employee_id:1,weekday:1,start_time:'09:00',end_time:'14:00',site_id:1},
  {id:3,employee_id:1,weekday:2,start_time:'09:00',end_time:'14:00',site_id:1},
  {id:4,employee_id:1,weekday:3,start_time:'09:00',end_time:'14:00',site_id:1},
  {id:5,employee_id:1,weekday:4,start_time:'09:00',end_time:'14:00',site_id:1},
  {id:6,employee_id:2,weekday:0,start_time:'09:00',end_time:'14:00',site_id:2},
  {id:7,employee_id:2,weekday:1,start_time:'16:00',end_time:'20:00',site_id:1},
  {id:8,employee_id:2,weekday:3,start_time:'09:00',end_time:'14:00',site_id:2},
  {id:9,employee_id:3,weekday:0,start_time:'09:00',end_time:'14:00',site_id:1},
  {id:10,employee_id:3,weekday:2,start_time:'09:00',end_time:'14:00',site_id:1},
  {id:11,employee_id:3,weekday:4,start_time:'09:00',end_time:'14:00',site_id:1}
]);
const DEFAULT_CONSENTS = Object.freeze([
  {id:1,title:"Consentimiento protésico",version:2,active:true,signers:['Paciente','Profesional'],text:"CONSENTIMIENTO PROTÉSICO\n\nDiagnóstico y objetivo: rehabilitar forma, función, estética y estabilidad oclusal mediante corona, puente, prótesis removible o prótesis sobre implantes.\n\nBeneficios esperados: recuperar masticación, proteger dientes debilitados, mejorar estética y mantener espacios.\n\nRiesgos y limitaciones: sensibilidad, descementado, fractura de cerámica o estructura, necesidad de ajustes oclusales, mantenimiento, higiene estricta y posible repetición si cambia el soporte dentario o periodontal.\n\nAlternativas: no tratar, obturación, incrustación, extracción y reposición con implante, puente o removible según el caso.\n\nCuidados posteriores: revisiones, higiene, uso de férula si procede y acudir ante dolor, movilidad o fractura.\n\nFirma: declaro haber recibido explicación suficiente, haber podido preguntar y aceptar el tratamiento propuesto."},
  {id:2,title:"Consentimiento ortodóncico",version:2,active:true,signers:['Paciente','Profesional'],text:"CONSENTIMIENTO ORTODÓNCICO\n\nDiagnóstico y objetivo: corregir posición dentaria, oclusión, estética y función con aparatología fija, removible o alineadores.\n\nBeneficios esperados: mejorar alineación, higiene, estabilidad oclusal y estética.\n\nRiesgos y limitaciones: molestias, llagas, descalcificaciones, caries, reabsorción radicular, pérdida de encía, recidiva, necesidad de colaboración, uso de retenedores y posibles refinamientos.\n\nAlternativas: no tratar, tratamiento limitado, restaurador/protésico, extracción o cirugía ortognática según diagnóstico.\n\nFirma: comprendo la duración estimada, la importancia de acudir a revisiones y acepto el plan indicado."},
  {id:3,title:"Consentimiento odontopediátrico",version:2,active:true,signers:['Padre/madre/tutor','Profesional'],text:"CONSENTIMIENTO ODONTOPEDIÁTRICO\n\nDiagnóstico y objetivo: realizar tratamiento dental en paciente menor, incluyendo prevención, obturaciones, pulpotomía, pulpectomía, mantenedores o extracciones si procede.\n\nBeneficios esperados: eliminar dolor o infección, conservar espacio, mejorar función y prevenir complicaciones.\n\nRiesgos: molestias, anestesia local, inflamación, fracaso del tratamiento pulpar, necesidad de repetir tratamiento o extraer.\n\nAlternativas: observación, tratamiento diferido, derivación, sedación o anestesia general si el caso lo requiere.\n\nFirma: autorizo el tratamiento y he sido informado de cuidados y controles."},
  {id:4,title:"Consentimiento cirugía de implantes",version:2,active:true,signers:['Paciente','Profesional'],text:"CONSENTIMIENTO PARA CIRUGÍA DE IMPLANTES\n\nDiagnóstico y objetivo: colocar uno o varios implantes dentales para reponer dientes ausentes o soportar prótesis.\n\nBeneficios esperados: mejorar masticación, estabilidad protésica, estética y preservación funcional.\n\nRiesgos: dolor, inflamación, hematoma, infección, sangrado, fracaso de osteointegración, periimplantitis, alteración sensitiva, comunicación sinusal, lesión de estructuras anatómicas y necesidad de injertos o cirugías adicionales.\n\nAlternativas: no reponer, puente, prótesis removible, sobredentadura u otras opciones según el caso.\n\nCuidados: medicación, higiene, dieta blanda, evitar tabaco, revisiones y mantenimiento periódico.\n\nFirma: declaro comprender el procedimiento, costes, fases y posibles complicaciones."},
  {id:5,title:"Consentimiento quirúrgico",version:2,active:true,signers:['Paciente','Profesional'],text:"CONSENTIMIENTO QUIRÚRGICO ODONTOLÓGICO\n\nProcedimiento: cirugía oral, extracción, regeneración, injerto, elevación sinusal, frenectomía u otro acto quirúrgico indicado.\n\nBeneficios: eliminar infección, dolor, dientes no viables o preparar una rehabilitación posterior.\n\nRiesgos: dolor, inflamación, sangrado, infección, alveolitis, comunicación oro-sinusal, parestesia, fractura radicular, necesidad de sutura o nueva intervención.\n\nAlternativas: control, tratamiento conservador, derivación o no intervención con sus riesgos.\n\nFirma: he recibido instrucciones pre y postoperatorias y acepto el procedimiento."},
  {id:6,title:"Consentimiento estético",version:2,active:true,signers:['Paciente','Profesional'],text:"CONSENTIMIENTO ESTÉTICO DENTAL\n\nObjetivo: mejorar color, forma, proporción, alineación visual o armonía de sonrisa mediante blanqueamiento, carillas, composite, mock-up, gingivoplastia u otros procedimientos.\n\nBeneficios: mejora estética y planificación de la sonrisa.\n\nRiesgos y limitaciones: sensibilidad, expectativas no alcanzables al 100%, cambios de color, fracturas, mantenimiento y posible necesidad de repetir o combinar tratamientos.\n\nAlternativas: no tratar, ortodoncia, restauraciones indirectas/directas o tratamiento periodontal.\n\nFirma: entiendo las limitaciones biológicas y estéticas y acepto el plan."},
  {id:7,title:"Consentimiento periodontal",version:2,active:true,signers:['Paciente','Profesional'],text:"CONSENTIMIENTO PERIODONTAL\n\nDiagnóstico y objetivo: tratar gingivitis o periodontitis mediante higiene, raspado y alisado radicular, cirugía periodontal o mantenimiento.\n\nBeneficios: reducir inflamación, sangrado, profundidad de bolsas y riesgo de pérdida dentaria.\n\nRiesgos: sensibilidad, molestias, recesión gingival visible, movilidad transitoria, sangrado y necesidad de mantenimiento periódico.\n\nAlternativas: no tratar, higiene básica, tratamiento por fases, cirugía o derivación periodontal.\n\nFirma: comprendo que el éxito depende de higiene diaria, control de placa, tabaco, revisiones y mantenimiento."}
]);
const DEFAULT_PROCEDURES = Object.freeze([
  {id:1,category:'Prótesis',name:'Corona sobre diente natural',color:'#2F80ED',icon:'◉',duration:60,price:0,unit:'unidad',consent:'Consentimiento protésico'},
  {id:2,category:'Prótesis',name:'Puente sobre dientes naturales',color:'#8E5AD7',icon:'▰',duration:75,price:0,unit:'unidad protésica',consent:'Consentimiento protésico'},
  {id:3,category:'Prótesis',name:'Corona sobre implante',color:'#27AE60',icon:'⌁',duration:40,price:400,unit:'corona',consent:'Consentimiento protésico'},
  {id:4,category:'Prótesis',name:'Prótesis provisional',color:'#8D6E63',icon:'P',duration:45,price:0,unit:'unidad',consent:'Consentimiento protésico'},
  {id:5,category:'Prótesis',name:'Prótesis completa',color:'#BB6BD9',icon:'⌒',duration:45,price:0,unit:'arcada',consent:'Consentimiento protésico'},
  {id:6,category:'Prótesis',name:'Prótesis parcial / Flexite',color:'#56A9D8',icon:'◡',duration:45,price:0,unit:'prótesis',consent:'Consentimiento protésico'},
  {id:7,category:'Ortodoncia',name:'Alineadores',color:'#13A7A0',icon:'≋',duration:40,price:0,unit:'caso',consent:'Consentimiento ortodóncico'},
  {id:8,category:'Ortodoncia',name:'Retenedor',color:'#4C8BC4',icon:'⌁',duration:30,price:0,unit:'aparato',consent:'Consentimiento ortodóncico'},
  {id:9,category:'Odontopediatría',name:'Mantenedor de espacio',color:'#F2994A',icon:'M',duration:35,price:0,unit:'aparato',consent:'Consentimiento odontopediátrico'},
  {id:10,category:'Odontopediatría',name:'Aparato interceptivo',color:'#E86B8A',icon:'A',duration:40,price:0,unit:'aparato',consent:'Consentimiento odontopediátrico'},
  {id:11,category:'Cirugía',name:'Guía quirúrgica',color:'#D9544D',icon:'G',duration:30,price:150,unit:'guía',consent:'Consentimiento cirugía de implantes'},
  {id:12,category:'Cirugía',name:'Guía de reducción',color:'#B84A68',icon:'R',duration:30,price:0,unit:'guía',consent:'Consentimiento quirúrgico'},
  {id:13,category:'Estética',name:'Mock-up / wax-up',color:'#C99A2E',icon:'W',duration:40,price:0,unit:'caso',consent:'Consentimiento estético'},
  {id:30,category:'Implantología',name:'Mantenimiento implante',color:'#27AE60',icon:'MI',duration:30,price:50,unit:'sesión',consent:'Consentimiento cirugía de implantes'},
  {id:31,category:'Digital',name:'Escaneado intraoral',color:'#13A7A0',icon:'SCAN',duration:20,price:0,unit:'escaneo',consent:''},
  {id:32,category:'Implantología',name:'Planificación implantológica digital',color:'#27AE60',icon:'PLAN',duration:20,price:0,unit:'caso',consent:'Consentimiento cirugía de implantes'},
  {id:33,category:'Implantología',name:'Multi-Unit recto / angulado',color:'#27AE60',icon:'MU',duration:10,price:100,unit:'ud.',consent:''},
  {id:34,category:'Implantología',name:'Ti-base',color:'#27AE60',icon:'TB',duration:10,price:100,unit:'ud.',consent:''},
  {id:35,category:'Implantología',name:'Smart Ti-base',color:'#27AE60',icon:'STB',duration:10,price:100,unit:'ud.',consent:''},
  {id:36,category:'Implantología',name:'Pilar directo a implante',color:'#27AE60',icon:'PI',duration:10,price:100,unit:'ud.',consent:''},
  {id:37,category:'Implantología',name:'Pilar angulado',color:'#27AE60',icon:'PA',duration:10,price:150,unit:'ud.',consent:''},
  {id:38,category:'Implantología',name:'Pilar personalizado mecanizado',color:'#27AE60',icon:'PP',duration:10,price:150,unit:'ud.',consent:''},
  {id:39,category:'Prótesis sobre implantes',name:'Tornillo protésico',color:'#27AE60',icon:'T',duration:5,price:25,unit:'ud.',consent:''},
  {id:40,category:'Prótesis sobre implantes',name:'Corona provisional sobre implante',color:'#8D6E63',icon:'PROV',duration:30,price:100,unit:'corona',consent:'Consentimiento protésico'},
  {id:41,category:'Prótesis sobre implantes',name:'Essix provisional implantológico',color:'#56A9D8',icon:'E',duration:20,price:150,unit:'aparato',consent:'Consentimiento protésico'},
  {id:42,category:'Prótesis sobre implantes',name:'Corona definitiva sobre implante',color:'#27AE60',icon:'CI',duration:40,price:400,unit:'corona',consent:'Consentimiento protésico'},
  {id:43,category:'Prótesis sobre implantes',name:'Puente implantosoportado',color:'#27AE60',icon:'PIS',duration:50,price:350,unit:'unidad protésica',consent:'Consentimiento protésico'},
  {id:44,category:'Prótesis sobre implantes',name:'Rehabilitación FP1',color:'#27AE60',icon:'FP1',duration:60,price:350,unit:'unidad protésica',consent:'Consentimiento protésico'},
  {id:45,category:'Prótesis sobre implantes',name:'Rehabilitación FP2',color:'#27AE60',icon:'FP2',duration:60,price:400,unit:'unidad protésica',consent:'Consentimiento protésico'},
  {id:46,category:'Prótesis sobre implantes',name:'Rehabilitación FP3',color:'#27AE60',icon:'FP3',duration:60,price:450,unit:'unidad protésica',consent:'Consentimiento protésico'},
  {id:47,category:'Prótesis sobre implantes',name:'Prótesis híbrida fija',color:'#BB6BD9',icon:'H',duration:60,price:1500,unit:'arcada-tramo',consent:'Consentimiento protésico'},
  {id:48,category:'Prótesis sobre implantes',name:'Estructura híbrida sobre implantes',color:'#BB6BD9',icon:'EH',duration:60,price:1000,unit:'estructura',consent:'Consentimiento protésico'},
  {id:49,category:'Prótesis sobre implantes',name:'Provisional PMMA implantosoportado',color:'#8D6E63',icon:'PMMA',duration:45,price:700,unit:'arcada-tramo',consent:'Consentimiento protésico'},
  {id:50,category:'Laboratorio',name:'Prótesis / estructura de zirconio',color:'#C99A2E',icon:'Zr',duration:0,price:200,unit:'unidad protésica',consent:''},
  {id:51,category:'Laboratorio',name:'Cerámica protésica',color:'#C99A2E',icon:'Ce',duration:0,price:200,unit:'unidad protésica',consent:''},
  {id:52,category:'Barras',name:'Barra Ackermann',color:'#7C6EE6',icon:'BA',duration:0,price:400,unit:'barra',consent:'Consentimiento protésico'},
  {id:53,category:'Barras',name:'Barra fresada personalizada',color:'#7C6EE6',icon:'BF',duration:0,price:900,unit:'barra',consent:'Consentimiento protésico'},
  {id:54,category:'Barras',name:'Diseño de barra Blender / iBar',color:'#7C6EE6',icon:'iB',duration:0,price:100,unit:'diseño',consent:''},
  {id:55,category:'Barras',name:'Mecanizado / fresado de barra',color:'#7C6EE6',icon:'F',duration:0,price:500,unit:'barra',consent:''},
  {id:56,category:'Barras',name:'Conexión barra-implante',color:'#7C6EE6',icon:'C',duration:0,price:150,unit:'conexión',consent:''},
  {id:57,category:'Barras',name:'Tramo de barra',color:'#7C6EE6',icon:'TR',duration:0,price:300,unit:'tramo',consent:''},
  {id:58,category:'Barras',name:'Extensión / cantilever de barra',color:'#7C6EE6',icon:'EX',duration:0,price:150,unit:'extensión',consent:''},
  {id:59,category:'Barras',name:'Clip / retención de barra',color:'#7C6EE6',icon:'CL',duration:0,price:50,unit:'ud.',consent:''},
  {id:60,category:'Locator',name:'Sobredentadura Locator',color:'#56A9D8',icon:'LOC',duration:45,price:600,unit:'prótesis',consent:'Consentimiento protésico'},
  {id:61,category:'Locator',name:'Pilar Locator',color:'#56A9D8',icon:'PL',duration:10,price:220,unit:'ud.',consent:''},
  {id:62,category:'Locator',name:'Retención / matriz Locator',color:'#56A9D8',icon:'RL',duration:10,price:50,unit:'ud.',consent:''},
  {id:63,category:'Regeneración',name:'Hueso autólogo',color:'#D9544D',icon:'HA',duration:0,price:250,unit:'unidad',consent:'Consentimiento quirúrgico'},
  {id:64,category:'Regeneración',name:'Xenoinjerto',color:'#D9544D',icon:'XG',duration:0,price:180,unit:'unidad',consent:'Consentimiento quirúrgico'},
  {id:65,category:'Regeneración',name:'Aloinjerto',color:'#D9544D',icon:'AG',duration:0,price:265,unit:'unidad',consent:'Consentimiento quirúrgico'},
  {id:66,category:'Regeneración',name:'Membrana reabsorbible',color:'#D9544D',icon:'MB',duration:0,price:225,unit:'unidad',consent:'Consentimiento quirúrgico'},
  {id:67,category:'Seno maxilar',name:'Elevación de seno crestal',color:'#B84A68',icon:'SC',duration:45,price:250,unit:'seno',consent:'Consentimiento quirúrgico'},
  {id:68,category:'Seno maxilar',name:'Elevación de seno lateral',color:'#B84A68',icon:'SL',duration:60,price:400,unit:'seno',consent:'Consentimiento quirúrgico'}
]);

function clone(o){ return JSON.parse(JSON.stringify(o)); }
function normalizeText(t){ return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[,.!?¿¡:;]/g,' ').replace(/\s+/g,' ').trim(); }
function stripWake(t){ return normalizeText(t).replace(/^\s*(oye\s+)?dent[yi]\s+/, '').replace(/^\s*oye\s+/, '').trim(); }
function stripWakeRaw(t){ return String(t||'').trim().replace(/^\s*(oye\s+)?dent[yií]\s*,?\s+/i, '').replace(/^\s*oye\s+/i, '').trim(); }
function titleCase(s){ return String(s||'').trim().split(/\s+/).filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' '); }
function today(){ return new Date().toISOString().slice(0,10); }
function weekdayFromDate(date){ const d = new Date(String(date||today())+'T12:00:00'); return (d.getDay()+6)%7; }
function weekdayName(n){ return ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][Number(n)] || '?'; }
function shortWeekdayName(n){ return ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][Number(n)] || '?'; }
function prettyDate(date=today()){ const d = new Date(date+'T12:00:00'); return d.toLocaleDateString('es-ES',{weekday:'long', day:'numeric', month:'long', year:'numeric'}); }
function patientFullName(p){ return `${p?.first_name||''} ${p?.last_name||''}`.trim() || 'Sin nombre'; }
function initials(p){ const name=patientFullName(p); return name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase() || 'P'; }

function defaultDb(){
  const procedures = clone(DEFAULT_PROCEDURES).map(p=>({...p,active:p.active!==false}));
  const consents = clone(DEFAULT_CONSENTS);
  const employees = clone(DEFAULT_EMPLOYEES);
  const sites = clone(DEFAULT_SITES);
  const shifts = clone(DEFAULT_SHIFTS);
  const labs = clone(DEFAULT_LABS);
  const maxId = Math.max(0,...[...procedures,...consents,...employees,...sites,...shifts,...labs].map(x=>Number(x.id)||0));
  return {
    version:'1.3.3',
    nextId: Math.max(200, maxId+1),
    patients: [],
    users: [
      {id:11,name:'Administrador clinico',role:'admin',active:true,pin_required:true},
      {id:12,name:'Odontologo',role:'dentist',active:true,pin_required:false},
      {id:13,name:'Recepcion',role:'reception',active:true,pin_required:false}
    ],
    rolePermissions: {
      admin:['pacientes','agenda','clinica','finanzas','ajustes','copias'],
      dentist:['pacientes','agenda','clinica','documentos'],
      reception:['pacientes','agenda','cobros_basicos']
    },
    currentUser:{id:11,role:'admin',name:'Administrador clinico'},
    security:{admin_pin_hash:'1234-preview', pin_enabled:true},
    cabinets:[
      {id:1,name:'Gabinete 1',active:true,site_id:1},
      {id:2,name:'Gabinete 2',active:true,site_id:1},
      {id:3,name:'Gabinete cirugia',active:true,site_id:2}
    ],
    odontograms: {},
    appointments: [],
    treatmentPlans: [],
    employees,
    doctors: employees.filter(e=>String(e.role||'').includes('odont')).map(e=>({id:e.doctor_id||e.id,name:e.name,color:e.color,active:e.active,site_id:e.site_id})),
    sites,
    shifts,
    absences: [],
    works: [],
    labs,
    budgets: [],
    payments: [],
    documents: [],
    consent_history: [],
    consents,
    procedures,
    clinicalAlerts: [],
    comments: [],
    files: [],
    tasks: [],
    auditLog: [],
    templates: [
      {id:101,title:'Primera visita',category:'Diagnóstico',text:'Motivo de consulta:\nExploración clínica:\nPruebas complementarias:\nDiagnóstico:\nPlan recomendado:'},
      {id:102,title:'Mantenimiento periodontal',category:'Periodoncia',text:'Control periodontal. Índices, sangrado, movilidad, bolsas, refuerzo de higiene y próxima revisión.'},
      {id:103,title:'Rehabilitación implantológica',category:'Implantes',text:'Planificación implantológica con CBCT, escaneado, provisionalización, componentes y presupuesto por fases.'},
      {id:104,title:'Arcada completa ausente',category:'Odontograma',text:'Arcada marcada como ausente. Valorar soporte labial, dimensión vertical, antagonista y rehabilitación fija/removible.'},
      {id:105,title:'Frente estético anterior',category:'Estética',text:'Análisis de sonrisa, color, proporciones, línea media, encía, fotografías y expectativas.'},
      {id:106,title:'Revisión protésica',category:'Prótesis',text:'Revisión de ajuste, oclusión, retención, puntos de presión, higiene y reparaciones necesarias.'}
    ],
    settings:{
      clinic:'Centro Dental Funcional',
      clinicProfile:{name:'Centro Dental Funcional',legal_name:'',tax_id:'',phone:'600 891 594',email:'',address:'',website:'',default_site_id:1},
      appearance:'light',
      density:'comfortable',
      slotMinutes:20,
      safeDelete:true,
      agenda:{day_start:'09:00',day_end:'20:00',default_duration:40},
      server:{name:'PC clínica',base_url:'http://127.0.0.1:8765',sqlite_path:'denty.sqlite',enabled:true},
      sync:{enabled:false,mode:'manual',auto_minutes:15},
      mcp:{enabled:false,path:'/api/mcp/interpret'},
      backup:{retention:12},
      payments:{provider:'server',currency:'EUR',default_reader_id:'',reader_by_site:{}},
      voice:{enabled:true, continuous:false, readback:true, ai_mode:'auto',ai_path:'/api/ai/interpret'}
    }
  };
}


function migrateDb(input){
  const base = defaultDb();
  const db = {...base, ...(input||{})};
  db.version='1.3.3';
  for (const key of ['patients','users','cabinets','appointments','treatmentPlans','employees','doctors','sites','shifts','absences','works','labs','budgets','payments','documents','consent_history','consents','procedures','clinicalAlerts','comments','files','tasks','templates','auditLog']) {
    if(!Array.isArray(db[key])) db[key]=clone(base[key]||[]);
  }
  db.rolePermissions = {...base.rolePermissions, ...(db.rolePermissions||{})};
  db.security = {...base.security, ...(db.security||{})};
  db.currentUser = {...base.currentUser, ...(db.currentUser||{})};
  const incomingSettings=db.settings||{};
  const legacyClinicName=typeof incomingSettings.clinic==='string'&&incomingSettings.clinic.trim()?incomingSettings.clinic.trim():base.settings.clinicProfile.name;
  db.settings = {
    ...base.settings,
    ...incomingSettings,
    clinicProfile:{...base.settings.clinicProfile, name:legacyClinicName, ...(incomingSettings.clinicProfile||{})},
    agenda:{...base.settings.agenda, ...(incomingSettings.agenda||{})},
    server:{...base.settings.server, ...(incomingSettings.server||{})},
    sync:{...base.settings.sync, ...(incomingSettings.sync||{})},
    mcp:{...base.settings.mcp, ...(incomingSettings.mcp||{})},
    backup:{...base.settings.backup, ...(incomingSettings.backup||{})},
    payments:{...base.settings.payments, ...(incomingSettings.payments||{}), reader_by_site:{...base.settings.payments.reader_by_site,...((incomingSettings.payments||{}).reader_by_site||{})}},
    voice:{...base.settings.voice, ...(incomingSettings.voice||{})}
  };
  db.settings.clinic=db.settings.clinicProfile.name;
  db.odontograms = db.odontograms || {};
  db.patients = db.patients.map(p => ({
    id: p.id, ficha: p.ficha || p.historia || '', first_name: p.first_name || p.firstName || p.nombre || '', last_name: p.last_name || p.lastName || p.apellidos || '', dni:p.dni||'', phone:p.phone||p.telefono||'', email:p.email||'', birth_date:p.birth_date||p.birthDate||'', archived:!!p.archived, created_at:p.created_at||p.createdAt||new Date().toISOString()
  })).filter(p=>p.id!=null);
  db.appointments = db.appointments.map(a => ({
    id:a.id, patient_id:Number(a.patient_id||a.patientId||0), employee_id:Number(a.employee_id||a.doctorId||1), cabinet_id:Number(a.cabinet_id||1), chain_id:a.chain_id||'', date:a.date||today(), start_time:a.start_time||a.time||'10:00', end_time:a.end_time||addMinutes(a.time||'10:00', Number(a.duration||40)), duration_minutes:Number(a.duration_minutes||a.duration||durationMinutes(a.start_time||a.time||'10:00', a.end_time||addMinutes(a.time||'10:00', Number(a.duration||40)))), status:a.status||'programada', title:a.title||'Cita dental', site:a.site||'', confirmed:!!(a.confirmed||a.status==='confirmada'), availability_status:a.availability_status||a.availability724?.level||'ok', availability_message:a.availability_message||''
  })).filter(a=>a.id!=null);
  db.employees = seedByName(db.employees.map((e,i)=>({
    id:e.id??(i+1), name:e.name||e.title||'Empleado', role:e.role||'odontólogo', doctor_id:e.doctor_id??e.doctorId??null, site:e.site||base.sites.find(s=>Number(s.id)===Number(e.site_id))?.name||'Sin sede', site_id:e.site_id??null, phone:e.phone||'', email:e.email||'', active:e.active!==false, color:e.color||DOCTOR_COLORS[i%DOCTOR_COLORS.length]
  })), base.employees);
  db.sites = seedByName(db.sites.map((s,i)=>({id:s.id??(i+1), name:s.name||s.title||'Sede', active:s.active!==false, address:s.address||s.name||'', phone:s.phone||'', email:s.email||''})), base.sites);
  db.cabinets = db.cabinets.map((c,i)=>({id:c.id??(i+1),name:c.name||`Gabinete ${i+1}`,active:c.active!==false,site_id:Number(c.site_id||db.sites[0]?.id||1)}));
  db.labs = seedByName(db.labs.map((l,i)=>({id:l.id??(i+1),name:l.name||'Laboratorio',contact:l.contact||'',phone:l.phone||'',email:l.email||'',notes:l.notes||'',active:l.active!==false})), base.labs);
  db.shifts = seedShifts(db.shifts, base.shifts);
  db.consents = seedByName(db.consents.map((c,i)=>({id:c.id??(i+1), title:c.title||c.name||'Consentimiento', version:c.version||1, active:c.active!==false, signers:c.signers||['Paciente'], text:(Number(c.version||1)<2?'':c.text)||''})), base.consents);
  db.procedures = seedByName(db.procedures.map((pr,i)=>({id:pr.id??(i+1), category:pr.category||'Otro', name:pr.name||pr.title||'Tratamiento', color:pr.color||'#607D8B', icon:pr.icon||'◉', duration:Number(pr.duration||0), price:Number(pr.price||0), unit:pr.unit||'unidad', consent:pr.consent||'', active:pr.active!==false})), base.procedures);
  db.works = db.works.map(w=>({ ...w, lab_id:w.lab_id??(db.labs.find(l=>normalizeText(l.name)===normalizeText(w.lab))?.id||null) }));
  db.payments = db.payments.map(p=>({
    ...p,
    amount:Number(p.amount||0),
    currency:p.currency||db.settings.payments.currency||'EUR',
    status:p.status||'paid',
    provider:p.provider||((p.method==='tarjeta')?'legacy_manual':'manual'),
    reader_id:p.reader_id||'', checkout_id:p.checkout_id||'', client_transaction_id:p.client_transaction_id||'',
    site_id:p.site_id??null, completed_at:p.completed_at||(p.status&&p.status!=='paid'?'':p.created_at||''), failure_reason:p.failure_reason||''
  }));
  db.doctors = db.employees.filter(e=>String(e.role||'').includes('odont')).map(e=>({id:e.doctor_id||e.id,name:e.name,color:e.color,active:e.active,site_id:e.site_id}));
  const maxId = Math.max(0,...['patients','appointments','treatmentPlans','employees','doctors','sites','shifts','absences','works','labs','budgets','payments','documents','clinicalAlerts','comments','files','tasks','templates','procedures','consents','users','cabinets'].flatMap(k => (db[k]||[]).map(x=>Number(x.id)||0)));
  db.nextId = Math.max(Number(db.nextId||1), maxId+1);
  return db;
}

function catalogKey(x){ return normalizeText(x?.name || x?.title || ''); }
function seedByName(existing, defaults){
  const out = clone(existing||[]);
  let next = Math.max(0,...out.map(x=>Number(x.id)||0),...defaults.map(x=>Number(x.id)||0))+1;
  const have = new Set(out.map(catalogKey));
  for(const item of defaults){
    const key = catalogKey(item);
    if(!key || have.has(key)) continue;
    const copy = clone(item);
    if(out.some(x=>Number(x.id)===Number(copy.id))) copy.id = next++;
    out.push(copy); have.add(key);
  }
  return out;
}
function shiftKey(s){ return [s.employee_id,s.weekday,s.start_time,s.end_time].join('|'); }
function seedShifts(existing, defaults){
  const out = clone(existing||[]);
  let next = Math.max(0,...out.map(x=>Number(x.id)||0),...defaults.map(x=>Number(x.id)||0))+1;
  const have = new Set(out.map(shiftKey));
  for(const item of defaults){
    const key=shiftKey(item); if(have.has(key)) continue;
    const copy=clone(item); if(out.some(x=>Number(x.id)===Number(copy.id))) copy.id=next++;
    out.push(copy); have.add(key);
  }
  return out;
}


function loadDb(storage){
  if(!storage) return defaultDb();
  try{
    const raw = storage.getItem(DB_KEY);
    if(raw) return migrateDb(JSON.parse(raw));
    for (const key of PREVIOUS_KEYS){
      const old = storage.getItem(key);
      if(old) return migrateDb(JSON.parse(old));
    }
  }catch(e){ console.warn('No se pudo leer la base local', e); }
  return defaultDb();
}
function saveDb(db, storage){ return safeSaveDb(db, storage, 'saveDb'); }
function id(db){ db.nextId = Number(db.nextId||1); return db.nextId++; }

function createPatient(db, payload){
  const first = titleCase(payload.first_name || payload.firstName || payload.nombre || '');
  const last = titleCase(payload.last_name || payload.lastName || payload.apellidos || '');
  if(!first) throw new Error('Falta el nombre del paciente');
  const p = {id:id(db), ficha:String(payload.ficha||payload.historia||'').trim(), first_name:first, last_name:last, dni:String(payload.dni||'').trim(), phone:String(payload.phone||payload.telefono||'').trim(), email:String(payload.email||'').trim(), birth_date:String(payload.birth_date||payload.birthDate||'').trim(), archived:false, created_at:new Date().toISOString()};
  db.patients.push(p); ensureOdontogram(db, p.id); return p;
}
function archivePatient(db, patientId){ const p=db.patients.find(x=>Number(x.id)===Number(patientId)); if(!p) throw new Error('Paciente no encontrado'); p.archived=true; p.archived_at=new Date().toISOString(); return p; }
function restorePatient(db, patientId){ const p=db.patients.find(x=>Number(x.id)===Number(patientId)); if(!p) throw new Error('Paciente no encontrado'); p.archived=false; p.restored_at=new Date().toISOString(); return p; }

function defaultPerioFlags(){ return {mv:false,v:false,dv:false,ml:false,lp:false,dl:false}; }
function defaultPerioBlock(){ return {depths:{mv:'',v:'',dv:'',ml:'',lp:'',dl:''}, recession:{mv:'',v:'',dv:'',ml:'',lp:'',dl:''}, bleeding:defaultPerioFlags(), suppuration:defaultPerioFlags(), plaque:defaultPerioFlags(), furcation:'0', mobility:'0'}; }
function defaultPositionBlock(){ return {mesialization:false, distalization:false, extrusion:false, intrusion:false, rotation:false, vestibuloversion:false, linguoversion:false, recessionVisible:false, mobility:'0'}; }
function defaultToothRecord(){ return {status:'healthy', surfaces:{}, periodontal:defaultPerioBlock(), position:defaultPositionBlock()}; }
function ensureOdontogram(db, patientId){
  const key = String(patientId||'demo');
  if(!db.odontograms) db.odontograms={};
  if(!db.odontograms[key]) db.odontograms[key] = Object.fromEntries(FDI_ALL.map(t => [t, defaultToothRecord()]));
  for(const t of FDI_ALL){
    if(typeof db.odontograms[key][t] === 'string') db.odontograms[key][t] = {status:db.odontograms[key][t], surfaces:{}};
    if(!db.odontograms[key][t]) db.odontograms[key][t] = defaultToothRecord();
    if(!db.odontograms[key][t].surfaces) db.odontograms[key][t].surfaces = {};
    if(!db.odontograms[key][t].periodontal) db.odontograms[key][t].periodontal = defaultPerioBlock();
    if(!db.odontograms[key][t].periodontal.depths) db.odontograms[key][t].periodontal.depths = {mv:'',v:'',dv:'',ml:'',lp:'',dl:''};
    if(!db.odontograms[key][t].periodontal.recession) db.odontograms[key][t].periodontal.recession = {mv:'',v:'',dv:'',ml:'',lp:'',dl:''};
    for(const site of PERIO_SITES){
      if(!(site in db.odontograms[key][t].periodontal.depths)) db.odontograms[key][t].periodontal.depths[site]='';
      if(!(site in db.odontograms[key][t].periodontal.recession)) db.odontograms[key][t].periodontal.recession[site]='';
    }
    for(const group of ['bleeding','suppuration','plaque']){
      if(!db.odontograms[key][t].periodontal[group]) db.odontograms[key][t].periodontal[group] = defaultPerioFlags();
      for(const site of PERIO_SITES) db.odontograms[key][t].periodontal[group][site]=!!db.odontograms[key][t].periodontal[group][site];
    }
    if(db.odontograms[key][t].periodontal.furcation == null) db.odontograms[key][t].periodontal.furcation = '0';
    if(db.odontograms[key][t].periodontal.mobility == null) db.odontograms[key][t].periodontal.mobility = '0';
    if(!db.odontograms[key][t].position) db.odontograms[key][t].position = defaultPositionBlock();
    for(const flag of ['mesialization','distalization','extrusion','intrusion','rotation','vestibuloversion','linguoversion','recessionVisible']) db.odontograms[key][t].position[flag] = !!db.odontograms[key][t].position[flag];
    if(db.odontograms[key][t].position.mobility == null) db.odontograms[key][t].position.mobility = '0';
  }
  return db.odontograms[key];
}
function odontogramToothKind(tooth){
  const n=Number(String(tooth).slice(1));
  if([1,2].includes(n)) return 'incisor';
  if(n===3) return 'canine';
  if([4,5].includes(n)) return 'premolar';
  return 'molar';
}
function occlusalSurfaceForTooth(tooth){ return ['incisor','canine'].includes(odontogramToothKind(tooth)) ? 'I' : 'O'; }
function normalizeSurfaceForTooth(tooth, surface){
  const s=String(surface||'').toUpperCase();
  if(s==='P' || s==='L') return 'P';
  if(s==='O' || s==='I') return occlusalSurfaceForTooth(tooth);
  return SURFACES.includes(s) ? s : '';
}
function legendVariant(base, index=0){ const cycle=ODONTO_LEGEND_CYCLES[base]; return cycle ? cycle[((Number(index)||0)%cycle.length+cycle.length)%cycle.length] : base; }
function legendLabel(base, index=0){ const code=legendVariant(base,index); return STATUS_LABELS[code] || ODONTO_LEGEND_BASE_LABELS[base] || base; }
function legendStateText(base,index=0){ const arr=ODONTO_LEGEND_STATE_LABELS[base]; if(arr) return arr[((Number(index)||0)%arr.length+arr.length)%arr.length]; if(base==='caries') return 'Patología'; if(base==='healthy') return 'Sano final'; if(base==='missing') return 'Ausente'; if(base==='extraction') return 'Indicado'; return ''; }
function legendNextIndex(base,index=0){ const arr=ODONTO_LEGEND_CYCLES[base]; return arr ? (((Number(index)||0)+1) % arr.length) : 0; }
function statusTone(code){
  if(code==='healthy') return 'green';
  if(code==='missing') return 'missing';
  if(code==='caries' || code==='extraction' || String(code).endsWith('_pending') || String(code).endsWith('_indicated')) return 'red';
  if(String(code).endsWith('_bad') || code==='implant_review') return 'blue-red';
  return 'blue';
}
function setToothLegendState(db, patientId, tooth, code, surface=''){
  const t=String(tooth);
  const od=ensureOdontogram(db, patientId);
  if(!FDI_ALL.includes(t)) throw new Error('Diente FDI no válido');
  if(SURFACE_CODES.has(code)){
    const s=normalizeSurfaceForTooth(t, surface || (code==='caries' || code.startsWith('filling') ? occlusalSurfaceForTooth(t) : ''));
    if(!s) throw new Error('Superficie no válida');
    od[t].surfaces[s]=code;
    if(od[t].status==='missing') od[t].status='healthy';
    return od[t];
  }
  if(WHOLE_TOOTH_CODES.has(code)){
    od[t].status=code;
    if(code==='missing') od[t].surfaces={};
    return od[t];
  }
  throw new Error('Estado odontológico no válido');
}
function clearToothSurface(db, patientId, tooth, surface){
  const t=String(tooth), s=normalizeSurfaceForTooth(t, surface);
  const od=ensureOdontogram(db, patientId);
  if(od[t] && s) delete od[t].surfaces[s];
  return od[t];
}

function toothStatusNext(current){ return STATUS_ORDER[(STATUS_ORDER.indexOf(current)+1) % STATUS_ORDER.length] || 'healthy'; }
function setToothPrimaryState(db, patientId, tooth, status){ if(!FDI_ALL.includes(String(tooth))) throw new Error('Diente FDI no válido'); const od=ensureOdontogram(db,patientId); od[String(tooth)].status=status; return od[String(tooth)]; }
function setToothSurfaceState(db, patientId, tooth, surface, status){ if(!FDI_ALL.includes(String(tooth))) throw new Error('Diente FDI no válido'); const s=normalizeSurfaceForTooth(tooth, surface); if(!s) throw new Error('Superficie no válida'); const od=ensureOdontogram(db, patientId); od[String(tooth)].surfaces[s]=status; return od[String(tooth)]; }
function markArcadeMissing(db, patientId, arcade){ const arr=arcade==='superior'?FDI_UPPER:FDI_LOWER; const od=ensureOdontogram(db, patientId); arr.forEach(t=>{ od[t].status='missing'; od[t].surfaces={}; }); return arr; }

function splitName(full){
  const parts = titleCase(full).split(/\s+/).filter(Boolean);
  if(parts.length <= 1) return {first_name: parts[0] || '', last_name: ''};
  return {first_name: parts[0], last_name: parts.slice(1).join(' ')};
}
function parsePatientName(text){
  let n = stripWakeRaw(text);
  n = n.replace(/^que\s+era\s+(?:un|una)\s+paciente\s+/i, 'crea un paciente ');
  n = n.replace(/^que\s+era\s+/i, 'crea ');
  n = n.replace(/^quer[ií]a\s+(?:un|una)?\s*paciente\s+/i, 'crea un paciente ');
  n = n.replace(/^crear\s+/i, 'crea ');
  const patterns = [
    /(?:crea|crear|nuevo|nueva|abre|registra|alta)\s+(?:un\s+|una\s+)?(?:paciente|ficha)(?:\s+nueva)?(?:\s+que\s+se\s+llama|\s+llamado|\s+llamada|\s+con\s+nombre|\s+para)?\s+(.+)$/i,
    /(?:paciente|ficha)\s+(?:nuevo|nueva)?\s*(.+)$/i
  ];
  for(const re of patterns){ const m=n.match(re); if(m&&m[1]) return m[1].replace(/^(que\s+se\s+llama|se\s+llama|llamado|llamada)\s+/i,'').trim(); }
  return '';
}
function expandFdiRange(a,b){ for(const seq of [FDI_UPPER, FDI_LOWER]){ const ia=seq.indexOf(String(a)), ib=seq.indexOf(String(b)); if(ia!==-1&&ib!==-1){ const [lo,hi]=ia<ib?[ia,ib]:[ib,ia]; const slice=seq.slice(lo,hi+1); return ia<=ib?slice:slice.reverse(); } } return null; }
function parseFdiRange(text){ const m=normalizeText(text).match(/\b(\d{2})\s*(?:hasta|a|al|entre|-|–)\s*(?:el\s+)?(\d{2})\b/); return m?expandFdiRange(m[1],m[2]):null; }

function minutes(time){ const [h,m]=String(time||'00:00').split(':').map(Number); return (h||0)*60+(m||0); }
function minutesToTime(n){ const h=Math.floor(n/60), m=n%60; return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }
function durationMinutes(start,end){ return Math.max(0, minutes(end)-minutes(start)); }
function addMinutes(start,n){ return minutesToTime(minutes(start)+Number(n||0)); }
function overlaps(a,b){ return a.date===b.date && Number(a.employee_id)===Number(b.employee_id) && minutes(a.start_time)<minutes(b.end_time) && minutes(a.end_time)>minutes(b.start_time); }
function appointmentWithMeta(db,a){ const p=db.patients.find(x=>Number(x.id)===Number(a.patient_id)); const emp=db.employees.find(x=>Number(x.id)===Number(a.employee_id)); const start=a.start_time||'10:00'; const end=a.end_time||addMinutes(start, Number(a.duration_minutes||40)); return {...a,start_time:start,end_time:end,duration_minutes:durationMinutes(start,end)||Number(a.duration_minutes||40), patient:p||null, employee:emp||null}; }
function appointmentsForDate(db,date){ return db.appointments.filter(a=>a.date===date).map(a=>appointmentWithMeta(db,a)).sort((a,b)=>(a.start_time+a.end_time).localeCompare(b.start_time+b.end_time)); }
function countOverlaps(db,date){ const aps=appointmentsForDate(db,date); let n=0; for(let i=0;i<aps.length;i++) for(let j=i+1;j<aps.length;j++) if(overlaps(aps[i],aps[j])) n++; return n; }
function cabinetConflict(db, appt){
  const cabinetId=Number(appt.cabinet_id||1);
  if(!cabinetId) return null;
  const start=appt.start_time||'10:00', end=appt.end_time||addMinutes(start, appt.duration_minutes||40);
  return db.appointments.find(a=>Number(a.cabinet_id||1)===cabinetId&&a.date===appt.date&&String(a.id)!==String(appt.id)&&minutes(start)<minutes(a.end_time||addMinutes(a.start_time,40))&&minutes(end)>minutes(a.start_time||'10:00'))||null;
}
function agendaCounters(db,date){ const aps=appointmentsForDate(db,date); return {total:aps.length, confirmed:aps.filter(a=>a.confirmed||a.status==='confirmada').length, waiting:aps.filter(a=>a.status==='espera').length, overlaps:countOverlaps(db,date), cabinetConflicts:aps.filter(a=>cabinetConflict(db,a)).length, conflicts:aps.filter(a=>a.availability_status&&a.availability_status!=='ok').length}; }
function agendaByDoctors(db,date){ return db.employees.filter(e=>e.active!==false).map(emp => ({employee:emp, shifts:employeeShiftsForDate(db, emp.id, date), absences:employeeAbsencesForDate(db, emp.id, date), appointments:appointmentsForDate(db,date).filter(a=>Number(a.employee_id)===Number(emp.id))})); }
function agendaByHours(db,date,{start='09:00',end='20:00',step=20}={}){ const slots=[]; for(let t=minutes(start); t<minutes(end); t+=step) slots.push({time:minutesToTime(t)}); return {date, step, columns:agendaByDoctors(db,date), slots}; }
function employeeShiftsForDate(db,employeeId,date){ const w=weekdayFromDate(date); return db.shifts.filter(s=>Number(s.employee_id)===Number(employeeId)&&Number(s.weekday)===w).sort((a,b)=>a.start_time.localeCompare(b.start_time)); }
function employeeAbsencesForDate(db,employeeId,date){ return db.absences.filter(a=>Number(a.employee_id)===Number(employeeId)&&!a.cancelled&&date>=a.start_date&&date<=(a.end_date||a.start_date)); }
function appointmentAvailability(db, appt){
  const emp = db.employees.find(e=>String(e.id)===String(appt.employee_id));
  if(!emp) return {status:'warn', message:'Empleado no encontrado o no seleccionado'};
  const start=appt.start_time||'10:00', end=appt.end_time||addMinutes(start, appt.duration_minutes||40);
  const shifts=employeeShiftsForDate(db, emp.id, appt.date);
  const insideShift = shifts.some(s => start>=s.start_time && end<=s.end_time);
  const abs = employeeAbsencesForDate(db, emp.id, appt.date).find(a => (!a.start_time || (start < (a.end_time||'23:59') && end > (a.start_time||'00:00'))));
  if(abs) return {status:'conflict', message:`Conflicto: ${emp.name} tiene ${abs.type}`};
  if(!insideShift) return {status:'warn', message:`${emp.name} está fuera de turno`};
  const existing=db.appointments.filter(a=>Number(a.employee_id)===Number(emp.id)&&a.date===appt.date&&String(a.id)!==String(appt.id)).map(a=>appointmentWithMeta(db,a));
  if(existing.some(a=>minutes(start)<minutes(a.end_time)&&minutes(end)>minutes(a.start_time))) return {status:'conflict', message:`Solape en agenda de ${emp.name}`};
  const cab = cabinetConflict(db,{...appt,start_time:start,end_time:end});
  if(cab) return {status:'conflict', message:`Solape en gabinete ${appt.cabinet_id||1}`};
  return {status:'ok', message:`${emp.name} disponible`};
}

function simpleHash(input){ let h1=0x811c9dc5, h2=0x45d9f3b; const s=String(input||''); for(let i=0;i<s.length;i++){ h1^=s.charCodeAt(i); h1=Math.imul(h1,0x01000193); h2^=s.charCodeAt(i); h2=Math.imul(h2,0x27d4eb2d); } return ((h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0')); }

const PLAN_PRIORITY_RANK = {urgente:0, alta:1, media:2, baja:3};
function defaultPlanSteps(kind='general'){
  const k=normalizeText(kind);
  if(k.includes('impl')) return [
    {title:'Diagnóstico y CBCT',phase:'Diagnóstico',priority:'alta',deadline:'',order:1,duration:30,reason:'Diagnóstico implantológico',detail:'Exploración, CBCT, fotografía, escaneado y alternativas.',status:'pendiente'},
    {title:'Cirugía de implante / regeneración',phase:'Cirugía',priority:'alta',deadline:'',order:2,duration:60,reason:'Colocación de implante',detail:'Cirugía implantológica, posible regeneración y pauta postoperatoria.',status:'pendiente'},
    {title:'Revisión postoperatoria',phase:'Control',priority:'media',deadline:'',order:3,duration:20,reason:'Revisión de cirugía',detail:'Control de herida, sutura, higiene y dolor.',status:'pendiente'},
    {title:'Toma de medidas / escaneado',phase:'Prótesis',priority:'media',deadline:'',order:4,duration:40,reason:'Medidas para prótesis sobre implante',detail:'Escaneado, selección de componentes y color.',status:'pendiente'},
    {title:'Entrega de prótesis definitiva',phase:'Prótesis',priority:'media',deadline:'',order:5,duration:45,reason:'Entrega protésica',detail:'Colocación, torque, oclusión, instrucciones y mantenimiento.',status:'pendiente'}
  ];
  if(k.includes('endo')) return [
    {title:'Urgencia y diagnóstico pulpar',phase:'Urgencia',priority:'urgente',deadline:'',order:1,duration:30,reason:'Dolor / diagnóstico endodóntico',detail:'Pruebas de vitalidad, percusión, radiografía y control del dolor.',status:'pendiente'},
    {title:'Endodoncia',phase:'Tratamiento',priority:'alta',deadline:'',order:2,duration:75,reason:'Realizar endodoncia',detail:'Aislamiento, instrumentación, irrigación y obturación de conductos.',status:'pendiente'},
    {title:'Reconstrucción y control',phase:'Restauración',priority:'media',deadline:'',order:3,duration:45,reason:'Reconstrucción postendodoncia',detail:'Reconstrucción, perno si procede y control radiográfico.',status:'pendiente'}
  ];
  if(k.includes('perio')) return [
    {title:'Periodontograma y diagnóstico',phase:'Diagnóstico',priority:'alta',deadline:'',order:1,duration:40,reason:'Periodontograma completo',detail:'Sondaje 6 puntos, sangrado, placa, movilidad y furcas.',status:'pendiente'},
    {title:'Raspado y alisado radicular',phase:'Tratamiento periodontal',priority:'alta',deadline:'',order:2,duration:60,reason:'Tratamiento periodontal',detail:'RAR por cuadrantes o sectores según diagnóstico.',status:'pendiente'},
    {title:'Reevaluación periodontal',phase:'Reevaluación',priority:'media',deadline:'',order:3,duration:30,reason:'Reevaluación periodontal',detail:'Comparar bolsas, sangrado, placa e higiene.',status:'pendiente'}
  ];
  return [
    {title:'Diagnóstico y plan',phase:'Diagnóstico',priority:'alta',deadline:'',order:1,duration:30,reason:'Diagnóstico y explicación de plan',detail:'Exploración, pruebas, fotos, presupuesto y consentimiento.',status:'pendiente'},
    {title:'Tratamiento principal',phase:'Tratamiento',priority:'media',deadline:'',order:2,duration:45,reason:'Realizar tratamiento planificado',detail:'Procedimiento clínico principal según presupuesto aceptado.',status:'pendiente'},
    {title:'Control y mantenimiento',phase:'Control',priority:'baja',deadline:'',order:3,duration:20,reason:'Revisión del tratamiento',detail:'Control clínico, instrucciones y siguiente revisión.',status:'pendiente'}
  ];
}
function createTreatmentPlan(db,{patient_id,title='',priority='media',deadline='',kind='',type='',steps=[],items=[]}={}){
  if(!patient_id) throw new Error('Falta paciente'); if(!db.treatmentPlans) db.treatmentPlans=[];
  const effectiveKind=kind||type||'general';
  const rawSteps = steps.length ? steps : (items.length ? items.map(x=>({title:String(x)})) : defaultPlanSteps(effectiveKind));
  const planSteps=rawSteps.map((s,i)=>{ const txt=s.title||String(s)||'Paso clínico'; const c=classifyTreatmentPriority(txt); return {id:id(db), title:txt, phase:s.phase||c.phase, priority:Number(s.priority_level||c.level), priority_label:s.priority||priority, deadline:s.deadline||deadline||'', deadline_days:Number(s.deadline_days||c.deadline_days), order:Number(s.order||i+1), duration:Number(s.duration||45), reason:s.reason||txt, detail:s.detail||'', status:s.status||'pendiente', appointment_id:s.appointment_id||null}; }).sort((a,b)=>a.priority-b.priority||a.order-b.order);
  const plan={id:id(db), patient_id:Number(patient_id), type:effectiveKind, title:title||'Plan de tratamiento', priority, deadline, status:'activo', hierarchy:'Denty clinical priority v1.3', created_at:new Date().toISOString(), steps:planSteps};
  db.treatmentPlans.push(plan); return plan;
}
function treatmentPlanHierarchy(db, patient_id){
  return (db.treatmentPlans||[]).filter(p=>Number(p.patient_id)===Number(patient_id)).sort((a,b)=>(PLAN_PRIORITY_RANK[a.priority]??9)-(PLAN_PRIORITY_RANK[b.priority]??9)||String(a.deadline||'9999-12-31').localeCompare(String(b.deadline||'9999-12-31'))||Number(a.id)-Number(b.id)).map(plan=>({...plan, steps:[...(plan.steps||[])].sort((a,b)=>(PLAN_PRIORITY_RANK[a.priority]??9)-(PLAN_PRIORITY_RANK[b.priority]??9)||String(a.deadline||plan.deadline||'9999-12-31').localeCompare(String(b.deadline||plan.deadline||'9999-12-31'))||Number(a.order||0)-Number(b.order||0))}));
}
function schedulePlanStepToAgenda(db,{plan_id,step_id,date,start_time='10:00',employee_id,site=''}){
  const plan=(db.treatmentPlans||[]).find(p=>Number(p.id)===Number(plan_id)); if(!plan) throw new Error('Plan no encontrado');
  const step=(plan.steps||[]).find(s=>Number(s.id)===Number(step_id)); if(!step) throw new Error('Paso no encontrado');
  const start=start_time||'10:00'; const end=addMinutes(start, Number(step.duration||45));
  const appt={id:id(db), patient_id:Number(plan.patient_id), employee_id:Number(employee_id||db.employees?.[0]?.id||0), date:date||today(), start_time:start, end_time:end, duration_minutes:durationMinutes(start,end), title:step.title, reason:step.reason||step.title, detail:step.detail||'', status:'programada', site, confirmed:false, plan_id:plan.id, plan_step_id:step.id, phase:step.phase, hierarchy_label:`${plan.priority||'media'} · ${step.phase||'Tratamiento'} · paso ${step.order||1}`, created_at:new Date().toISOString()};
  db.appointments.push(appt); step.status='agendada'; step.appointment_id=appt.id; return appt;
}

function createConsentDocument(db,{patient_id,consent_id,title}){ const c=db.consents.find(x=>Number(x.id)===Number(consent_id))||db.consents[0]; if(!patient_id) throw new Error('Falta paciente'); const doc={id:id(db),patient_id:Number(patient_id),consent_id:c?.id||null,title:title||c?.title||'Consentimiento',version:c?.version||1,text:c?.text||'',status:'borrador',created_at:new Date().toISOString(),signature_data:'',signer_name:'',accepted:false,locked_at:'',hash:'',signature_audit:null}; db.documents.push(doc); return doc; }
function signDocument(db, docId, {signature_data, signer_name, accepted=false, device_info=''}){ const doc=db.documents.find(d=>Number(d.id)===Number(docId)); if(!doc) throw new Error('Documento no encontrado'); if(doc.locked_at) throw new Error('Documento firmado y bloqueado'); if(!signature_data) throw new Error('Falta la firma'); if(!accepted) throw new Error('Falta aceptar el consentimiento'); doc.signature_data=signature_data; doc.signer_name=signer_name||''; doc.accepted=true; doc.status='firmado'; doc.signed_at=new Date().toISOString(); doc.locked_at=doc.signed_at; doc.signature_audit={device_info, signed_at:doc.signed_at, consent_version:doc.version, text_length:String(doc.text||'').length}; doc.hash=simpleHash(JSON.stringify({id:doc.id,patient_id:doc.patient_id,title:doc.title,text:doc.text,signed_at:doc.signed_at,signer_name:doc.signer_name,signature_data,accepted:true,device_info})); db.consent_history=Array.isArray(db.consent_history)?db.consent_history:[]; db.consent_history.push({id:id(db),document_id:doc.id,patient_id:doc.patient_id,version:doc.version,hash:doc.hash,locked_at:doc.locked_at,action:'signed'}); return doc; }
function patientDetailActions(){ return [
  {id:'appointment',label:'Nueva cita'}, {id:'work',label:'Nuevo trabajo'}, {id:'budget',label:'Nuevo presupuesto'}, {id:'payment',label:'Registrar pago'}, {id:'odontogram',label:'Odontograma'}, {id:'documents',label:'Documentos firmados'}, {id:'alerts',label:'Alertas'}, {id:'files',label:'Archivos'}
]; }

function isSettledPayment(payment){
  const status=String(payment?.status||'').toLowerCase();
  return status==='paid'||status==='successful';
}
function paymentAmountForBudget(db,budgetId){
  return (db?.payments||[]).filter(p=>Number(p.budget_id)===Number(budgetId)&&isSettledPayment(p)).reduce((sum,p)=>sum+Number(p.amount||0),0);
}

function mapHeaders(headers){
  const wanted = {ficha:['ficha','historia','historia clinica','numero de ficha','n ficha','num ficha','hc','id paciente','codigo'],first_name:['nombre','name','first name'],last_name:['apellidos','apellido','surname','last name'],dni:['dni','nie','nif','documento'],phone:['telefono','teléfono','movil','móvil','phone'],email:['email','correo','mail'],birth_date:['fecha nacimiento','nacimiento','birth']};
  const mapping = {}; const normHeaders = headers.map(h => [h, normalizeText(h)]);
  for(const [field, aliases] of Object.entries(wanted)){ const found=normHeaders.find(([,nh])=>aliases.some(a=>nh.includes(normalizeText(a)))); if(found) mapping[field]=found[0]; }
  return mapping;
}
function splitCsvLine(line, delimiter){ const out=[]; let cur='', quote=false; for(let i=0;i<line.length;i++){ const ch=line[i]; if(ch==='"'&&line[i+1]==='"'){cur+='"';i++;continue;} if(ch==='"'){quote=!quote;continue;} if(ch===delimiter&&!quote){out.push(cur);cur='';continue;} cur+=ch; } out.push(cur); return out; }
function csvRows(text){ const sample=String(text||'').slice(0,1000); const semi=(sample.match(/;/g)||[]).length, comma=(sample.match(/,/g)||[]).length, tab=(sample.match(/\t/g)||[]).length; const delimiter=tab>semi&&tab>comma?'\t':semi>=comma?';':','; const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean); const headers=splitCsvLine(lines.shift()||'', delimiter).map(h=>h.trim()); const rows=lines.map(line=>Object.fromEntries(splitCsvLine(line,delimiter).map((v,i)=>[headers[i]||`Columna ${i+1}`,String(v||'').trim()]))); return {headers, rows, mapping:mapHeaders(headers)}; }
function patientFromRow(row,mapping){ const data={}; Object.entries(mapping||{}).forEach(([field,header])=>data[field]=row[header]||''); if(!data.first_name&&row.Nombre)data.first_name=row.Nombre; if(!data.last_name&&row.Apellidos)data.last_name=row.Apellidos; return data; }

function runAction(db, text, context={}){
  const norm=stripWake(text); const trace={VOICE:context.source&&String(context.source).includes('voice')?'✓':'texto', INTENT:'', TOOL:'', DATABASE:'localStorage', READBACK:''};
  if(/\b(crea|crear|nuevo|nueva|abre|registra|alta|paciente|ficha|que era)\b/.test(norm)){
    const full=parsePatientName(text); if(!full) return {type:'NEEDS_MORE_INFO',message:'¿Cómo se llama el nuevo paciente?',speak:true,trace:{...trace,INTENT:'crear_paciente'}};
    const p=createPatient(db, splitName(full)); trace.INTENT='crear_paciente'; trace.TOOL='createPatient'; trace.READBACK='✓'; return {type:'EXECUTED',message:`Paciente guardado: ${patientFullName(p)}`,patient:p,speak:true,trace};
  }
  if(/\b(protesis|protetica|rehabilita|rehabilitacion|planifica|planificar)\b/.test(norm)){
    const teeth=parseFdiRange(text); if(!teeth) return {type:'NEEDS_MORE_INFO',message:'¿Qué dientes o qué tramo quieres planificar?',speak:true,trace:{...trace,INTENT:'planificar_protesis'}};
    const patientId=context.patientId||context.patient_id||(db.patients.find(p=>!p.archived)||{}).id; if(patientId){ const od=ensureOdontogram(db,patientId); teeth.forEach(t=>od[t].status='prosthesis'); }
    return {type:'EXECUTED',message:`Plan protésico preparado para ${teeth.join(', ')}`,teeth,speak:true,trace:{...trace,INTENT:'planificar_protesis',TOOL:'odontogramRange',READBACK:'✓'}};
  }
  if(/\b(odontograma|dientes?)\b/.test(norm)&&context.patientId) return {type:'OPEN',target:'odontogram',message:'Abriendo odontograma',patient_id:context.patientId,trace:{...trace,INTENT:'abrir_odontograma'}};
  return {type:'NOT_UNDERSTOOD',message:'No he entendido la acción. Prueba: crea un paciente que se llama Juan Pérez.',speak:true,trace};
}


// DENTY WEB 1.3 ADVANCED PREVIEW CORE
const RECOVERY_KEY = 'denty_web_recovery_snapshots';
function stableHashText(text){
  let h1=0x811c9dc5, h2=0x01000193;
  for(let i=0;i<text.length;i++){ h1 ^= text.charCodeAt(i); h1 = Math.imul(h1, 16777619); h2 = Math.imul(h2 ^ text.charCodeAt(i), 2166136261); }
  return (h1>>>0).toString(16).padStart(8,'0') + (h2>>>0).toString(16).padStart(8,'0') + String(text.length).padStart(8,'0') + (text.length * 2654435761 >>> 0).toString(16).padStart(8,'0');
}
function createRecoverySnapshot(db, reason='autosave'){
  const payload = JSON.stringify(migrateDb(db));
  return {id:`recovery-${Date.now()}-${Math.random().toString(16).slice(2)}`, reason, version:migrateDb(db).version, created_at:new Date().toISOString(), size:payload.length, payload_hash:stableHashText(payload), payload};
}
function recoverDbFromSnapshots(snapshots=[]){
  const ordered=[...(Array.isArray(snapshots)?snapshots:[])].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  for(const snap of ordered){ try{ const db=JSON.parse(snap.payload); if(db && typeof db==='object') return migrateDb(db); }catch{} }
  return null;
}
function validateStorageHealth(storage){
  if(!storage) return {ok:false, quotaLikely:false, message:'Sin almacenamiento disponible'};
  const probe=`denty_probe_${Date.now()}`;
  try{ storage.setItem(probe,'ok'); const ok=storage.getItem(probe)==='ok'; storage.removeItem(probe); return {ok, quotaLikely:false, message:ok?'Almacenamiento local operativo':'No se pudo leer el valor escrito'}; }
  catch(err){ return {ok:false, quotaLikely:/quota|exceed|full/i.test(String(err?.message||err)), message:String(err?.message||err)}; }
}
function safeSaveDb(db, storage, reason='autosave'){
  if(!storage) return db;
  const migrated=migrateDb(db);
  const snap=createRecoverySnapshot(migrated, reason);
  let snaps=[]; try{ snaps=JSON.parse(storage.getItem(RECOVERY_KEY)||'[]'); if(!Array.isArray(snaps)) snaps=[]; }catch{}
  snaps.unshift(snap); snaps=snaps.slice(0,Math.max(1,Math.min(50,Number(migrated.settings?.backup?.retention||12))));
  storage.setItem(RECOVERY_KEY, JSON.stringify(snaps));
  storage.setItem(DB_KEY, JSON.stringify(migrated));
  return migrated;
}

const CLINICAL_PHASES = [
  {key:'urgency', label:'Urgencia / dolor / infección', rank:1, deadline_days:0},
  {key:'etiologic', label:'Control etiológico y periodontal', rank:2, deadline_days:7},
  {key:'restorative', label:'Restauradora / endodoncia', rank:3, deadline_days:21},
  {key:'surgery', label:'Cirugía / implantes', rank:4, deadline_days:45},
  {key:'prosthetic', label:'Prótesis definitiva', rank:5, deadline_days:90},
  {key:'maintenance', label:'Mantenimiento', rank:6, deadline_days:180}
];
function classifyTreatmentPriority(text=''){
  const n=normalizeText(String(text));
  if(/dolor|absceso|infeccion|flem[oó]n|urgenc|supur/.test(n)) return {level:1, phase:CLINICAL_PHASES[0].label, deadline_days:0};
  if(/period|raspado|sarro|bolsa|higiene|placa|gingiv/.test(n)) return {level:2, phase:CLINICAL_PHASES[1].label, deadline_days:7};
  if(/endo|caries|obtur|reconstru|perno/.test(n)) return {level:3, phase:CLINICAL_PHASES[2].label, deadline_days:21};
  if(/implante|extracci|exodon|injerto|seno|cirug/.test(n)) return {level:4, phase:CLINICAL_PHASES[3].label, deadline_days:45};
  if(/corona|puente|protesis|provisional|locator|barra/.test(n)) return {level:5, phase:CLINICAL_PHASES[4].label, deadline_days:90};
  return {level:6, phase:CLINICAL_PHASES[5].label, deadline_days:180};
}
function defaultPlanItems(type='general'){
  const t=normalizeText(type);
  if(t.includes('implant')) return ['Control periodontal inicial','Exodoncia o saneamiento previo','Colocación de implante','Revisión postoperatoria','Prótesis definitiva sobre implante','Mantenimiento periimplantario'];
  if(t.includes('period')) return ['Diagnóstico periodontal','Control de placa e higiene','Raspado y alisado radicular','Reevaluación periodontal','Mantenimiento periodontal'];
  if(t.includes('endo')) return ['Diagnóstico pulpar','Endodoncia','Reconstrucción provisional','Restauración definitiva','Revisión'];
  return ['Diagnóstico y urgencias','Control etiológico','Tratamiento conservador','Rehabilitación protésica','Mantenimiento'];
}
function schedulePlanStep(db,{patient_id,plan_id,step_id,date,start_time='10:00',employee_id}={}){
  const appt=schedulePlanStepToAgenda(db,{plan_id,step_id,date,start_time,employee_id});
  appt.motive=appt.reason||appt.title;
  appt.detail_clinical=appt.detail || `Plan ${appt.plan_id}: ${appt.title}. Fase: ${appt.phase||''}.`;
  appt.step_id=appt.plan_step_id;
  return appt;
}

const CONSENT_DEFINITIONS = {
  implant:{title:'Consentimiento informado de cirugía de implantes', diagnosis:['Ausencia dentaria o diente no mantenible y necesidad de rehabilitación fija/removible sobre implantes.'], benefits:['Mejorar función masticatoria','Mejorar estabilidad protésica','Preservar planificación rehabilitadora'], risks:['dolor, inflamación, hematoma o infección','fracaso de osteointegración','lesión de estructuras anatómicas cercanas','necesidad de injertos o cirugías adicionales'], alternatives:['no tratar','prótesis removible','puente dentosoportado si está indicado'], postcare:['higiene y revisiones','no fumar en fase de cicatrización','seguir medicación indicada'], requiresSignedAcceptance:true},
  periodontal:{title:'Consentimiento informado periodontal', diagnosis:['Enfermedad periodontal o riesgo periodontal que requiere diagnóstico y tratamiento causal.'], benefits:['reducir inflamación','controlar bolsas periodontales','mantener dientes y salud periimplantaria'], risks:['sensibilidad','recesión gingival visible','sangrado o molestias temporales'], alternatives:['mantenimiento sin raspado','derivación periodontal','no tratar'], postcare:['higiene interdental','mantenimiento periódico','reevaluación'], requiresSignedAcceptance:true},
  endodontic:{title:'Consentimiento informado de endodoncia', diagnosis:['Patología pulpar o periapical que requiere tratamiento de conductos.'], benefits:['mantener el diente','tratar dolor o infección','permitir restauración posterior'], risks:['fractura instrumental','persistencia de lesión','necesidad de retratamiento o extracción'], alternatives:['extracción','control farmacológico temporal','derivación'], postcare:['restauración definitiva','revisión radiográfica','evitar sobrecarga'], requiresSignedAcceptance:true},
  prosthetic:{title:'Consentimiento informado protésico', diagnosis:['Necesidad de rehabilitación mediante prótesis fija o removible.'], benefits:['recuperar función','mejorar estética','proteger estructuras remanentes'], risks:['descementado','fractura cerámica/resina','ajustes oclusales posteriores'], alternatives:['no tratar','implantes','prótesis removible u otras opciones'], postcare:['revisiones','higiene','uso de férula si procede'], requiresSignedAcceptance:true},
  general:{title:'Consentimiento informado odontológico general', diagnosis:['Procedimiento odontológico indicado tras diagnóstico clínico.'], benefits:['mejorar salud oral','prevenir progresión','restaurar función'], risks:['molestias transitorias','necesidad de tratamientos adicionales','fracaso o complicación biológica'], alternatives:['no tratar','tratamiento alternativo','derivación'], postcare:['seguir instrucciones','acudir a revisiones','consultar ante dolor o inflamación'], requiresSignedAcceptance:true}
};
function prepareConsentDocument(db,{patient_id,consent_type='general',plan_id=null}={}){
  if(!db.documents) db.documents=[]; const def=CONSENT_DEFINITIONS[consent_type]||CONSENT_DEFINITIONS.general;
  const sections={diagnosis:def.diagnosis, benefits:def.benefits, risks:def.risks, alternatives:def.alternatives, postcare:def.postcare};
  const text=`${def.title}\n\nDiagnóstico: ${sections.diagnosis.join(' ')}\nBeneficios: ${sections.benefits.join('; ')}\nRiesgos: ${sections.risks.join('; ')}\nAlternativas: ${sections.alternatives.join('; ')}\nCuidados: ${sections.postcare.join('; ')}`;
  const doc={id:id(db), patient_id:Number(patient_id||db.patients?.[0]?.id||1), plan_id, consent_type, title:def.title, text, sections, status:'pendiente_firma', version:'1.3.3', created_at:new Date().toISOString()};
  db.documents.push(doc); return doc;
}
function signConsentWithAudit(db, docId,{signature_data,signer_name='',accepted=false,user_agent='web'}={}){
  if(!accepted) throw new Error('Se requiere aceptación explícita antes de firmar');
  if(!signature_data) throw new Error('Se requiere firma digital');
  const doc=(db.documents||[]).find(d=>Number(d.id)===Number(docId)); if(!doc) throw new Error('Documento no encontrado');
  const signed_at=new Date().toISOString(); const raw=`${doc.id}|${doc.text}|${signature_data}|${signer_name}|${signed_at}|1.3`;
  doc.status='firmado'; doc.signature_data=signature_data; doc.signer_name=signer_name; doc.signed_at=signed_at; doc.hash=stableHashText(raw); doc.audit={accepted:true, signed_at, signer_name, user_agent, consent_version:'1.3.3', hash:doc.hash}; return doc;
}

function validatePatientImportRows(rows=[]){
  const seen=new Set(), validRows=[], duplicates=[], errors=[], warnings=[];
  rows.forEach((row,idx)=>{ const first=String(row.first_name||row.nombre||row.name||'').trim(); const last=String(row.last_name||row.apellidos||'').trim(); const phone=String(row.phone||row.telefono||'').replace(/\s+/g,''); const dni=String(row.dni||row.nif||'').trim().toUpperCase(); const ficha=String(row.ficha||row.historia||'').trim(); const sig=[dni,phone,ficha,normalizeText(`${first} ${last}`)].filter(Boolean).join('|'); if(!first&&!last&&!phone&&!dni){ errors.push({row:idx+1,field:'identity',message:'Fila sin identidad clínica'}); return; } if(seen.has(sig)){ duplicates.push({row:idx+1,signature:sig}); return; } seen.add(sig); if(!phone) warnings.push({row:idx+1,field:'phone',message:'Paciente sin teléfono'}); validRows.push({...row, first_name:first, last_name:last, phone, dni, ficha}); });
  return {validRows, duplicates, errors, warnings};
}

function extractTooth(text){ const m=String(text).match(/\b([1-4][1-8])\b/); return m?m[1]:null; }
function extractSurface(text){ const n=normalizeText(text); if(/oclusal|\bo\b/.test(n)) return 'O'; if(/mesial|\bm\b/.test(n)) return 'M'; if(/distal|\bd\b/.test(n)) return 'D'; if(/vestibular|bucal|\bv\b/.test(n)) return 'V'; if(/lingual|palatino|\bl\b|\bp\b/.test(n)) return 'P'; return ''; }
function extractTreatment(text){ const n=normalizeText(text); if(/implante/.test(n)) return 'implante'; if(/endo/.test(n)) return 'endodoncia'; if(/corona/.test(n)) return 'corona'; if(/limpieza|raspado|period/.test(n)) return 'periodontal'; if(/obtur|empaste/.test(n)) return 'obturación'; return 'tratamiento'; }
function parseDentalCommand(text, ctx={}){
  const raw=String(text||''); const n=normalizeText(raw); const tooth=extractTooth(raw); const surface=extractSurface(raw);
  if(/caries/.test(n) && tooth) return {intent:'odontogram.mark_surface', confidence:0.92, slots:{tooth, surface:surface||'O', status:'caries'}, requires_confirmation:false, action:'mark_odontogram'};
  const mob=(n.match(/movilidad\s*(\d|i{1,3})/)||[])[1]; const bolsa=(n.match(/bolsa\s*(\d{1,2})/)||[])[1];
  if(tooth && (mob||bolsa)) return {intent:'periodontal.update', confidence:0.86, slots:{tooth, mobility:mob?String(mob).toUpperCase():null, depth_mm:bolsa?Number(bolsa):null, site:surface||'D'}, requires_confirmation:false, action:'update_periodontal'};
  if(/presupuesto|presupuesta|cobra|precio/.test(n) && tooth) return {intent:'budget.create_from_treatment', confidence:0.84, slots:{tooth,treatment:extractTreatment(raw)}, requires_confirmation:true, action:'create_budget'};
  if(/agenda|cita|programa/.test(n) && tooth) return {intent:'agenda.schedule_treatment', confidence:0.8, slots:{tooth,treatment:extractTreatment(raw), date_hint:/jueves/.test(n)?'jueves':null}, requires_confirmation:true, action:'schedule_treatment'};
  return {intent:'unknown', confidence:0.2, slots:{}, requires_confirmation:false, action:'none'};
}
function applyDentalCommand(db,text,ctx={}){
  const parsed=parseDentalCommand(text,ctx); const pid=Number(ctx.patientId||ctx.patient_id||db.patients?.[0]?.id||1);
  if(parsed.intent==='odontogram.mark_surface'){ setToothLegendState(db,pid,parsed.slots.tooth,'caries',parsed.slots.surface); return {handled:true, ...parsed, message:`Caries registrada en ${parsed.slots.tooth} ${parsed.slots.surface}`}; }
  if(parsed.intent==='periodontal.update'){ const od=ensureOdontogram(db,pid); const rec=od[parsed.slots.tooth]; if(parsed.slots.mobility) rec.periodontal.mobility=parsed.slots.mobility; if(parsed.slots.depth_mm){ const site=parsed.slots.site==='M'?'ml':parsed.slots.site==='V'?'v':parsed.slots.site==='P'?'lp':parsed.slots.site==='D'?'dl':'lp'; rec.periodontal.depths[site]=String(parsed.slots.depth_mm); } return {handled:true,...parsed,message:`Periodontal actualizado en ${parsed.slots.tooth}`}; }
  if(parsed.intent==='budget.create_from_treatment'){ if(!db.budgets) db.budgets=[]; const total=/implante/.test(normalizeText(parsed.slots.treatment))?950:0; const budget={id:id(db), patient_id:pid, title:`${parsed.slots.treatment} ${parsed.slots.tooth}`, total, pending:total, tooth:parsed.slots.tooth, created_at:new Date().toISOString(), source:'NLU dental 1.3'}; db.budgets.push(budget); return {handled:true,...parsed,budget,message:`Presupuesto preparado: ${budget.title}`}; }
  if(parsed.intent==='agenda.schedule_treatment'){ if(!db.appointments) db.appointments=[]; const appt={id:id(db), patient_id:pid, employee_id:db.employees?.[0]?.id||1, date:today(), start_time:'10:00', end_time:'10:40', duration_minutes:40, title:`${parsed.slots.treatment} ${parsed.slots.tooth}`, motive:`${parsed.slots.treatment} ${parsed.slots.tooth}`, detail_clinical:`Cita creada por NLU dental 1.3 para ${parsed.slots.treatment} en ${parsed.slots.tooth}`, status:'programada', source:'NLU dental 1.3'}; db.appointments.push(appt); return {handled:true,...parsed,appointment:appt,message:`Cita preparada: ${appt.title}`}; }
  return {handled:false,...parsed,message:'No he entendido el comando clínico'};
}

window.DentyLogic={DB_KEY,PREVIOUS_KEYS,FDI_UPPER,FDI_LOWER,FDI_ALL,SURFACES,PERIO_SITES,DOCTOR_COLORS,STATUS_ORDER,STATUS_LABELS,ODONTO_LEGEND_MAIN,ODONTO_LEGEND_CYCLES,ODONTO_LEGEND_BASE_LABELS,ODONTO_LEGEND_STATE_LABELS,ODONTO_LEGEND_META,WHOLE_TOOTH_CODES,SURFACE_CODES,DEFAULT_SITES,DEFAULT_LABS,DEFAULT_EMPLOYEES,DEFAULT_SHIFTS,DEFAULT_CONSENTS,DEFAULT_PROCEDURES,clone,normalizeText,stripWake,stripWakeRaw,titleCase,today,weekdayFromDate,weekdayName,shortWeekdayName,prettyDate,patientFullName,initials,defaultDb,migrateDb,loadDb,saveDb,id,createPatient,archivePatient,restorePatient,ensureOdontogram,odontogramToothKind,occlusalSurfaceForTooth,normalizeSurfaceForTooth,legendVariant,legendLabel,legendStateText,legendNextIndex,statusTone,setToothLegendState,clearToothSurface,toothStatusNext,setToothPrimaryState,setToothSurfaceState,markArcadeMissing,splitName,parsePatientName,expandFdiRange,parseFdiRange,minutes,minutesToTime,durationMinutes,addMinutes,overlaps,appointmentWithMeta,appointmentsForDate,countOverlaps,cabinetConflict,agendaCounters,agendaByDoctors,agendaByHours,employeeShiftsForDate,employeeAbsencesForDate,appointmentAvailability,simpleHash,PLAN_PRIORITY_RANK,defaultPlanSteps,createTreatmentPlan,treatmentPlanHierarchy,schedulePlanStepToAgenda,createConsentDocument,signDocument,patientDetailActions,isSettledPayment,paymentAmountForBudget,mapHeaders,splitCsvLine,csvRows,patientFromRow,runAction,stableHashText,createRecoverySnapshot,recoverDbFromSnapshots,validateStorageHealth,safeSaveDb,CLINICAL_PHASES,classifyTreatmentPriority,schedulePlanStep,CONSENT_DEFINITIONS,prepareConsentDocument,signConsentWithAudit,validatePatientImportRows,parseDentalCommand,applyDentalCommand};
})();

(function(){'use strict';
const {FDI_ALL,addMinutes,createPatient,ensureOdontogram,id,normalizeText,patientFullName,setToothLegendState,stripWakeRaw,today}=window.DentyLogic;
const VOICE_INTENTS = Object.freeze([
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
function resolveSpokenDate(text, now=today()){
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

function parseVoiceCommand(text, context={}){
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

function validateStructuredCommand(command){
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

function executeVoiceCommand(db, command, context={}){
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

window.DentyVoice={VOICE_INTENTS,resolveSpokenDate,parseVoiceCommand,validateStructuredCommand,executeVoiceCommand};
})();

(function(){'use strict';
const {loadDb,saveDb,defaultDb,id,today,prettyDate,shortWeekdayName,patientFullName,initials,normalizeText,FDI_UPPER,FDI_LOWER,SURFACES,STATUS_LABELS,ODONTO_LEGEND_MAIN,ODONTO_LEGEND_CYCLES,ODONTO_LEGEND_META,ensureOdontogram,toothStatusNext,setToothPrimaryState,setToothLegendState,clearToothSurface,setToothSurfaceState,markArcadeMissing,createPatient,archivePatient,restorePatient,patientDetailActions,legendVariant,legendLabel,legendStateText,legendNextIndex,statusTone,normalizeSurfaceForTooth,agendaByDoctors,agendaByHours,agendaCounters,appointmentAvailability,durationMinutes,addMinutes,createConsentDocument,signDocument,createTreatmentPlan,treatmentPlanHierarchy,schedulePlanStepToAgenda,csvRows,patientFromRow,runAction,validateStorageHealth,paymentAmountForBudget,isSettledPayment}=window.DentyLogic;
const {parseVoiceCommand,validateStructuredCommand,executeVoiceCommand}=window.DentyVoice;
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
let db = loadDb(storage);
let state = {view:'today', date: today(), patientId:null, patientTab:'resumen', agendaView:'doctors', trash:false, selectedTooth:null, selectedSurface:null, settingsPanel:'clinic', settingsEditType:null, settingsEditId:null, odontoToolBase:'filling', odontoToolCode:'filling', odontoLegendState:{}, odontoFilter:'all', odontoMode:'restorative'};
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
let selectedPortal = null;
const ACCOUNT_PORTALS = {
  admin:{title:'Cuenta Administrador',icon:'⌘',description:'Acceso a la gestión completa de Denty y de la clínica.',status:'Acceso de administrador preparado',hint:'En la siguiente fase pedirá el usuario y la contraseña del administrador.'},
  user:{title:'Cuenta Usuario',icon:'●',description:'Acceso para odontólogos, higienistas, auxiliares, recepción y demás personal.',status:'Acceso de usuario preparado',hint:'El fichaje quedará ligado a la identidad que inicie sesión.'},
  patient:{title:'Cuenta Paciente',icon:'♡',description:'Acceso independiente para pacientes, separado de la aplicación clínica.',status:'Portal del paciente en preparación',hint:'Por seguridad, esta cuenta todavía no entra en la aplicación clínica.'}
};
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

function persist(){ saveDb(db, storage); }
function recordAudit(action, patientId=null, detail=''){
  db.auditLog = Array.isArray(db.auditLog) ? db.auditLog : [];
  db.auditLog.unshift({id:id(db), at:new Date().toISOString(), user:'local-preview', action, patient_id:patientId, detail});
  db.auditLog = db.auditLog.slice(0,120);
}
function confirmDanger(message, action='accion sensible'){
  return confirm(`${message}\n\nSe registrara en auditoria local: ${action}`);
}
function canAccess(area){ const role=db.currentUser?.role||'admin'; return (db.rolePermissions?.[role]||[]).includes(area) || role==='admin'; }
function requirePin(action='accion sensible'){ if(pinUnlocked||!db.security?.pin_enabled) return true; const pin=prompt(`PIN administrador para ${action}`); if(pin && `${pin}-preview`===db.security.admin_pin_hash){ pinUnlocked=true; recordAudit('pin.unlock', null, action); persist(); return true; } toast('PIN incorrecto'); return false; }
function snapshot(action='snapshot', patientId=null){ lastSnapshot = JSON.stringify(db); recordAudit(action, patientId); }
function undo(){ if(!lastSnapshot) return toast('Nada que deshacer todavía'); db = JSON.parse(lastSnapshot); persist(); lastSnapshot=null; render(); toast('Deshecho'); }
function esc(s){ return String(s??'').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function toast(text){ const el=$('#toast'); el.textContent=text; el.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove('show'),2300); }
function speak(text){ try{ if(!('speechSynthesis' in window)) return; const u=new SpeechSynthesisUtterance(text); u.lang='es-ES'; speechSynthesis.cancel(); speechSynthesis.speak(u); }catch{} }
function formData(form){ return Object.fromEntries(new FormData(form).entries()); }
function activePatients(){ return db.patients.filter(p=>!p.archived); }
function patient(id){ return db.patients.find(p=>Number(p.id)===Number(id)); }
function emp(id){ return db.employees.find(e=>Number(e.id)===Number(id)); }
function currentPatient(){ return patient(state.patientId) || activePatients()[0] || null; }
const VIEW_PERMISSION={patients:'pacientes',patientDetail:'pacientes',agenda:'agenda',odontogram:'clinica',jobs:'clinica',finances:'finanzas',staff:'ajustes',templates:'documentos',assistant:'clinica',import:'ajustes'};
function setView(view, extras={}){ const area=VIEW_PERMISSION[view]; if(area&&!canAccess(area)){ closeDrawer(); toast('Tu usuario no tiene permiso para abrir esta sección'); return; } state = {...state, ...extras, view}; closeDrawer(); render(); window.scrollTo({top:0,behavior:'smooth'}); }

function render(){
  syncNav();
  const main=$('#main');
  if(main) main.dataset.view=state.view;
  if(state.view!==previousViewForMotion) animatePageTransition(main);
  if(state.view==='today') main.innerHTML=renderToday();
  else if(state.view==='patients') main.innerHTML=renderPatients();
  else if(state.view==='patientDetail') main.innerHTML=renderPatientDetail();
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
  window.dispatchEvent(new CustomEvent('denty:render'));
  previousViewForMotion=state.view;
}
function animatePageTransition(main){ if(!main) return; main.classList.remove('page-transition-enter'); void main.offsetWidth; main.classList.add('page-transition-enter'); }
function addCinematicDepthScene(main){ if(!main||state.view==='odontogram') return; const section=main.querySelector('section'); if(!section||section.querySelector('.cinematic-depth-scene')) return; section.insertAdjacentHTML('afterbegin','<div class="cinematic-depth-scene" aria-hidden="true"><span class="depth-plane depth-plane-a"></span><span class="depth-plane depth-plane-b"></span><span class="depth-line depth-line-a"></span><span class="depth-line depth-line-b"></span></div>'); }
function setupScrollReveal(root=document){ const nodes=$$('section > .card, section > article, .patient-card, .appt-card, .finance-row, .lab-work-card, .clinical-legend-card', root); nodes.forEach((el,i)=>{ el.classList.add('scroll-reveal'); el.style.setProperty('--reveal-delay', `${Math.min(i,10)*28}ms`); }); if(!('IntersectionObserver' in window)){ nodes.forEach(el=>el.classList.add('visible')); return; } const io=new IntersectionObserver(entries=>{ entries.forEach(entry=>{ if(entry.isIntersecting){ entry.target.classList.add('visible'); io.unobserve(entry.target); } }); },{threshold:.08, rootMargin:'0px 0px -30px 0px'}); nodes.forEach(el=>io.observe(el)); }
function syncNav(){ $$('.bottom-nav button').forEach(b=>b.classList.toggle('active', b.dataset.go===state.view || (state.view==='patientDetail'&&b.dataset.go==='patients') || (state.view==='odontogram'&&b.dataset.go==='patients'))); }
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
  const gateway=$('#accountGateway'), chooser=$('#accountChooser'), stage=$('#accountAccessStage'), shell=$('#appShell');
  if(gateway) gateway.hidden=false;
  if(chooser) chooser.hidden=false;
  if(stage) stage.hidden=true;
  if(shell){ shell.classList.add('account-gated'); shell.setAttribute('aria-hidden','true'); }
}
function showAccountAccess(type){
  const portal=ACCOUNT_PORTALS[type]; if(!portal) return;
  selectedPortal=type;
  safePortalStorage('set',type);
  $('#accountChooser').hidden=true;
  $('#accountAccessStage').hidden=false;
  $('#accountAccessIcon').textContent=portal.icon;
  $('#accountAccessTitle').textContent=portal.title;
  $('#accountAccessDescription').textContent=portal.description;
  $('#accountAccessStatus').textContent=portal.status;
  $('#accountAccessHint').textContent=portal.hint;
  const btn=$('#accountContinue');
  btn.disabled=selectedPortal==='patient';
  btn.textContent=selectedPortal==='patient'?'Portal próximamente':'Continuar a Denty';
}
function enterSelectedPortal(){
  if(!selectedPortal) return showAccountChooser();
  if(selectedPortal==='patient') return;
  const gateway=$('#accountGateway'), shell=$('#appShell');
  if(gateway) gateway.hidden=true;
  if(shell){ shell.classList.remove('account-gated'); shell.setAttribute('aria-hidden','false'); }
  window.scrollTo({top:0,behavior:'auto'});
}
function bindAccountGateway(){
  $$('[data-account-type]').forEach(btn=>btn.onclick=()=>showAccountAccess(btn.dataset.accountType));
  if($('#accountBack')) $('#accountBack').onclick=showAccountChooser;
  if($('#accountContinue')) $('#accountContinue').onclick=enterSelectedPortal;
  showAccountChooser();
}

function bindTop(){
  $('#drawerOpen').onclick=openDrawer; $('#drawerClose').onclick=closeDrawer; $('#scrim').onclick=closeDrawer;
  $('#quickAddBtn').onclick=()=>{ if(state.view==='agenda') openAppointmentModal(); else openPatientModal(); };
  $('#searchToggle').onclick=()=>setView('patients'); $('#undoBtn').onclick=undo;
  if($('#globalVoiceBtn')) $('#globalVoiceBtn').onclick=startSpeech;
  $$('[data-go]').forEach(el=>el.onclick=()=>setView(el.dataset.go, {settingsPanel:el.dataset.panel||state.settingsPanel}));
}
function openDrawer(){ $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden','false'); $('#scrim').classList.add('show'); }
function closeDrawer(){ $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden','true'); $('#scrim').classList.remove('show'); }

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
  modal.innerHTML=`<form method="dialog" class="modal-card quick-task-modal"><div class="modal-title"><div><h2>¿Qué quieres hacer?</h2><p>Acciones rápidas de Denty</p></div><button class="icon-btn" value="cancel" aria-label="Cerrar">×</button></div>${quickTaskButtons()}</form>`;
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
  <div class="tabs">${['resumen','planificacion','agenda','trabajos','presupuestos','documentos','alertas','comentarios','archivos'].map(t=>`<button class="tab ${state.patientTab===t?'active':''}" data-ptab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
  <div id="patientTabBody">${renderPatientTab(p)}</div></section>`;
}
function renderPatientTab(p){
  const id=p.id;
  if(state.patientTab==='resumen') return `<div class="card flat"><div class="section-title"><h2>Estado del caso</h2><button class="ghost" data-patient-action="odontogram">Abrir odontograma</button></div><div class="list"><div>📄 Documentos firmados: <strong>${db.documents.filter(d=>d.patient_id===id&&d.status==='firmado').length}</strong></div><div>🧩 Trabajos activos: <strong>${db.works.filter(w=>w.patient_id===id).length}</strong></div><div>📁 Archivos: <strong>${db.files.filter(f=>f.patient_id===id).length}</strong></div></div><div style="margin-top:14px">${miniOdonto(id)}</div></div>`;
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
  modal.innerHTML=`<form id="planForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Nuevo plan de tratamiento</h2><button class="icon-btn" value="cancel">×</button></div><div class="form-grid"><label class="field">Tipo<select name="kind"><option value="general">General</option><option value="implantes">Implantes</option><option value="endo">Endodoncia</option><option value="perio">Periodontal</option></select></label><label class="field">Prioridad<select name="priority"><option value="urgente">Urgente</option><option value="alta">Alta</option><option value="media" selected>Media</option><option value="baja">Baja</option></select></label><label class="field">Plazo clínico<input name="deadline" type="date" value="${today()}"></label></div><label class="field">Título del plan<input name="title" value="Plan integral ${esc(patientFullName(p))}"></label><p class="tiny">Denty crea pasos por jerarquía: urgencia/diagnóstico → tratamiento causal → rehabilitación → control/mantenimiento.</p><button class="primary">Crear plan</button></form>`;
  modal.showModal();
  $('#planForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); snapshot(); createTreatmentPlan(db,{patient_id:p.id,title:d.title,priority:d.priority,deadline:d.deadline,kind:d.kind}); persist(); modal.close(); state.patientTab='planificacion'; render(); toast('Plan creado por jerarquía clínica'); };
}
function schedulePlanStep(key){
  const [planId, stepId]=String(key).split(':').map(Number);
  const modal=$('#appointmentModal'); const p=patient(state.patientId); if(!p)return;
  const plan=(db.treatmentPlans||[]).find(x=>Number(x.id)===planId); const step=plan?.steps?.find(x=>Number(x.id)===stepId); if(!step)return toast('Paso no encontrado');
  modal.innerHTML=`<form id="scheduleStepForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Agendar paso</h2><button class="icon-btn" value="cancel">×</button></div><p><strong>${esc(step.title)}</strong><br><small>${esc(step.phase)} · ${esc(step.reason)}</small></p><div class="form-grid"><label class="field">Doctor<select name="employee_id">${db.employees.filter(e=>e.active!==false).map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></label><label class="field">Fecha<input name="date" type="date" value="${state.date||today()}"></label><label class="field">Hora<input name="start_time" type="time" value="10:00"></label><label class="field">Sede<input name="site" value="${esc(db.sites?.[0]?.name||'')}"></label></div><label class="field">Motivo de visita<input name="reason" value="${esc(step.reason||step.title)}"></label><label class="field">Detalle clínico de la cita<textarea name="detail">${esc(step.detail||'')}</textarea></label><button class="primary">Agendar en la cita</button></form>`;
  modal.showModal();
  $('#scheduleStepForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); snapshot(); step.reason=d.reason; step.detail=d.detail; schedulePlanStepToAgenda(db,{plan_id:planId,step_id:stepId,date:d.date,start_time:d.start_time,employee_id:Number(d.employee_id),site:d.site}); persist(); modal.close(); state.patientTab='agenda'; render(); toast('Paso añadido a la agenda'); };
}

function legacyRenderDocumentsTab(p){
  const docs=db.documents.filter(d=>Number(d.patient_id)===Number(p.id)).sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
  return `<div class="toolbar"><button class="primary" id="newConsentDoc">Nuevo consentimiento</button></div>${docs.length?docs.map(d=>`<article class="doc-card"><div class="section-title"><h2>${esc(d.title)}</h2><span class="${d.status==='firmado'?'ok-banner':'warn-banner'}">${esc(d.status)}</span></div><p>${esc(d.text)}</p><small>v${d.version||1} ${d.signed_at?'· firmado '+new Date(d.signed_at).toLocaleString('es-ES'):''} ${d.hash?'· hash '+esc(d.hash.slice(0,16)):' '}</small>${d.signature_data?`<img class="doc-signature" src="${esc(d.signature_data)}" alt="Firma guardada" />`:''}<div class="toolbar"><button class="ghost" data-view-doc="${d.id}">Ver</button><button class="primary" data-sign-doc="${d.id}">${d.status==='firmado'?'Re-firmar':'Firmar'}</button></div></article>`).join(''):'<div class="empty-state">Sin documentos firmados.</div>'}`;
}
function legacyRenderAlertsTab(p){ const list=db.clinicalAlerts.filter(a=>Number(a.patient_id)===Number(p.id)); return `<div class="toolbar"><button class="primary" id="addAlert">+ Alerta clínica</button></div>${list.map(a=>`<div class="danger-banner"><strong>${esc(a.type||'Alerta')}</strong><div>${esc(a.text||'')}</div></div>`).join('')||'<div class="empty-state">Sin alertas clínicas.</div>'}`; }
function renderCommentsTab(p){ const list=db.comments.filter(c=>Number(c.patient_id)===Number(p.id)); return `<div class="toolbar"><button class="primary" id="addComment">+ Comentario</button></div>${list.map(c=>`<div class="card flat"><strong>${c.pinned?'📌 ':''}${esc(c.category||'Comentario')}</strong><p>${esc(c.text)}</p></div>`).join('')||'<div class="empty-state">Sin comentarios.</div>'}`; }
function renderFilesTab(p){ const list=db.files.filter(f=>Number(f.patient_id)===Number(p.id)); return `<div class="toolbar"><button class="primary" id="addFile">+ Archivo</button></div>${list.map(f=>`<div class="list-item"><span>📁</span><span><strong>${esc(f.title)}</strong><small>${esc(f.type||'archivo')}</small></span></div>`).join('')||'<div class="empty-state">Sin archivos.</div>'}`; }

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
  const status=record.status||'healthy', surfaces=record.surfaces||{}, tone=statusTone(status), kind=toothKind(tooth);
  const g=toothGeometry(kind, tooth);
  const lower=FDI_LOWER.includes(String(tooth));
  const rotate=lower?'':' transform="rotate(180 25 40)"';
  const sem=statusVisualSemantics(status);
  const bad=sem.kind==='redo';
  const pending=sem.kind==='pending';
  const missing=status==='missing';
  const crown=String(status).startsWith('crown');
  const implant=String(status).startsWith('implant');
  const bridge=String(status).startsWith('prosthesis');
  const removable=String(status).startsWith('removable');
  const endo=String(status).startsWith('endo');
  const post=String(status).startsWith('post');
  const surfaceRed=Object.values(surfaces).includes('caries');
  const surfaceFill=Object.values(surfaces).some(v=>String(v).startsWith('filling'));
  const missingAttrs = missing?' stroke-dasharray="4 4" opacity=".55"':'';
  const rootLines = (g.rootLines||[]).map(d=>`<path class="root-split" d="${d}"${missingAttrs}/>`).join('');
  const rootShade = `<path class="root-shade" d="M18 42 C20 52 20 65 22 78 M32 42 C30 52 30 65 28 78"${missingAttrs}/>`;
  return `<svg class="tooth-svg apk-tooth minimal-tooth anatomical-tooth continuous-tooth semantic-${sem.kind}" viewBox="0 0 50 82" aria-hidden="true"><g${rotate}><path class="tooth-outline tone-${tone}" d="${g.outline}"${missingAttrs}/>${missing?'':rootShade}${rootLines}${crown?`<path class="crown-cap treatment-mark ${sem.className}" d="M15 23 C21 17 29 17 35 23 L32 36 C28 33 22 33 18 36 Z"/>`:''}${surfaceFill?`<circle class="surface-fill-dot treatment-mark ${sem.className}" cx="25" cy="25" r="4.8"/>`:''}${surfaceRed||status==='caries'?`<circle class="surface-red-dot treatment-mark semantic-pending" cx="25" cy="24" r="4.8"/>`:''}${endo?`<path class="endo-mark treatment-mark ${sem.className}" d="M23.5 35 L26.5 35 L26 72 L24 72 Z"/>`:''}${post?`<path class="post-mark treatment-mark ${sem.className}" d="M22 30 L28 30 L27 54 L23 54 Z"/>`:''}${implant?`<g class="implant-mark treatment-mark ${sem.className}"><path d="M19 42 H31 M20 49 H30 M21 56 H29 M22 63 H28"/><path d="M19 40 L23 72 H27 L31 40"/></g>`:''}${bridge?`<path class="bridge-mark treatment-mark ${sem.className}" d="M6 27 H44"/>`:''}${removable?`<g class="removable-mark treatment-mark ${sem.className}"><path d="M7 28 H43"/><rect x="19" y="43" width="12" height="7" rx="2"/></g>`:''}${status==='extraction'?'<path class="extract-mark semantic-pending" d="M13 15 L37 45 M37 15 L13 45"/>':''}</g></svg>`;
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
function toothSummary(record){ const primary=STATUS_LABELS[record.status]||record.status; const surf=Object.entries(record.surfaces||{}).map(([s,v])=>`${s}:${STATUS_LABELS[v]||v}`).join(' · '); return surf?`${primary} · ${surf}`:primary; }
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
  return `<section class="odonto-page05"><article class="card odonto-card apk-like"><div class="odonto-header sticky-odonto"><div><h1>Periodontal</h1><p>${p?esc(patientFullName(p)):'Demo sin paciente'} · diente seleccionado ${tooth}</p></div><button class="ghost" data-go="patientDetail">Ficha</button></div><select id="odontogramPatient" class="select-line">${activePatients().map(x=>`<option value="${x.id}" ${Number(x.id)===Number(p?.id||'demo')?'selected':''}>${esc(patientFullName(x))}</option>`).join('')||'<option value="demo">Demo sin paciente</option>'}</select>${odontoTopSwitch('periodontal')}<article class="card perio-card compact-summary"><div class="section-title"><h2>Resumen periodontal</h2><p>Conteo automático de sitios con bolsa.</p></div><div class="perio-summary-grid"><div><b>≥4 mm</b><span>${sum.ge4} sitios</span></div><div><b>≥5 mm</b><span>${sum.ge5} sitios</span></div><div><b>≥6 mm</b><span>${sum.ge6} sitios</span></div></div></article><div class="perio-arch-grid">${renderPerioSelectorArc(od,FDI_UPPER,'Maxilar superior')}${renderPerioSelectorArc(od,FDI_LOWER,'Maxilar inferior')}</div><article class="card perio-diagram-card"><div class="section-title"><h2>Sondaje · 6 puntos</h2><p>Marca la profundidad alrededor del diente y registra la retracción gingival por sitio.</p></div><div class="perio-diagram-wrap"><div class="probe-ring"><div class="probe-site probe-mv"><label>MV</label>${probeInput(tooth,'mv',perio.depths.mv)}</div><div class="probe-site probe-v"><label>V</label>${probeInput(tooth,'v',perio.depths.v)}</div><div class="probe-site probe-dv"><label>DV</label>${probeInput(tooth,'dv',perio.depths.dv)}</div><div class="probe-site probe-ml"><label>ML/P</label>${probeInput(tooth,'ml',perio.depths.ml)}</div><div class="probe-site probe-lp"><label>L/P</label>${probeInput(tooth,'lp',perio.depths.lp)}</div><div class="probe-site probe-dl"><label>DL/P</label>${probeInput(tooth,'dl',perio.depths.dl)}</div><div class="tooth-focus"><div class="tooth-focus-svg">${toothMarkers(tooth,rec)}</div><strong>Diente ${tooth}</strong><small>${esc(toothSummary(rec))}</small></div></div><div class="perio-side-table"><h3>Retracción gingival</h3><div class="recession-grid">${PERIO_SITE_LABELS.map(s=>`<label class="recession-cell"><span>${s.label}</span>${recessionInput(tooth,s.key,perio.recession[s.key])}</label>`).join('')}</div><h3>Signos clínicos</h3><div class="flag-grid">${PERIO_SITE_LABELS.map(s=>flagMini('Sangrado',tooth,'bleeding',s.key,perio.bleeding[s.key])).join('')}${PERIO_SITE_LABELS.map(s=>flagMini('Supuración',tooth,'suppuration',s.key,perio.suppuration[s.key])).join('')}${PERIO_SITE_LABELS.map(s=>flagMini('Placa',tooth,'plaque',s.key,perio.plaque[s.key])).join('')}</div><div class="perio-footer-controls"><label class="field mini-field">Furca<select data-perio-select="furcation" data-tooth="${tooth}"><option value="0" ${String(perio.furcation)==='0'?'selected':''}>0</option><option value="I" ${String(perio.furcation)==='I'?'selected':''}>I</option><option value="II" ${String(perio.furcation)==='II'?'selected':''}>II</option><option value="III" ${String(perio.furcation)==='III'?'selected':''}>III</option></select></label><label class="field mini-field">Movilidad periodontal<select data-perio-select="mobility" data-tooth="${tooth}"><option value="0" ${String(perio.mobility)==='0'?'selected':''}>0</option><option value="I" ${String(perio.mobility)==='I'?'selected':''}>I</option><option value="II" ${String(perio.mobility)==='II'?'selected':''}>II</option><option value="III" ${String(perio.mobility)==='III'?'selected':''}>III</option></select></label></div></div></div></article><article class="card perio-card"><div class="section-title"><h2>Posición / movilidad · diente ${tooth}</h2><p>Registro complementario del diente seleccionado.</p></div><div class="position-grid"><button type="button" class="toggle-chip ${pos.mesialization?'on':''}" data-pos-flag="mesialization" data-tooth="${tooth}">Mesialización</button><button type="button" class="toggle-chip ${pos.distalization?'on':''}" data-pos-flag="distalization" data-tooth="${tooth}">Distalización</button><button type="button" class="toggle-chip ${pos.extrusion?'on':''}" data-pos-flag="extrusion" data-tooth="${tooth}">Extrusión</button><button type="button" class="toggle-chip ${pos.intrusion?'on':''}" data-pos-flag="intrusion" data-tooth="${tooth}">Intrusión</button><button type="button" class="toggle-chip ${pos.rotation?'on':''}" data-pos-flag="rotation" data-tooth="${tooth}">Giro / rotación</button><button type="button" class="toggle-chip ${pos.vestibuloversion?'on':''}" data-pos-flag="vestibuloversion" data-tooth="${tooth}">Vestibuloversión</button><button type="button" class="toggle-chip ${pos.linguoversion?'on':''}" data-pos-flag="linguoversion" data-tooth="${tooth}">Linguoversión / palatoversión</button><button type="button" class="toggle-chip ${pos.recessionVisible?'on':''}" data-pos-flag="recessionVisible" data-tooth="${tooth}">Retracción gingival visible</button></div><div class="perio-footer-controls"><label class="field mini-field">Movilidad visible<select data-pos-select="mobility" data-tooth="${tooth}"><option value="0" ${String(pos.mobility||'0')==='0'?'selected':''}>0</option><option value="I" ${String(pos.mobility)==='I'?'selected':''}>I</option><option value="II" ${String(pos.mobility)==='II'?'selected':''}>II</option><option value="III" ${String(pos.mobility)==='III'?'selected':''}>III</option></select></label></div></article></article></section>`;
}
function renderRestorativeModeLegacy(od,p,pid,currentBase,currentIdx,currentCode){
  const labelRow=arr=>arr.map(t=>`<span>${t}</span>`).join('');
  const arch=(title, arr, arcade)=>`<div class="apk-arcade-card ${arcade}"><div class="apk-arcade-label"><strong>${title}</strong><small>${arr.filter(t=>od[t].status==='missing').length} ausentes</small><button class="ghost mini" data-mark-arcade="${arcade}">Arcada ausente</button></div><div class="apk-arcade-content"><div class="tooth-labels compact">${labelRow(arr)}</div><div class="teeth-row compact"><span class="row-spacer"></span>${arr.map(t=>`<button class="tooth-ui apk ${esc(statusTone(od[t].status))} ${state.selectedTooth===t?'selected':''}" data-tooth="${t}" title="${t} · ${esc(toothSummary(od[t]))}">${toothMarkers(t,od[t])}</button>`).join('')}</div><div class="surface-row compact"><span class="row-spacer"></span>${arr.map(t=>`<div class="surface-stack compact">${surfaceSvg(t,od[t])}</div>`).join('')}</div></div></div>`;
  return `<section class="odonto-page05"><article class="card odonto-card apk-like"><div class="odonto-header sticky-odonto"><div><h1>Odontograma</h1><p>${p?esc(patientFullName(p)):'Demo sin paciente'} · modo ${esc(legendLabel(currentBase,currentIdx))}</p></div><button class="ghost" data-go="patientDetail">Ficha</button></div><select id="odontogramPatient" class="select-line">${activePatients().map(x=>`<option value="${x.id}" ${Number(x.id)===Number(pid)?'selected':''}>${esc(patientFullName(x))}</option>`).join('')||'<option value="demo">Demo sin paciente</option>'}</select>${odontoTopSwitch('restorative')}<div class="active-tool-bar tone-${currentCode?statusTone(currentCode):'neutral'}"><span>${currentCode?legendSymbol(currentCode):'○'}</span><strong>${currentCode?esc(legendLabel(currentBase,currentIdx)):'Sin herramienta activa'}</strong><small>${currentCode?esc(legendStateText(currentBase,currentIdx))+' · toca dientes o superficies':'toca una leyenda o mantén pulsado un diente'}</small><button class="ghost mini" id="clearOdontoTool">Salir</button></div>${arch('Maxilar superior',FDI_UPPER,'superior')}${arch('Maxilar inferior',FDI_LOWER,'inferior')}<div class="quick-odonto-actions compact-actions"><button class="ghost" id="cycleSelectedTooth">Ciclo diente</button><button class="ghost" id="selectFdiRange">Rango FDI</button><button class="ghost" id="clearSelectedSurface">Limpiar superficie</button></div><section class="legend apk-legend"><div class="section-title"><h2>Leyenda</h2><p>Toque repetido: correcto → insatisfactorio → pendiente. Después toca el diente o una superficie.</p></div><div class="legend-grid apk clinical-grid">${legendItems()}</div><p class="tiny">Azul = correcto · Azul + rojo = insatisfactorio/a revisar · Rojo = pendiente/patología · Verde = sano al finalizar. Las tarjetas indican si actúan en superficie o en diente completo.</p></section></article></section>`;
}
function renderRestorativeMode(od,p,pid,currentBase,currentIdx,currentCode){
  const labelRow=arr=>arr.map(t=>`<span>${t}</span>`).join('');
  const teethRow=arr=>`<div class="teeth-row compact"><span class="row-spacer"></span>${arr.map(t=>`<button class="tooth-ui apk ${esc(statusTone(od[t].status))} ${state.selectedTooth===t?'selected':''}" data-tooth="${t}" title="${t} - ${esc(toothSummary(od[t]))}">${toothMarkers(t,od[t])}</button>`).join('')}</div>`;
  const surfaces=arr=>`<div class="surface-row compact"><span class="row-spacer"></span>${arr.map(t=>`<div class="surface-stack compact">${surfaceSvg(t,od[t])}</div>`).join('')}</div>`;
  const arch=(title, arr, arcade)=>`<div class="apk-arcade-card minimal-odontogram ${arcade}"><div class="apk-arcade-label"><strong>${title}</strong><small>${arr.filter(t=>od[t].status==='missing').length} ausentes</small><button class="ghost mini" data-mark-arcade="${arcade}">Arcada ausente</button></div><div class="apk-arcade-content">${arcade==='superior'?`${teethRow(arr)}<div class="tooth-labels compact">${labelRow(arr)}</div>${surfaces(arr)}`:`${surfaces(arr)}<div class="tooth-labels compact">${labelRow(arr)}</div>${teethRow(arr)}`}</div></div>`;
  return `<section class="odonto-page05"><article class="card odonto-card apk-like"><div class="odonto-header sticky-odonto"><div><h1>Odontograma</h1><p>${p?esc(patientFullName(p)):'Demo sin paciente'} - modo ${esc(legendLabel(currentBase,currentIdx))}</p></div><button class="ghost" data-go="patientDetail">Ficha</button></div><select id="odontogramPatient" class="select-line">${activePatients().map(x=>`<option value="${x.id}" ${Number(x.id)===Number(pid)?'selected':''}>${esc(patientFullName(x))}</option>`).join('')||'<option value="demo">Demo sin paciente</option>'}</select>${odontoTopSwitch('restorative')}<div class="active-tool-bar tone-${currentCode?statusTone(currentCode):'neutral'}"><span>${currentCode?legendSymbol(currentCode):'○'}</span><strong>${currentCode?esc(legendLabel(currentBase,currentIdx)):'Sin herramienta activa'}</strong><small>${currentCode?esc(legendStateText(currentBase,currentIdx))+' - toca dientes o superficies':'toca una leyenda o manten pulsado un diente'}</small><button class="ghost mini" id="clearOdontoTool">Salir</button></div>${arch('Maxilar superior',FDI_UPPER,'superior')}${arch('Maxilar inferior',FDI_LOWER,'inferior')}<div class="quick-odonto-actions compact-actions"><button class="ghost" id="cycleSelectedTooth">Ciclo diente</button><button class="ghost" id="selectFdiRange">Rango FDI</button><button class="ghost" id="clearSelectedSurface">Limpiar superficie</button></div><section class="legend apk-legend"><div class="section-title"><h2>Leyenda</h2><p>Toque repetido: correcto -> insatisfactorio -> pendiente. Despues toca el diente o una superficie.</p></div><div class="legend-grid apk clinical-grid">${legendItems()}</div><p class="tiny">Diente blanco con contorno azul. Los colores se reservan para marcas clinicas y estados.</p></section></article></section>`;
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
function renderAgendaByDoctors(){ const data=agendaByDoctors(db,state.date); return `<div class="doctor-view">${data.map(col=>`<article class="card doctor-block" style="--doc-color:${esc(col.employee.color)}"><div class="doctor-block-head"><span class="avatar" style="background:${esc(col.employee.color)}22;color:${esc(col.employee.color)}">${esc(col.employee.name.slice(0,2))}</span><div><h2>${esc(col.employee.name)}</h2><small>${esc(col.employee.role)} · ${esc(col.employee.site||'Sin sede')} · ${col.shifts.map(s=>s.start_time+'-'+s.end_time).join(', ')||'sin turno'}</small></div></div>${col.absences.length?`<div class="warn-banner">${esc(col.absences.map(a=>a.type).join(', '))}</div>`:''}${col.appointments.length?col.appointments.map(a=>apptCard(a)).join(''):'<div class="empty-state">Sin citas para este doctor.</div>'}<button class="ghost" data-new-appt-emp="${col.employee.id}">+ Cita con ${esc(col.employee.name)}</button></article>`).join('')}</div>`; }
function renderAgendaByHours(){ const ag=db.settings?.agenda||{}; const data=agendaByHours(db,state.date,{start:ag.day_start||'09:00',end:ag.day_end||'20:00',step:Number(db.settings?.slotMinutes||20)}); return `<div class="hours-scroller"><div class="hours-grid" style="--doctor-count:${data.columns.length}"><div class="head">Hora</div>${data.columns.map(c=>`<div class="head">${esc(c.employee.name)}<br><small>${esc(c.employee.site||'Sin sede')}</small></div>`).join('')}${data.slots.map(slot=>`<div class="hour">${slot.time}</div>${data.columns.map(c=>slotCell(slot.time,c.employee.id)).join('')}`).join('')}</div></div>`; }
function slotCell(time, employeeId){ const aps=agendaByDoctors(db,state.date).find(c=>Number(c.employee.id)===Number(employeeId))?.appointments||[]; const a=aps.find(x=>x.start_time===time || (x.start_time<time && x.end_time>time)); if(!a) return `<button class="slot-cell empty" data-slot-time="${time}" data-slot-emp="${employeeId}" title="Crear cita ${time}"></button>`; const first=a.start_time===time; return `<div class="slot-cell has-appt ${a.availability_status&&a.availability_status!=='ok'?'conflict':''}">${first?`<div class="appt-mini"><strong>${esc(a.start_time)} ${esc(a.title)}</strong><br>${esc(a.patient?patientFullName(a.patient):'Sin paciente')}</div>`:''}</div>`; }
function apptCard(a){ const p=a.patient||patient(a.patient_id), e=a.employee||emp(a.employee_id); return `<div class="appt-card ${a.availability_status&&a.availability_status!=='ok'?'conflict':''}" style="--doc-color:${esc(e?.color||'#0fa5bf')}"><div class="time">${esc(a.start_time||'')} - ${esc(a.end_time||'')}</div><strong>${esc(a.title||'Cita dental')}</strong><small>${esc(p?patientFullName(p):'Sin paciente')} · ${esc(e?.name||'Sin doctor')} · ${esc(a.status||'programada')}</small>${a.reason?`<div class="appt-reason"><b>Motivo:</b> ${esc(a.reason)}</div>`:''}${a.detail?`<div class="appt-detail">${esc(a.detail)}</div>`:''}${a.hierarchy_label?`<small>Plan: ${esc(a.hierarchy_label)}</small>`:''}${a.availability_message?`<small>${esc(a.availability_message)}</small>`:''}</div>`; }

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
  const rows=(db.users||[]).map(u=>`<div class="admin-row"><span><strong>${esc(u.name)}</strong><small>${esc(u.role)} · ${u.pin_required?'PIN requerido':'sin PIN'} · ${u.active!==false?'activo':'inactivo'}${Number(u.id)===currentId?' · EN USO':''}</small></span><div class="admin-row-actions"><button class="ghost mini" data-settings-edit="user:${u.id}">Editar</button><button class="ghost mini" data-settings-toggle="user:${u.id}">${u.active!==false?'Desactivar':'Activar'}</button></div></div>`).join('');
  const form=editing?`<form id="userAdminForm" class="admin-form"><input type="hidden" name="id" value="${r?.id||''}"><div class="form-grid"><label class="field">Nombre<input name="name" required value="${esc(r?.name||'')}"></label><label class="field">Rol<select name="role"><option value="admin" ${r?.role==='admin'?'selected':''}>Administrador</option><option value="dentist" ${r?.role==='dentist'?'selected':''}>Odontólogo</option><option value="reception" ${r?.role==='reception'?'selected':''}>Recepción</option></select></label><label class="check-row"><input name="pin_required" type="checkbox" ${r?.pin_required?'checked':''}><span>Requerir PIN</span></label><label class="check-row"><input name="active" type="checkbox" ${r?.active!==false?'checked':''}><span>Usuario activo</span></label></div><div class="toolbar"><button class="primary">Guardar usuario</button><button type="button" class="ghost" data-settings-cancel>Cancelar</button></div></form>`:'<div class="toolbar"><button class="primary" data-settings-new="user">+ Nuevo usuario</button></div>';
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
function renderSettings(){
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
  bindForm('#userAdminForm','settings.user.save',(d,f)=>{ adminUpsert('users',d,x=>({name:x.name.trim(),role:x.role,pin_required:!!f.elements.pin_required.checked,active:!!f.elements.active.checked})); });
  const currentUserForm=$('#currentUserForm'); if(currentUserForm) currentUserForm.onsubmit=e=>{ e.preventDefault(); const u=db.users.find(x=>Number(x.id)===Number(currentUserForm.elements.user_id.value)); if(!u)return; snapshot('settings.current_user.update'); db.currentUser={id:u.id,role:u.role,name:u.name}; pinUnlocked=false; persist(); render(); toast('Usuario activo: '+u.name); };
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
  if($('#patientNewAppointment')) $('#patientNewAppointment').onclick=()=>openAppointmentModal({patient_id:state.patientId});
  if($('#tabNewAppointment')) $('#tabNewAppointment').onclick=()=>openAppointmentModal({patient_id:state.patientId});
  if($('#patientNewPlan')) $('#patientNewPlan').onclick=()=>{ state.patientTab='planificacion'; render(); openTreatmentPlanModal(); };
  if($('#patientNewWork')) $('#patientNewWork').onclick=()=>quickCreateWork();
  if($('#newGlobalWork')) $('#newGlobalWork').onclick=()=>quickCreateWork();
  if($('#newGlobalPayment')) $('#newGlobalPayment').onclick=()=>openPaymentModal(null,state.patientId);
  if($('#newTreatmentPlan')) $('#newTreatmentPlan').onclick=()=>openTreatmentPlanModal();
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
  if($('#addFile')) $('#addFile').onclick=()=>{ const title=prompt('Nombre del archivo'); if(title){ snapshot(); db.files.push({id:id(db),patient_id:state.patientId,title,type:'referencia'}); persist(); render(); }};
  if($('#odontogramPatient')) $('#odontogramPatient').onchange=e=>{ state.patientId=Number(e.target.value); render(); };
  bindOdonto();
  if($('#openAppointmentModal')) $('#openAppointmentModal').onclick=()=>openAppointmentModal();
  $$('[data-agenda-view]').forEach(b=>b.onclick=()=>{ state.agendaView=b.dataset.agendaView; render(); });
  if($('#agendaDate')) $('#agendaDate').onchange=e=>{ state.date=e.target.value; render(); };
  if($('#prevDay')) $('#prevDay').onclick=()=>{ state.date=shiftDate(state.date,-1); render(); };
  if($('#nextDay')) $('#nextDay').onclick=()=>{ state.date=shiftDate(state.date,1); render(); };
  $$('[data-new-appt-emp]').forEach(b=>b.onclick=()=>openAppointmentModal({employee_id:Number(b.dataset.newApptEmp),date:state.date}));
  $$('[data-slot-time]').forEach(b=>b.onclick=()=>openAppointmentModal({employee_id:Number(b.dataset.slotEmp),date:state.date,start_time:b.dataset.slotTime}));
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
  try{ setToothLegendState(db,p.id,tooth,code,surface); state.selectedTooth=String(tooth); state.selectedSurface=surface||null; persist(); render(); toast(`${STATUS_LABELS[code]||code} · ${tooth}${surface?' '+surface:''}`); }
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
  if($('#clearSelectedSurface')) $('#clearSelectedSurface').onclick=()=>{ const p=currentPatient(); if(!p||!state.selectedTooth||!state.selectedSurface)return toast('Toca antes una superficie'); snapshot(); clearToothSurface(db,p.id,state.selectedTooth,state.selectedSurface); persist(); render(); toast('Superficie limpiada'); };
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
function cycleSelected(){ const p=currentPatient(); if(!p||!state.selectedTooth) return toast('Selecciona un diente'); snapshot(); const od=ensureOdontogram(db,p.id); setToothPrimaryState(db,p.id,state.selectedTooth,toothStatusNext(od[state.selectedTooth].status)); persist(); render(); }
function openToothStateSheet(tooth){ const p=currentPatient(); if(!p)return; const modal=$('#consentModal'); const groups=[['Presencia',['healthy','missing','extraction','caries']],['Correcto',['filling','crown','endo','post','implant','prosthesis','removable']],['Insatisfactorio / revisar',['filling_bad','crown_bad','endo_bad','post_bad','implant_review','prosthesis_bad','removable_bad']],['Pendiente / indicado',['filling_pending','crown_pending','endo_indicated','post_pending','implant_indicated','prosthesis_pending','removable_pending']]]; modal.innerHTML=`<form method="dialog" class="modal-card"><div class="modal-title"><h2>Diente ${tooth}</h2><button class="icon-btn">×</button></div>${groups.map(([title,codes])=>`<h3>${title}</h3><div class="form-grid">${codes.map(code=>`<button class="ghost state-choice tone-${statusTone(code)}" value="${code}">${legendSymbol(code)} ${esc(STATUS_LABELS[code]||code)}</button>`).join('')}</div>`).join('')}</form>`; modal.showModal(); $$('button[value]',modal).forEach(b=>b.onclick=e=>{ e.preventDefault(); snapshot(); setToothLegendState(db,p.id,tooth,b.value); persist(); modal.close(); state.selectedTooth=tooth; render(); }); }

function openPatientModal(existing=null){ const modal=$('#patientModal'); modal.innerHTML=`<form id="patientForm" method="dialog" class="modal-card"><div class="modal-title"><h2>${existing?'Editar':'Nuevo'} paciente</h2><button class="icon-btn" value="cancel">×</button></div><section class="ai-card"><h3>✦ Asistente IA proactivo</h3><p>Detecta lo que falta, pregunta y escucha automáticamente después de cada respuesta.</p><span>10 datos por completar</span><button type="button" id="patientConversation" class="primary">🎙️ Conversación automática</button></section><div class="form-grid"><label class="field">Nombre<input name="first_name" value="${esc(existing?.first_name||'')}" required></label><label class="field">Apellidos<input name="last_name" value="${esc(existing?.last_name||'')}"></label><label class="field">Teléfono<input name="phone" value="${esc(existing?.phone||'')}"></label><label class="field">Email<input name="email" type="email" value="${esc(existing?.email||'')}"></label><label class="field">Fecha nacimiento<input name="birth_date" type="date" value="${esc(existing?.birth_date||'')}"></label><label class="field">Nº historia / ID<input name="ficha" value="${esc(existing?.ficha||'')}"></label><label class="field">DNI / NIE<input name="dni" value="${esc(existing?.dni||'')}"></label></div><button class="primary" type="submit">Guardar paciente</button></form>`; modal.showModal(); $('#patientConversation').onclick=()=>{ modal.close(); setView('assistant'); startSpeech(); }; $('#patientForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); snapshot(); if(existing){ Object.assign(existing,{first_name:d.first_name,last_name:d.last_name,phone:d.phone,email:d.email,birth_date:d.birth_date,ficha:d.ficha,dni:d.dni}); persist(); modal.close(); render(); toast('Paciente actualizado'); } else { const p=createPatient(db,d); persist(); modal.close(); state.patientId=p.id; state.patientTab='resumen'; setView('patientDetail'); toast('Paciente guardado'); } }; }
function openAppointmentModal(pref={}){
  if(!activePatients().length){ toast('Primero crea un paciente'); return openPatientModal(); }
  const defaultDuration=Number(db.settings?.agenda?.default_duration||40);
  const startTime=pref.start_time||'10:00';
  const defaultSiteId=Number(pref.site_id||db.settings?.clinicProfile?.default_site_id||db.sites?.[0]?.id||0);
  const defaultSite=db.sites.find(x=>Number(x.id)===defaultSiteId);
  const modal=$('#appointmentModal');
  modal.innerHTML=`<form id="appointmentForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Nueva cita</h2><button class="icon-btn" value="cancel">×</button></div><div class="form-grid"><label class="field">Paciente<select name="patient_id">${activePatients().map(p=>`<option value="${p.id}" ${Number(pref.patient_id||state.patientId)===Number(p.id)?'selected':''}>${esc(patientFullName(p))}</option>`).join('')}</select></label><label class="field">Doctor / empleado<select name="employee_id">${db.employees.filter(e=>e.active!==false).map(e=>`<option value="${e.id}" ${Number(pref.employee_id)===Number(e.id)?'selected':''}>${esc(e.name)}</option>`).join('')}</select></label><label class="field">Sede<select name="site_id">${db.sites.filter(s=>s.active!==false).map(x=>`<option value="${x.id}" ${Number(x.id)===defaultSiteId?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label class="field">Gabinete<select name="cabinet_id">${(db.cabinets||[]).filter(c=>c.active!==false).map(c=>`<option value="${c.id}" ${Number(pref.cabinet_id||1)===Number(c.id)?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label class="field">Fecha<input name="date" type="date" value="${pref.date||state.date}"></label><label class="field">Inicio<input name="start_time" type="time" value="${startTime}"></label><label class="field">Fin<input name="end_time" type="time" value="${pref.end_time||addMinutes(startTime,defaultDuration)}"></label><label class="field">Estado<select name="status"><option>programada</option><option>confirmada</option><option>espera</option><option>cancelada</option></select></label></div><label class="field">Motivo de visita<input name="title" value="${esc(pref.title||'Revisión')}"></label><label class="field">Detalle clínico de la cita<textarea name="detail" placeholder="Qué se va a hacer, dientes, material, fase del plan...">${esc(pref.detail||'')}</textarea></label><div id="availabilityBox" class="warn-banner">Calculando disponibilidad…</div><label><input name="confirmed" type="checkbox"> Confirmada por el paciente</label><button class="primary" type="submit">Crear cita</button></form>`;
  modal.showModal(); const form=$('#appointmentForm');
  const syncCabinets=()=>{ const sid=Number(form.elements.site_id.value); const current=String(form.elements.cabinet_id.value||''); [...form.elements.cabinet_id.options].forEach(o=>{ const c=db.cabinets.find(x=>Number(x.id)===Number(o.value)); o.hidden=!!c&&Number(c.site_id)!==sid; }); if(![...form.elements.cabinet_id.options].some(o=>o.value===current&&!o.hidden)){ const first=[...form.elements.cabinet_id.options].find(o=>!o.hidden); if(first) form.elements.cabinet_id.value=first.value; } };
  const refresh=()=>{ syncCabinets(); const d=formData(form); const av=appointmentAvailability(db,d); $('#availabilityBox').className=av.status==='ok'?'ok-banner':av.status==='conflict'?'danger-banner':'warn-banner'; $('#availabilityBox').textContent=av.message; return av; };
  ['employee_id','site_id','cabinet_id','date','start_time','end_time'].forEach(n=>form.elements[n].onchange=refresh); refresh();
  form.onsubmit=e=>{ e.preventDefault(); const d=formData(form); const av=refresh(); if(av.status!=='ok'&&!confirm(av.message+'\n\n¿Guardar igualmente?')) return; const site=db.sites.find(x=>Number(x.id)===Number(d.site_id)); snapshot('appointment.create',Number(d.patient_id)); db.appointments.push({id:id(db),patient_id:Number(d.patient_id),employee_id:Number(d.employee_id),cabinet_id:Number(d.cabinet_id||1),site_id:Number(d.site_id||0),chain_id:pref.chain_id||'',date:d.date,start_time:d.start_time,end_time:d.end_time,duration_minutes:durationMinutes(d.start_time,d.end_time),title:d.title,reason:d.title,detail:d.detail,status:d.status,site:site?.name||'',confirmed:!!d.confirmed,availability_status:av.status,availability_message:av.status==='ok'?'':av.message,created_at:new Date().toISOString()}); persist(); modal.close(); render(); toast(av.status==='ok'?'Cita guardada':'Cita guardada con aviso'); };
}
function legacyOpenConsentModal(){ const p=patient(state.patientId); if(!p)return; const modal=$('#consentModal'); modal.innerHTML=`<form id="consentForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Nuevo consentimiento</h2><button class="icon-btn" value="cancel">×</button></div><label class="field">Plantilla<select name="consent_id">${db.consents.filter(c=>c.active!==false).map(c=>`<option value="${c.id}">${esc(c.title)} · v${esc(c.version||1)}</option>`).join('')}</select></label><div class="consent-help">Consentimientos definidos con diagnóstico, beneficios, riesgos, alternativas, cuidados y firma.</div><label class="field">Título<input name="title" value="Consentimiento informado"></label><button class="primary">Crear documento</button></form>`; modal.showModal(); $('#consentForm').onsubmit=e=>{ e.preventDefault(); const d=formData(e.target); snapshot(); const doc=createConsentDocument(db,{patient_id:p.id,consent_id:Number(d.consent_id),title:d.title}); persist(); modal.close(); state.patientTab='documentos'; render(); toast('Documento creado'); openSignatureModal(doc.id); }; }
function viewDoc(docId){ const d=db.documents.find(x=>Number(x.id)===Number(docId)); if(!d)return; const modal=$('#consentModal'); modal.innerHTML=`<form method="dialog" class="modal-card"><div class="modal-title"><h2>${esc(d.title)}</h2><button class="icon-btn">×</button></div><p>${esc(d.text)}</p><div class="${d.status==='firmado'?'ok-banner':'warn-banner'}">Estado: ${esc(d.status)} ${d.hash?'· hash '+esc(d.hash):''}</div>${d.signature_data?`<img class="doc-signature" src="${esc(d.signature_data)}" alt="Firma">`:''}</form>`; modal.showModal(); }
function openSignatureModal(docId){ const doc=db.documents.find(d=>Number(d.id)===Number(docId)); if(!doc)return; const modal=$('#signatureModal'); modal.innerHTML=`<form id="signatureForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Firmar documento</h2><button class="icon-btn" value="cancel">×</button></div><p>${esc(doc.title)}</p><div class="consent-scroll">${esc(doc.text)}</div><canvas id="signatureCanvas" class="signature-pad" width="620" height="240"></canvas><label class="field">Nombre firmante<input name="signer_name" value="${esc(patientFullName(patient(doc.patient_id)))}"></label><label class="accept-line"><input name="accepted" type="checkbox" required> He leído y acepto este consentimiento informado</label><div class="toolbar"><button type="button" class="ghost" id="clearSignature">Limpiar</button><button class="primary">Guardar firma</button></div></form>`; modal.showModal(); const canvas=$('#signatureCanvas'), ctx=canvas.getContext('2d'); ctx.lineWidth=4; ctx.lineCap='round'; ctx.strokeStyle='#153b4b'; let drawing=false; const pos=e=>{ const r=canvas.getBoundingClientRect(); const p=e.touches?e.touches[0]:e; return {x:(p.clientX-r.left)*(canvas.width/r.width), y:(p.clientY-r.top)*(canvas.height/r.height)}; }; const start=e=>{drawing=true; const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); e.preventDefault();}; const move=e=>{ if(!drawing)return; const p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); e.preventDefault();}; const end=()=>{drawing=false;}; canvas.addEventListener('pointerdown',start); canvas.addEventListener('pointermove',move); canvas.addEventListener('pointerup',end); canvas.addEventListener('pointerleave',end); $('#clearSignature').onclick=()=>ctx.clearRect(0,0,canvas.width,canvas.height); $('#signatureForm').onsubmit=e=>{ e.preventDefault(); snapshot(); const fd=formData(e.target); signDocument(db,docId,{signature_data:canvas.toDataURL('image/png'),signer_name:fd.signer_name,accepted:!!fd.accepted,device_info:navigator.userAgent||'navegador'}); persist(); modal.close(); state.patientTab='documentos'; render(); toast('Documento firmado'); }; }
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
function renderPatientDetail(){
  const p=patient(state.patientId);
  if(!p) return `<button class="ghost" data-go="patients">Pacientes</button><div class="empty-state">Paciente no encontrado.</div>`;
  const apps=db.appointments.filter(a=>Number(a.patient_id)===Number(p.id));
  const docs=db.documents.filter(d=>Number(d.patient_id)===Number(p.id));
  const works=db.works.filter(w=>Number(w.patient_id)===Number(p.id));
  const pending=db.budgets.filter(b=>Number(b.patient_id)===Number(p.id)).reduce((s,b)=>s+Number(b.pending||b.total||0),0);
  const next=apps.filter(a=>a.date>=today()).sort((a,b)=>(a.date+a.start_time).localeCompare(b.date+b.start_time))[0];
  return `<section><button class="ghost" data-go="patients">Pacientes</button><article class="card patient-profile"><div class="patient-hero"><div class="avatar">${esc(initials(p))}</div><div><h1>${esc(patientFullName(p))}</h1><div class="patient-meta"><span>Tel. ${esc(p.phone||'-')}</span><span>${esc(p.email||'Sin email')}</span>${p.ficha?`<span>Ficha ${esc(p.ficha)}</span>`:''}</div></div></div>${renderPatientRiskStrip(p)}<div class="stats-grid"><div class="metric"><div class="k">Proxima cita</div><div class="v" style="font-size:22px">${next?esc(next.date+' '+next.start_time):'Sin cita'}</div></div><div class="metric"><div class="k">Trabajos activos</div><div class="v">${works.length}</div></div><div class="metric"><div class="k">Pendiente</div><div class="v money">${pending.toFixed(2)} EUR</div></div><div class="metric"><div class="k">Docs firmados</div><div class="v">${docs.filter(d=>d.status==='firmado').length}</div></div></div><div class="patient-primary-actions"><button class="primary" id="patientNewAppointment">Nueva cita</button><button class="ghost" id="patientNewPlan">Plan tratamiento</button><button class="ghost" id="patientNewWork">Nuevo trabajo</button><button class="ghost" id="patientNewBudget">Nuevo presupuesto</button><button class="ghost" id="patientPayment">Registrar pago</button></div><div class="action-grid">${patientDetailActions().filter(a=>!['appointment','work','budget','payment'].includes(a.id)).map(a=>`<button class="${a.id==='odontogram'?'primary':'ghost'}" data-patient-action="${a.id}" id="${a.id==='odontogram'?'patientOpenOdontogram':a.id==='documents'?'patientOpenDocuments':''}">${esc(a.label)}</button>`).join('')}<button class="danger" id="archivePatientBtn">Archivar paciente</button></div></article><article class="card denty-box"><h2>Denty Box Ambiental</h2><p>Acciones rapidas, notas y comandos del paciente.</p><button class="ghost" data-go="assistant">Abrir comandos</button></article><div class="tabs">${['resumen','planificacion','agenda','trabajos','presupuestos','documentos','alertas','comentarios','archivos','imprimir'].map(t=>`<button class="tab ${state.patientTab===t?'active':''}" data-ptab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div><div id="patientTabBody">${renderPatientTab(p)}</div></section>`;
}
function renderAgendaSafetyBanner(){
  const day=db.appointments.filter(a=>a.date===state.date);
  const patientIds=new Set(day.map(a=>Number(a.patient_id)));
  const alerts=db.clinicalAlerts.filter(a=>patientIds.has(Number(a.patient_id))&&a.active!==false);
  const unsigned=db.documents.filter(d=>patientIds.has(Number(d.patient_id))&&d.status!=='firmado');
  return `<div class="agenda-safety-banner"><b>Revision previa de agenda</b><span>${day.length} cita(s), ${alerts.length} alerta(s) activa(s), ${unsigned.length} consentimiento(s) pendiente(s).</span></div>`;
}
function renderAgenda(){
  const c=agendaCounters(db,state.date);
  const view=state.agendaView==='doctors'?renderAgendaByDoctors():renderAgendaByHours();
  return `<section><div class="page-head"><div><h1>Agenda</h1><p>${prettyDate(state.date)} · ${c.total} citas · ${c.conflicts} avisos</p></div><button class="primary" id="openAppointmentModal">+ Cita</button></div>${renderAgendaSafetyBanner()}<div class="toolbar"><button class="ghost" id="prevDay">Anterior</button><input id="agendaDate" type="date" value="${state.date}"><button class="ghost" id="nextDay">Siguiente</button><button class="${state.agendaView==='doctors'?'primary':'ghost'}" data-agenda-view="doctors">Doctores</button><button class="${state.agendaView==='hours'?'primary':'ghost'}" data-agenda-view="hours">Horas</button></div>${view}</section>`;
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
  modal.innerHTML=`<form id="consentForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Nuevo consentimiento</h2><button class="icon-btn" value="cancel">x</button></div><label class="field">Plantilla<select name="consent_id">${db.consents.filter(c=>c.active!==false).map(c=>`<option value="${c.id}">${esc(c.title)} · v${esc(c.version||1)}</option>`).join('')}</select></label><div class="consent-help">Incluye diagnostico, beneficios, riesgos, alternativas, cuidados y firmante responsable.</div><div class="consent-checklist editor"><label><input name="accepted_info" type="checkbox" required> Informacion explicada al paciente</label><label><input name="accepted_risks" type="checkbox" required> Riesgos y alternativas revisados</label><label><input name="accepted_privacy" type="checkbox" required> Uso y custodia del documento aceptados</label></div><label class="field">Titulo<input name="title" value="Consentimiento informado"></label><button class="primary">Crear documento</button></form>`;
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
const phase3LegacyPlanningTab = legacyRenderPlanningTab;
function renderPlanningTab(p){
  return `${renderPlanPhaseSummary(p)}${phase3LegacyPlanningTab(p)}`;
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
  modal.innerHTML=`<form id="budgetForm" method="dialog" class="modal-card"><div class="modal-title"><h2>Nuevo presupuesto</h2><button class="icon-btn" value="cancel">x</button></div><label class="field">Tratamiento<select name="procedure_id">${procedureOptions()}</select></label><div class="form-grid"><label class="field">Diente<input name="tooth" placeholder="36"></label><label class="field">Cantidad<input name="qty" type="number" min="1" value="1"></label></div><label class="field">Titulo<input name="title" value="Presupuesto ${esc(patientFullName(p))}"></label><button class="primary">Crear presupuesto</button></form>`;
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
  modal.innerHTML=`<form id="paymentForm" class="modal-card payment-modal"><div class="modal-title"><div><h2>Cobrar</h2><small>El pago con tarjeta solo se registra cuando el datáfono lo confirma.</small></div><button class="icon-btn" type="button" id="closePaymentModal">x</button></div><label class="field">Paciente<select name="patient_id">${patientOptions}</select></label><label class="field">Presupuesto opcional<select name="budget_id">${allBudgetOptions()}</select></label><div class="form-grid"><label class="field">Importe<input name="amount" type="number" min="0.01" step="0.01" value=""></label><label class="field">Método<select name="method"><option value="tarjeta">Tarjeta · datáfono</option><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="financiacion">Financiación</option></select></label><label class="field">Sede<select name="site_id">${siteOptions}</select></label><label class="field">Concepto<input name="concept" value="Cobro clínica"></label></div><div id="terminalPaymentPanel" class="terminal-payment" hidden><label class="field">Datáfono<select name="reader_id"><option value="">Buscando…</option></select></label><div id="terminalPaymentStatus" class="terminal-payment-status muted"><strong>Preparando terminal…</strong><span>Conectando con Denty Local.</span></div><button type="button" class="danger" id="cancelTerminalPaymentBtn" hidden>Cancelar en datáfono</button></div><button class="primary" id="paymentSubmitBtn">Cobrar en datáfono</button></form>`;
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
  modal.innerHTML=`<form id="workForm" method="dialog" class="modal-card"><div class="modal-title"><h2>${pref.status==='recibido'?'Recibir trabajo del laboratorio':'Nuevo trabajo laboratorio'}</h2><button class="icon-btn" value="cancel">x</button></div><label class="field">Paciente<select name="patient_id">${activePatients().map(p=>`<option value="${p.id}" ${Number(p.id)===selectedPatientId?'selected':''}>${esc(patientFullName(p))}</option>`).join('')}</select></label><label class="field">Trabajo<input name="title" value="${esc(pref.title||'Trabajo protésico')}"></label><div class="form-grid"><label class="field">Laboratorio<select name="lab_id">${activeLabs.map(l=>`<option value="${l.id}" ${Number(l.id)===Number(preferredLab?.id)?'selected':''}>${esc(l.name)}</option>`).join('')||'<option value="">Sin laboratorio configurado</option>'}</select></label><label class="field">Fecha prevista<input name="due_date" type="date" value="${esc(pref.due_date||today())}"></label></div><label class="field">Estado<select name="status">${['recibido','enviado','prueba','terminado','entregado'].map(status=>`<option value="${status}" ${(pref.status||'recibido')===status?'selected':''}>${status[0].toUpperCase()+status.slice(1)}</option>`).join('')}</select></label><button class="primary">Guardar trabajo</button></form>`;
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
  if(kind==='doc'){ const d=db.documents.find(x=>Number(x.id)===Number(id)); const p=patient(d?.patient_id); return d?`<section class="print-document"><h1>${esc(d.title)}</h1><p>${esc(patientFullName(p))}</p><pre>${esc(d.text)}</pre><small>Estado ${esc(d.status)} · v${esc(d.version||1)} · hash ${esc(d.hash||'pendiente')}</small></section>`:''; }
  const b=budgetFinancialRows().find(x=>Number(x.id)===Number(id)); const p=patient(b?.patient_id);
  return b?`<section class="print-document"><h1>${esc(b.title)}</h1><p>${esc(patientFullName(p))}</p><div class="finance-summary"><div><span>Total</span><b>${b.total.toFixed(2)} EUR</b></div><div><span>Cobrado</span><b>${b.paid.toFixed(2)} EUR</b></div><div><span>Pendiente</span><b>${b.pending.toFixed(2)} EUR</b></div></div></section>`:'';
}
function printClinicalDocument(value){
  const [kind,id]=String(value).split(':');
  const html=printableDocumentHtml(kind,Number(id));
  const modal=$('#consentModal');
  modal.innerHTML=`<form method="dialog" class="modal-card print-preview-modal"><div class="modal-title"><h2>Vista imprimible</h2><button class="icon-btn" value="cancel">x</button></div><div class="print-document">${html}</div><button class="primary" type="button" id="browserPrintBtn">Imprimir / guardar PDF</button></form>`;
  modal.showModal();
  $('#browserPrintBtn').onclick=()=>window.print();
}
function downloadClinicalPdf(value){
  if(!requirePin('exportar PDF clinico')) return;
  const [kind,id]=String(value).split(':');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Denty PDF</title><style>body{font-family:Arial,sans-serif;color:#172f3d;padding:28px}pre{white-space:pre-wrap;font-family:inherit}.finance-summary{display:flex;gap:12px}.finance-summary div{border:1px solid #ddd;padding:10px}</style></head><body>${printableDocumentHtml(kind,Number(id))}</body></html>`;
  const blob=new Blob([html],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`denty-${kind}-${id}.pdf.html`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
  recordAudit('document.pdf.export', state.patientId, value);
  persist();
}

bindAccountGateway(); bindTop(); applyAppearance(); render();
window.DentyAppReady=true;

})();
