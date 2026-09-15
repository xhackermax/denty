export const DB_KEY = 'denty_web_vercel_preview_1_6_terminal';
export const PREVIOUS_KEYS = ['denty_web_vercel_preview_1_5_admin','denty_web_vercel_preview_1_4_voice','denty_web_vercel_preview_1_3_3_settings_panels','denty_web_vercel_preview_1_3_clinical_nlu','denty_web_vercel_preview_0_7_clinical_planning','denty_web_vercel_preview_0_7_treatment_plans_consents','denty_web_vercel_preview_0_6_3_split_perio','denty_web_vercel_preview_0_6_2_perio_position','denty_web_vercel_preview_0_6_1_layout05_better_teeth','denty_web_vercel_preview_0_5_denty_apk_catalog','denty_web_vercel_preview_0_4_odonto_apk_like','denty_web_vercel_preview_0_3_functional_apk','denty_web_vercel_preview_0_2_visual_apk','denty_web_vercel_preview_0_1'];
export const FDI_UPPER = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
export const FDI_LOWER = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];
export const FDI_ALL = [...FDI_UPPER, ...FDI_LOWER];
export const SURFACES = ['V','M','O','D','P'];
export const PERIO_SITES = ['mv','v','dv','ml','lp','dl'];
export const DOCTOR_COLORS = ['#409bd7','#ef941f','#e66c9e','#23a98b','#7c6ee6'];
export const STATUS_ORDER = ['healthy','filling','filling_bad','filling_pending','crown','crown_bad','crown_pending','endo','endo_bad','endo_indicated','post','post_bad','post_pending','implant','implant_review','implant_indicated','prosthesis','prosthesis_bad','prosthesis_pending','removable','removable_bad','removable_pending','caries','extraction','missing'];
export const STATUS_LABELS = {
  healthy:'Sano final', filling:'Obturación correcta', filling_bad:'Obturación insatisfactoria', filling_pending:'Obturación pendiente', crown:'Corona correcta', crown_bad:'Corona insatisfactoria', crown_pending:'Corona pendiente', endo:'Endodoncia realizada', endo_bad:'Endodoncia a retratar', endo_indicated:'Endodoncia indicada', post:'Perno correcto', post_bad:'Perno insatisfactorio', post_pending:'Perno pendiente', implant:'Implante correcto', implant_review:'Implante a revisar', implant_indicated:'Implante indicado', prosthesis:'Puente / prótesis fija correcta', prosthesis_bad:'Puente insatisfactorio', prosthesis_pending:'Puente pendiente', removable:'Prótesis removible correcta', removable_bad:'Prótesis removible insatisfactoria', removable_pending:'Prótesis removible pendiente', caries:'Caries', extraction:'Extracción indicada', missing:'Ausente'
};
export const ODONTO_LEGEND_MAIN = ['caries','filling','crown','endo','post','implant','prosthesis','removable','healthy','missing','extraction'];
export const ODONTO_LEGEND_CYCLES = {
  filling:['filling','filling_bad','filling_pending'],
  crown:['crown','crown_bad','crown_pending'],
  endo:['endo','endo_bad','endo_indicated'],
  post:['post','post_bad','post_pending'],
  implant:['implant','implant_review','implant_indicated'],
  prosthesis:['prosthesis','prosthesis_bad','prosthesis_pending'],
  removable:['removable','removable_bad','removable_pending']
};
export const ODONTO_LEGEND_BASE_LABELS = {
  caries:'Caries', filling:'Obturación', crown:'Corona', endo:'Endodoncia', post:'Perno', implant:'Implante', prosthesis:'Puente / prótesis fija', removable:'Prótesis removible', healthy:'Sano final', missing:'Ausente', extraction:'Extracción indicada'
};
export const ODONTO_LEGEND_STATE_LABELS = {
  filling:['Correcto','Insatisfactorio','Pendiente'], crown:['Correcto','Insatisfactorio','Pendiente'], endo:['Realizada','A retratar','Indicada'], post:['Correcto','Insatisfactorio','Pendiente'], implant:['Correcto','A revisar','Indicado'], prosthesis:['Correcto','Insatisfactorio','Pendiente'], removable:['Correcto','Insatisfactoria','Pendiente']
};
export const ODONTO_LEGEND_META = Object.freeze({
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
export const WHOLE_TOOTH_CODES = new Set(['healthy','crown','crown_bad','crown_pending','endo','endo_bad','endo_indicated','post','post_bad','post_pending','implant','implant_review','implant_indicated','prosthesis','prosthesis_bad','prosthesis_pending','removable','removable_bad','removable_pending','extraction','missing']);
export const SURFACE_CODES = new Set(['caries','filling','filling_bad','filling_pending']);

export const DEFAULT_SITES = Object.freeze([
  {id:1,name:'Avenida Navarra 17, Zaragoza',active:true,address:'Avenida Navarra 17, Zaragoza',phone:'',email:''},
  {id:2,name:'Paseo Damas',active:true,address:'Paseo Damas 32, 1ºC, Zaragoza',phone:'600 891 594',email:''},
  {id:3,name:'Cariñena',active:true,address:'Cariñena, Zaragoza',phone:'',email:''}
]);
export const DEFAULT_LABS = Object.freeze([
  {id:1,name:'Laboratorio principal',contact:'',phone:'',email:'',notes:'',active:true}
]);
export const DEFAULT_EMPLOYEES = Object.freeze([
  {id:1,name:'Dr. Máximo',role:'odontólogo',doctor_id:1,site:'Avenida Navarra 17, Zaragoza',site_id:1,phone:'',active:true,color:DOCTOR_COLORS[0]},
  {id:2,name:'Dr. Isaac',role:'odontólogo',doctor_id:2,site:'Paseo Damas',site_id:2,phone:'',active:true,color:DOCTOR_COLORS[1]},
  {id:3,name:'Dra. Seneida',role:'odontóloga',doctor_id:3,site:'Avenida Navarra 17, Zaragoza',site_id:1,phone:'',active:true,color:DOCTOR_COLORS[2]}
]);
export const DEFAULT_SHIFTS = Object.freeze([
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
export const DEFAULT_CONSENTS = Object.freeze([
  {id:1,title:"Consentimiento protésico",version:2,active:true,signers:['Paciente','Profesional'],text:"CONSENTIMIENTO PROTÉSICO\n\nDiagnóstico y objetivo: rehabilitar forma, función, estética y estabilidad oclusal mediante corona, puente, prótesis removible o prótesis sobre implantes.\n\nBeneficios esperados: recuperar masticación, proteger dientes debilitados, mejorar estética y mantener espacios.\n\nRiesgos y limitaciones: sensibilidad, descementado, fractura de cerámica o estructura, necesidad de ajustes oclusales, mantenimiento, higiene estricta y posible repetición si cambia el soporte dentario o periodontal.\n\nAlternativas: no tratar, obturación, incrustación, extracción y reposición con implante, puente o removible según el caso.\n\nCuidados posteriores: revisiones, higiene, uso de férula si procede y acudir ante dolor, movilidad o fractura.\n\nFirma: declaro haber recibido explicación suficiente, haber podido preguntar y aceptar el tratamiento propuesto."},
  {id:2,title:"Consentimiento ortodóncico",version:2,active:true,signers:['Paciente','Profesional'],text:"CONSENTIMIENTO ORTODÓNCICO\n\nDiagnóstico y objetivo: corregir posición dentaria, oclusión, estética y función con aparatología fija, removible o alineadores.\n\nBeneficios esperados: mejorar alineación, higiene, estabilidad oclusal y estética.\n\nRiesgos y limitaciones: molestias, llagas, descalcificaciones, caries, reabsorción radicular, pérdida de encía, recidiva, necesidad de colaboración, uso de retenedores y posibles refinamientos.\n\nAlternativas: no tratar, tratamiento limitado, restaurador/protésico, extracción o cirugía ortognática según diagnóstico.\n\nFirma: comprendo la duración estimada, la importancia de acudir a revisiones y acepto el plan indicado."},
  {id:3,title:"Consentimiento odontopediátrico",version:2,active:true,signers:['Padre/madre/tutor','Profesional'],text:"CONSENTIMIENTO ODONTOPEDIÁTRICO\n\nDiagnóstico y objetivo: realizar tratamiento dental en paciente menor, incluyendo prevención, obturaciones, pulpotomía, pulpectomía, mantenedores o extracciones si procede.\n\nBeneficios esperados: eliminar dolor o infección, conservar espacio, mejorar función y prevenir complicaciones.\n\nRiesgos: molestias, anestesia local, inflamación, fracaso del tratamiento pulpar, necesidad de repetir tratamiento o extraer.\n\nAlternativas: observación, tratamiento diferido, derivación, sedación o anestesia general si el caso lo requiere.\n\nFirma: autorizo el tratamiento y he sido informado de cuidados y controles."},
  {id:4,title:"Consentimiento cirugía de implantes",version:2,active:true,signers:['Paciente','Profesional'],text:"CONSENTIMIENTO PARA CIRUGÍA DE IMPLANTES\n\nDiagnóstico y objetivo: colocar uno o varios implantes dentales para reponer dientes ausentes o soportar prótesis.\n\nBeneficios esperados: mejorar masticación, estabilidad protésica, estética y preservación funcional.\n\nRiesgos: dolor, inflamación, hematoma, infección, sangrado, fracaso de osteointegración, periimplantitis, alteración sensitiva, comunicación sinusal, lesión de estructuras anatómicas y necesidad de injertos o cirugías adicionales.\n\nAlternativas: no reponer, puente, prótesis removible, sobredentadura u otras opciones según el caso.\n\nCuidados: medicación, higiene, dieta blanda, evitar tabaco, revisiones y mantenimiento periódico.\n\nFirma: declaro comprender el procedimiento, costes, fases y posibles complicaciones."},
  {id:5,title:"Consentimiento quirúrgico",version:2,active:true,signers:['Paciente','Profesional'],text:"CONSENTIMIENTO QUIRÚRGICO ODONTOLÓGICO\n\nProcedimiento: cirugía oral, extracción, regeneración, injerto, elevación sinusal, frenectomía u otro acto quirúrgico indicado.\n\nBeneficios: eliminar infección, dolor, dientes no viables o preparar una rehabilitación posterior.\n\nRiesgos: dolor, inflamación, sangrado, infección, alveolitis, comunicación oro-sinusal, parestesia, fractura radicular, necesidad de sutura o nueva intervención.\n\nAlternativas: control, tratamiento conservador, derivación o no intervención con sus riesgos.\n\nFirma: he recibido instrucciones pre y postoperatorias y acepto el procedimiento."},
  {id:6,title:"Consentimiento estético",version:2,active:true,signers:['Paciente','Profesional'],text:"CONSENTIMIENTO ESTÉTICO DENTAL\n\nObjetivo: mejorar color, forma, proporción, alineación visual o armonía de sonrisa mediante blanqueamiento, carillas, composite, mock-up, gingivoplastia u otros procedimientos.\n\nBeneficios: mejora estética y planificación de la sonrisa.\n\nRiesgos y limitaciones: sensibilidad, expectativas no alcanzables al 100%, cambios de color, fracturas, mantenimiento y posible necesidad de repetir o combinar tratamientos.\n\nAlternativas: no tratar, ortodoncia, restauraciones indirectas/directas o tratamiento periodontal.\n\nFirma: entiendo las limitaciones biológicas y estéticas y acepto el plan."},
  {id:7,title:"Consentimiento periodontal",version:2,active:true,signers:['Paciente','Profesional'],text:"CONSENTIMIENTO PERIODONTAL\n\nDiagnóstico y objetivo: tratar gingivitis o periodontitis mediante higiene, raspado y alisado radicular, cirugía periodontal o mantenimiento.\n\nBeneficios: reducir inflamación, sangrado, profundidad de bolsas y riesgo de pérdida dentaria.\n\nRiesgos: sensibilidad, molestias, recesión gingival visible, movilidad transitoria, sangrado y necesidad de mantenimiento periódico.\n\nAlternativas: no tratar, higiene básica, tratamiento por fases, cirugía o derivación periodontal.\n\nFirma: comprendo que el éxito depende de higiene diaria, control de placa, tabaco, revisiones y mantenimiento."}
]);
export const DEFAULT_PROCEDURES = Object.freeze([
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

export function clone(o){ return JSON.parse(JSON.stringify(o)); }
export function normalizeText(t){ return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[,.!?¿¡:;]/g,' ').replace(/\s+/g,' ').trim(); }
export function stripWake(t){ return normalizeText(t).replace(/^\s*(oye\s+)?dent[yi]\s+/, '').replace(/^\s*oye\s+/, '').trim(); }
export function stripWakeRaw(t){ return String(t||'').trim().replace(/^\s*(oye\s+)?dent[yií]\s*,?\s+/i, '').replace(/^\s*oye\s+/i, '').trim(); }
export function titleCase(s){ return String(s||'').trim().split(/\s+/).filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' '); }
export function today(){ return new Date().toISOString().slice(0,10); }
export function weekdayFromDate(date){ const d = new Date(String(date||today())+'T12:00:00'); return (d.getDay()+6)%7; }
export function weekdayName(n){ return ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][Number(n)] || '?'; }
export function shortWeekdayName(n){ return ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][Number(n)] || '?'; }
export function prettyDate(date=today()){ const d = new Date(date+'T12:00:00'); return d.toLocaleDateString('es-ES',{weekday:'long', day:'numeric', month:'long', year:'numeric'}); }
export function patientFullName(p){ return `${p?.first_name||''} ${p?.last_name||''}`.trim() || 'Sin nombre'; }
export function initials(p){ const name=patientFullName(p); return name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase() || 'P'; }

export function defaultDb(){
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


export function migrateDb(input){
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


export function loadDb(storage){
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
export function saveDb(db, storage){ return safeSaveDb(db, storage, 'saveDb'); }
export function id(db){ db.nextId = Number(db.nextId||1); return db.nextId++; }

export function createPatient(db, payload){
  const first = titleCase(payload.first_name || payload.firstName || payload.nombre || '');
  const last = titleCase(payload.last_name || payload.lastName || payload.apellidos || '');
  if(!first) throw new Error('Falta el nombre del paciente');
  const p = {id:id(db), ficha:String(payload.ficha||payload.historia||'').trim(), first_name:first, last_name:last, dni:String(payload.dni||'').trim(), phone:String(payload.phone||payload.telefono||'').trim(), email:String(payload.email||'').trim(), birth_date:String(payload.birth_date||payload.birthDate||'').trim(), archived:false, created_at:new Date().toISOString()};
  db.patients.push(p); ensureOdontogram(db, p.id); return p;
}
export function archivePatient(db, patientId){ const p=db.patients.find(x=>Number(x.id)===Number(patientId)); if(!p) throw new Error('Paciente no encontrado'); p.archived=true; p.archived_at=new Date().toISOString(); return p; }
export function restorePatient(db, patientId){ const p=db.patients.find(x=>Number(x.id)===Number(patientId)); if(!p) throw new Error('Paciente no encontrado'); p.archived=false; p.restored_at=new Date().toISOString(); return p; }

function defaultPerioFlags(){ return {mv:false,v:false,dv:false,ml:false,lp:false,dl:false}; }
function defaultPerioBlock(){ return {depths:{mv:'',v:'',dv:'',ml:'',lp:'',dl:''}, recession:{mv:'',v:'',dv:'',ml:'',lp:'',dl:''}, bleeding:defaultPerioFlags(), suppuration:defaultPerioFlags(), plaque:defaultPerioFlags(), furcation:'0', mobility:'0'}; }
function defaultPositionBlock(){ return {mesialization:false, distalization:false, extrusion:false, intrusion:false, rotation:false, vestibuloversion:false, linguoversion:false, recessionVisible:false, mobility:'0'}; }
function defaultToothRecord(){ return {status:'healthy', surfaces:{}, periodontal:defaultPerioBlock(), position:defaultPositionBlock()}; }
export function ensureOdontogram(db, patientId){
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
export function odontogramToothKind(tooth){
  const n=Number(String(tooth).slice(1));
  if([1,2].includes(n)) return 'incisor';
  if(n===3) return 'canine';
  if([4,5].includes(n)) return 'premolar';
  return 'molar';
}
export function occlusalSurfaceForTooth(tooth){ return ['incisor','canine'].includes(odontogramToothKind(tooth)) ? 'I' : 'O'; }
export function normalizeSurfaceForTooth(tooth, surface){
  const s=String(surface||'').toUpperCase();
  if(s==='P' || s==='L') return 'P';
  if(s==='O' || s==='I') return occlusalSurfaceForTooth(tooth);
  return SURFACES.includes(s) ? s : '';
}
export function legendVariant(base, index=0){ const cycle=ODONTO_LEGEND_CYCLES[base]; return cycle ? cycle[((Number(index)||0)%cycle.length+cycle.length)%cycle.length] : base; }
export function legendLabel(base, index=0){ const code=legendVariant(base,index); return STATUS_LABELS[code] || ODONTO_LEGEND_BASE_LABELS[base] || base; }
export function legendStateText(base,index=0){ const arr=ODONTO_LEGEND_STATE_LABELS[base]; if(arr) return arr[((Number(index)||0)%arr.length+arr.length)%arr.length]; if(base==='caries') return 'Patología'; if(base==='healthy') return 'Sano final'; if(base==='missing') return 'Ausente'; if(base==='extraction') return 'Indicado'; return ''; }
export function legendNextIndex(base,index=0){ const arr=ODONTO_LEGEND_CYCLES[base]; return arr ? (((Number(index)||0)+1) % arr.length) : 0; }
export function statusTone(code){
  if(code==='healthy') return 'green';
  if(code==='missing') return 'missing';
  if(code==='caries' || code==='extraction' || String(code).endsWith('_pending') || String(code).endsWith('_indicated')) return 'red';
  if(String(code).endsWith('_bad') || code==='implant_review') return 'blue-red';
  return 'blue';
}
export function setToothLegendState(db, patientId, tooth, code, surface=''){
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
export function clearToothSurface(db, patientId, tooth, surface){
  const t=String(tooth), s=normalizeSurfaceForTooth(t, surface);
  const od=ensureOdontogram(db, patientId);
  if(od[t] && s) delete od[t].surfaces[s];
  return od[t];
}

export function toothStatusNext(current){ return STATUS_ORDER[(STATUS_ORDER.indexOf(current)+1) % STATUS_ORDER.length] || 'healthy'; }
export function setToothPrimaryState(db, patientId, tooth, status){ if(!FDI_ALL.includes(String(tooth))) throw new Error('Diente FDI no válido'); const od=ensureOdontogram(db,patientId); od[String(tooth)].status=status; return od[String(tooth)]; }
export function setToothSurfaceState(db, patientId, tooth, surface, status){ if(!FDI_ALL.includes(String(tooth))) throw new Error('Diente FDI no válido'); const s=normalizeSurfaceForTooth(tooth, surface); if(!s) throw new Error('Superficie no válida'); const od=ensureOdontogram(db, patientId); od[String(tooth)].surfaces[s]=status; return od[String(tooth)]; }
export function markArcadeMissing(db, patientId, arcade){ const arr=arcade==='superior'?FDI_UPPER:FDI_LOWER; const od=ensureOdontogram(db, patientId); arr.forEach(t=>{ od[t].status='missing'; od[t].surfaces={}; }); return arr; }

export function splitName(full){
  const parts = titleCase(full).split(/\s+/).filter(Boolean);
  if(parts.length <= 1) return {first_name: parts[0] || '', last_name: ''};
  return {first_name: parts[0], last_name: parts.slice(1).join(' ')};
}
export function parsePatientName(text){
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
export function expandFdiRange(a,b){ for(const seq of [FDI_UPPER, FDI_LOWER]){ const ia=seq.indexOf(String(a)), ib=seq.indexOf(String(b)); if(ia!==-1&&ib!==-1){ const [lo,hi]=ia<ib?[ia,ib]:[ib,ia]; const slice=seq.slice(lo,hi+1); return ia<=ib?slice:slice.reverse(); } } return null; }
export function parseFdiRange(text){ const m=normalizeText(text).match(/\b(\d{2})\s*(?:hasta|a|al|entre|-|–)\s*(?:el\s+)?(\d{2})\b/); return m?expandFdiRange(m[1],m[2]):null; }

export function minutes(time){ const [h,m]=String(time||'00:00').split(':').map(Number); return (h||0)*60+(m||0); }
export function minutesToTime(n){ const h=Math.floor(n/60), m=n%60; return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }
export function durationMinutes(start,end){ return Math.max(0, minutes(end)-minutes(start)); }
export function addMinutes(start,n){ return minutesToTime(minutes(start)+Number(n||0)); }
export function overlaps(a,b){ return a.date===b.date && Number(a.employee_id)===Number(b.employee_id) && minutes(a.start_time)<minutes(b.end_time) && minutes(a.end_time)>minutes(b.start_time); }
export function appointmentWithMeta(db,a){ const p=db.patients.find(x=>Number(x.id)===Number(a.patient_id)); const emp=db.employees.find(x=>Number(x.id)===Number(a.employee_id)); const start=a.start_time||'10:00'; const end=a.end_time||addMinutes(start, Number(a.duration_minutes||40)); return {...a,start_time:start,end_time:end,duration_minutes:durationMinutes(start,end)||Number(a.duration_minutes||40), patient:p||null, employee:emp||null}; }
export function appointmentsForDate(db,date){ return db.appointments.filter(a=>a.date===date).map(a=>appointmentWithMeta(db,a)).sort((a,b)=>(a.start_time+a.end_time).localeCompare(b.start_time+b.end_time)); }
export function countOverlaps(db,date){ const aps=appointmentsForDate(db,date); let n=0; for(let i=0;i<aps.length;i++) for(let j=i+1;j<aps.length;j++) if(overlaps(aps[i],aps[j])) n++; return n; }
export function cabinetConflict(db, appt){
  const cabinetId=Number(appt.cabinet_id||1);
  if(!cabinetId) return null;
  const start=appt.start_time||'10:00', end=appt.end_time||addMinutes(start, appt.duration_minutes||40);
  return db.appointments.find(a=>Number(a.cabinet_id||1)===cabinetId&&a.date===appt.date&&String(a.id)!==String(appt.id)&&minutes(start)<minutes(a.end_time||addMinutes(a.start_time,40))&&minutes(end)>minutes(a.start_time||'10:00'))||null;
}
export function agendaCounters(db,date){ const aps=appointmentsForDate(db,date); return {total:aps.length, confirmed:aps.filter(a=>a.confirmed||a.status==='confirmada').length, waiting:aps.filter(a=>a.status==='espera').length, overlaps:countOverlaps(db,date), cabinetConflicts:aps.filter(a=>cabinetConflict(db,a)).length, conflicts:aps.filter(a=>a.availability_status&&a.availability_status!=='ok').length}; }
export function agendaByDoctors(db,date){ return db.employees.filter(e=>e.active!==false).map(emp => ({employee:emp, shifts:employeeShiftsForDate(db, emp.id, date), absences:employeeAbsencesForDate(db, emp.id, date), appointments:appointmentsForDate(db,date).filter(a=>Number(a.employee_id)===Number(emp.id))})); }
export function agendaByHours(db,date,{start='09:00',end='20:00',step=20}={}){ const slots=[]; for(let t=minutes(start); t<minutes(end); t+=step) slots.push({time:minutesToTime(t)}); return {date, step, columns:agendaByDoctors(db,date), slots}; }
export function employeeShiftsForDate(db,employeeId,date){ const w=weekdayFromDate(date); return db.shifts.filter(s=>Number(s.employee_id)===Number(employeeId)&&Number(s.weekday)===w).sort((a,b)=>a.start_time.localeCompare(b.start_time)); }
export function employeeAbsencesForDate(db,employeeId,date){ return db.absences.filter(a=>Number(a.employee_id)===Number(employeeId)&&!a.cancelled&&date>=a.start_date&&date<=(a.end_date||a.start_date)); }
export function appointmentAvailability(db, appt){
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

export function simpleHash(input){ let h1=0x811c9dc5, h2=0x45d9f3b; const s=String(input||''); for(let i=0;i<s.length;i++){ h1^=s.charCodeAt(i); h1=Math.imul(h1,0x01000193); h2^=s.charCodeAt(i); h2=Math.imul(h2,0x27d4eb2d); } return ((h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0')); }

export const PLAN_PRIORITY_RANK = {urgente:0, alta:1, media:2, baja:3};
export function defaultPlanSteps(kind='general'){
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
export function createTreatmentPlan(db,{patient_id,title='',priority='media',deadline='',kind='',type='',steps=[],items=[]}={}){
  if(!patient_id) throw new Error('Falta paciente'); if(!db.treatmentPlans) db.treatmentPlans=[];
  const effectiveKind=kind||type||'general';
  const rawSteps = steps.length ? steps : (items.length ? items.map(x=>({title:String(x)})) : defaultPlanSteps(effectiveKind));
  const planSteps=rawSteps.map((s,i)=>{ const txt=s.title||String(s)||'Paso clínico'; const c=classifyTreatmentPriority(txt); return {id:id(db), title:txt, phase:s.phase||c.phase, priority:Number(s.priority_level||c.level), priority_label:s.priority||priority, deadline:s.deadline||deadline||'', deadline_days:Number(s.deadline_days||c.deadline_days), order:Number(s.order||i+1), duration:Number(s.duration||45), reason:s.reason||txt, detail:s.detail||'', status:s.status||'pendiente', appointment_id:s.appointment_id||null}; }).sort((a,b)=>a.priority-b.priority||a.order-b.order);
  const plan={id:id(db), patient_id:Number(patient_id), type:effectiveKind, title:title||'Plan de tratamiento', priority, deadline, status:'activo', hierarchy:'Denty clinical priority v1.3', created_at:new Date().toISOString(), steps:planSteps};
  db.treatmentPlans.push(plan); return plan;
}
export function treatmentPlanHierarchy(db, patient_id){
  return (db.treatmentPlans||[]).filter(p=>Number(p.patient_id)===Number(patient_id)).sort((a,b)=>(PLAN_PRIORITY_RANK[a.priority]??9)-(PLAN_PRIORITY_RANK[b.priority]??9)||String(a.deadline||'9999-12-31').localeCompare(String(b.deadline||'9999-12-31'))||Number(a.id)-Number(b.id)).map(plan=>({...plan, steps:[...(plan.steps||[])].sort((a,b)=>(PLAN_PRIORITY_RANK[a.priority]??9)-(PLAN_PRIORITY_RANK[b.priority]??9)||String(a.deadline||plan.deadline||'9999-12-31').localeCompare(String(b.deadline||plan.deadline||'9999-12-31'))||Number(a.order||0)-Number(b.order||0))}));
}
export function schedulePlanStepToAgenda(db,{plan_id,step_id,date,start_time='10:00',employee_id,site=''}){
  const plan=(db.treatmentPlans||[]).find(p=>Number(p.id)===Number(plan_id)); if(!plan) throw new Error('Plan no encontrado');
  const step=(plan.steps||[]).find(s=>Number(s.id)===Number(step_id)); if(!step) throw new Error('Paso no encontrado');
  const start=start_time||'10:00'; const end=addMinutes(start, Number(step.duration||45));
  const appt={id:id(db), patient_id:Number(plan.patient_id), employee_id:Number(employee_id||db.employees?.[0]?.id||0), date:date||today(), start_time:start, end_time:end, duration_minutes:durationMinutes(start,end), title:step.title, reason:step.reason||step.title, detail:step.detail||'', status:'programada', site, confirmed:false, plan_id:plan.id, plan_step_id:step.id, phase:step.phase, hierarchy_label:`${plan.priority||'media'} · ${step.phase||'Tratamiento'} · paso ${step.order||1}`, created_at:new Date().toISOString()};
  db.appointments.push(appt); step.status='agendada'; step.appointment_id=appt.id; return appt;
}

export function createConsentDocument(db,{patient_id,consent_id,title}){ const c=db.consents.find(x=>Number(x.id)===Number(consent_id))||db.consents[0]; if(!patient_id) throw new Error('Falta paciente'); const doc={id:id(db),patient_id:Number(patient_id),consent_id:c?.id||null,title:title||c?.title||'Consentimiento',version:c?.version||1,text:c?.text||'',status:'borrador',created_at:new Date().toISOString(),signature_data:'',signer_name:'',accepted:false,locked_at:'',hash:'',signature_audit:null}; db.documents.push(doc); return doc; }
export function signDocument(db, docId, {signature_data, signer_name, accepted=false, device_info=''}){ const doc=db.documents.find(d=>Number(d.id)===Number(docId)); if(!doc) throw new Error('Documento no encontrado'); if(doc.locked_at) throw new Error('Documento firmado y bloqueado'); if(!signature_data) throw new Error('Falta la firma'); if(!accepted) throw new Error('Falta aceptar el consentimiento'); doc.signature_data=signature_data; doc.signer_name=signer_name||''; doc.accepted=true; doc.status='firmado'; doc.signed_at=new Date().toISOString(); doc.locked_at=doc.signed_at; doc.signature_audit={device_info, signed_at:doc.signed_at, consent_version:doc.version, text_length:String(doc.text||'').length}; doc.hash=simpleHash(JSON.stringify({id:doc.id,patient_id:doc.patient_id,title:doc.title,text:doc.text,signed_at:doc.signed_at,signer_name:doc.signer_name,signature_data,accepted:true,device_info})); db.consent_history=Array.isArray(db.consent_history)?db.consent_history:[]; db.consent_history.push({id:id(db),document_id:doc.id,patient_id:doc.patient_id,version:doc.version,hash:doc.hash,locked_at:doc.locked_at,action:'signed'}); return doc; }
export function patientDetailActions(){ return [
  {id:'appointment',label:'Nueva cita'}, {id:'work',label:'Nuevo trabajo'}, {id:'budget',label:'Nuevo presupuesto'}, {id:'payment',label:'Registrar pago'}, {id:'odontogram',label:'Odontograma'}, {id:'documents',label:'Documentos firmados'}, {id:'alerts',label:'Alertas'}, {id:'files',label:'Archivos'}
]; }

export function isSettledPayment(payment){
  const status=String(payment?.status||'').toLowerCase();
  return status==='paid'||status==='successful';
}
export function paymentAmountForBudget(db,budgetId){
  return (db?.payments||[]).filter(p=>Number(p.budget_id)===Number(budgetId)&&isSettledPayment(p)).reduce((sum,p)=>sum+Number(p.amount||0),0);
}

export function mapHeaders(headers){
  const wanted = {ficha:['ficha','historia','historia clinica','numero de ficha','n ficha','num ficha','hc','id paciente','codigo'],first_name:['nombre','name','first name'],last_name:['apellidos','apellido','surname','last name'],dni:['dni','nie','nif','documento'],phone:['telefono','teléfono','movil','móvil','phone'],email:['email','correo','mail'],birth_date:['fecha nacimiento','nacimiento','birth']};
  const mapping = {}; const normHeaders = headers.map(h => [h, normalizeText(h)]);
  for(const [field, aliases] of Object.entries(wanted)){ const found=normHeaders.find(([,nh])=>aliases.some(a=>nh.includes(normalizeText(a)))); if(found) mapping[field]=found[0]; }
  return mapping;
}
export function splitCsvLine(line, delimiter){ const out=[]; let cur='', quote=false; for(let i=0;i<line.length;i++){ const ch=line[i]; if(ch==='"'&&line[i+1]==='"'){cur+='"';i++;continue;} if(ch==='"'){quote=!quote;continue;} if(ch===delimiter&&!quote){out.push(cur);cur='';continue;} cur+=ch; } out.push(cur); return out; }
export function csvRows(text){ const sample=String(text||'').slice(0,1000); const semi=(sample.match(/;/g)||[]).length, comma=(sample.match(/,/g)||[]).length, tab=(sample.match(/\t/g)||[]).length; const delimiter=tab>semi&&tab>comma?'\t':semi>=comma?';':','; const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean); const headers=splitCsvLine(lines.shift()||'', delimiter).map(h=>h.trim()); const rows=lines.map(line=>Object.fromEntries(splitCsvLine(line,delimiter).map((v,i)=>[headers[i]||`Columna ${i+1}`,String(v||'').trim()]))); return {headers, rows, mapping:mapHeaders(headers)}; }
export function patientFromRow(row,mapping){ const data={}; Object.entries(mapping||{}).forEach(([field,header])=>data[field]=row[header]||''); if(!data.first_name&&row.Nombre)data.first_name=row.Nombre; if(!data.last_name&&row.Apellidos)data.last_name=row.Apellidos; return data; }

export function runAction(db, text, context={}){
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
export function stableHashText(text){
  let h1=0x811c9dc5, h2=0x01000193;
  for(let i=0;i<text.length;i++){ h1 ^= text.charCodeAt(i); h1 = Math.imul(h1, 16777619); h2 = Math.imul(h2 ^ text.charCodeAt(i), 2166136261); }
  return (h1>>>0).toString(16).padStart(8,'0') + (h2>>>0).toString(16).padStart(8,'0') + String(text.length).padStart(8,'0') + (text.length * 2654435761 >>> 0).toString(16).padStart(8,'0');
}
export function createRecoverySnapshot(db, reason='autosave'){
  const payload = JSON.stringify(migrateDb(db));
  return {id:`recovery-${Date.now()}-${Math.random().toString(16).slice(2)}`, reason, version:migrateDb(db).version, created_at:new Date().toISOString(), size:payload.length, payload_hash:stableHashText(payload), payload};
}
export function recoverDbFromSnapshots(snapshots=[]){
  const ordered=[...(Array.isArray(snapshots)?snapshots:[])].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  for(const snap of ordered){ try{ const db=JSON.parse(snap.payload); if(db && typeof db==='object') return migrateDb(db); }catch{} }
  return null;
}
export function validateStorageHealth(storage){
  if(!storage) return {ok:false, quotaLikely:false, message:'Sin almacenamiento disponible'};
  const probe=`denty_probe_${Date.now()}`;
  try{ storage.setItem(probe,'ok'); const ok=storage.getItem(probe)==='ok'; storage.removeItem(probe); return {ok, quotaLikely:false, message:ok?'Almacenamiento local operativo':'No se pudo leer el valor escrito'}; }
  catch(err){ return {ok:false, quotaLikely:/quota|exceed|full/i.test(String(err?.message||err)), message:String(err?.message||err)}; }
}
export function safeSaveDb(db, storage, reason='autosave'){
  if(!storage) return db;
  const migrated=migrateDb(db);
  const snap=createRecoverySnapshot(migrated, reason);
  let snaps=[]; try{ snaps=JSON.parse(storage.getItem(RECOVERY_KEY)||'[]'); if(!Array.isArray(snaps)) snaps=[]; }catch{}
  snaps.unshift(snap); snaps=snaps.slice(0,Math.max(1,Math.min(50,Number(migrated.settings?.backup?.retention||12))));
  storage.setItem(RECOVERY_KEY, JSON.stringify(snaps));
  storage.setItem(DB_KEY, JSON.stringify(migrated));
  return migrated;
}

export const CLINICAL_PHASES = [
  {key:'urgency', label:'Urgencia / dolor / infección', rank:1, deadline_days:0},
  {key:'etiologic', label:'Control etiológico y periodontal', rank:2, deadline_days:7},
  {key:'restorative', label:'Restauradora / endodoncia', rank:3, deadline_days:21},
  {key:'surgery', label:'Cirugía / implantes', rank:4, deadline_days:45},
  {key:'prosthetic', label:'Prótesis definitiva', rank:5, deadline_days:90},
  {key:'maintenance', label:'Mantenimiento', rank:6, deadline_days:180}
];
export function classifyTreatmentPriority(text=''){
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
export function schedulePlanStep(db,{patient_id,plan_id,step_id,date,start_time='10:00',employee_id}={}){
  const appt=schedulePlanStepToAgenda(db,{plan_id,step_id,date,start_time,employee_id});
  appt.motive=appt.reason||appt.title;
  appt.detail_clinical=appt.detail || `Plan ${appt.plan_id}: ${appt.title}. Fase: ${appt.phase||''}.`;
  appt.step_id=appt.plan_step_id;
  return appt;
}

export const CONSENT_DEFINITIONS = {
  implant:{title:'Consentimiento informado de cirugía de implantes', diagnosis:['Ausencia dentaria o diente no mantenible y necesidad de rehabilitación fija/removible sobre implantes.'], benefits:['Mejorar función masticatoria','Mejorar estabilidad protésica','Preservar planificación rehabilitadora'], risks:['dolor, inflamación, hematoma o infección','fracaso de osteointegración','lesión de estructuras anatómicas cercanas','necesidad de injertos o cirugías adicionales'], alternatives:['no tratar','prótesis removible','puente dentosoportado si está indicado'], postcare:['higiene y revisiones','no fumar en fase de cicatrización','seguir medicación indicada'], requiresSignedAcceptance:true},
  periodontal:{title:'Consentimiento informado periodontal', diagnosis:['Enfermedad periodontal o riesgo periodontal que requiere diagnóstico y tratamiento causal.'], benefits:['reducir inflamación','controlar bolsas periodontales','mantener dientes y salud periimplantaria'], risks:['sensibilidad','recesión gingival visible','sangrado o molestias temporales'], alternatives:['mantenimiento sin raspado','derivación periodontal','no tratar'], postcare:['higiene interdental','mantenimiento periódico','reevaluación'], requiresSignedAcceptance:true},
  endodontic:{title:'Consentimiento informado de endodoncia', diagnosis:['Patología pulpar o periapical que requiere tratamiento de conductos.'], benefits:['mantener el diente','tratar dolor o infección','permitir restauración posterior'], risks:['fractura instrumental','persistencia de lesión','necesidad de retratamiento o extracción'], alternatives:['extracción','control farmacológico temporal','derivación'], postcare:['restauración definitiva','revisión radiográfica','evitar sobrecarga'], requiresSignedAcceptance:true},
  prosthetic:{title:'Consentimiento informado protésico', diagnosis:['Necesidad de rehabilitación mediante prótesis fija o removible.'], benefits:['recuperar función','mejorar estética','proteger estructuras remanentes'], risks:['descementado','fractura cerámica/resina','ajustes oclusales posteriores'], alternatives:['no tratar','implantes','prótesis removible u otras opciones'], postcare:['revisiones','higiene','uso de férula si procede'], requiresSignedAcceptance:true},
  general:{title:'Consentimiento informado odontológico general', diagnosis:['Procedimiento odontológico indicado tras diagnóstico clínico.'], benefits:['mejorar salud oral','prevenir progresión','restaurar función'], risks:['molestias transitorias','necesidad de tratamientos adicionales','fracaso o complicación biológica'], alternatives:['no tratar','tratamiento alternativo','derivación'], postcare:['seguir instrucciones','acudir a revisiones','consultar ante dolor o inflamación'], requiresSignedAcceptance:true}
};
export function prepareConsentDocument(db,{patient_id,consent_type='general',plan_id=null}={}){
  if(!db.documents) db.documents=[]; const def=CONSENT_DEFINITIONS[consent_type]||CONSENT_DEFINITIONS.general;
  const sections={diagnosis:def.diagnosis, benefits:def.benefits, risks:def.risks, alternatives:def.alternatives, postcare:def.postcare};
  const text=`${def.title}\n\nDiagnóstico: ${sections.diagnosis.join(' ')}\nBeneficios: ${sections.benefits.join('; ')}\nRiesgos: ${sections.risks.join('; ')}\nAlternativas: ${sections.alternatives.join('; ')}\nCuidados: ${sections.postcare.join('; ')}`;
  const doc={id:id(db), patient_id:Number(patient_id||db.patients?.[0]?.id||1), plan_id, consent_type, title:def.title, text, sections, status:'pendiente_firma', version:'1.3.3', created_at:new Date().toISOString()};
  db.documents.push(doc); return doc;
}
export function signConsentWithAudit(db, docId,{signature_data,signer_name='',accepted=false,user_agent='web'}={}){
  if(!accepted) throw new Error('Se requiere aceptación explícita antes de firmar');
  if(!signature_data) throw new Error('Se requiere firma digital');
  const doc=(db.documents||[]).find(d=>Number(d.id)===Number(docId)); if(!doc) throw new Error('Documento no encontrado');
  const signed_at=new Date().toISOString(); const raw=`${doc.id}|${doc.text}|${signature_data}|${signer_name}|${signed_at}|1.3`;
  doc.status='firmado'; doc.signature_data=signature_data; doc.signer_name=signer_name; doc.signed_at=signed_at; doc.hash=stableHashText(raw); doc.audit={accepted:true, signed_at, signer_name, user_agent, consent_version:'1.3.3', hash:doc.hash}; return doc;
}

export function validatePatientImportRows(rows=[]){
  const seen=new Set(), validRows=[], duplicates=[], errors=[], warnings=[];
  rows.forEach((row,idx)=>{ const first=String(row.first_name||row.nombre||row.name||'').trim(); const last=String(row.last_name||row.apellidos||'').trim(); const phone=String(row.phone||row.telefono||'').replace(/\s+/g,''); const dni=String(row.dni||row.nif||'').trim().toUpperCase(); const ficha=String(row.ficha||row.historia||'').trim(); const sig=[dni,phone,ficha,normalizeText(`${first} ${last}`)].filter(Boolean).join('|'); if(!first&&!last&&!phone&&!dni){ errors.push({row:idx+1,field:'identity',message:'Fila sin identidad clínica'}); return; } if(seen.has(sig)){ duplicates.push({row:idx+1,signature:sig}); return; } seen.add(sig); if(!phone) warnings.push({row:idx+1,field:'phone',message:'Paciente sin teléfono'}); validRows.push({...row, first_name:first, last_name:last, phone, dni, ficha}); });
  return {validRows, duplicates, errors, warnings};
}

function extractTooth(text){ const m=String(text).match(/\b([1-4][1-8])\b/); return m?m[1]:null; }
function extractSurface(text){ const n=normalizeText(text); if(/oclusal|\bo\b/.test(n)) return 'O'; if(/mesial|\bm\b/.test(n)) return 'M'; if(/distal|\bd\b/.test(n)) return 'D'; if(/vestibular|bucal|\bv\b/.test(n)) return 'V'; if(/lingual|palatino|\bl\b|\bp\b/.test(n)) return 'P'; return ''; }
function extractTreatment(text){ const n=normalizeText(text); if(/implante/.test(n)) return 'implante'; if(/endo/.test(n)) return 'endodoncia'; if(/corona/.test(n)) return 'corona'; if(/limpieza|raspado|period/.test(n)) return 'periodontal'; if(/obtur|empaste/.test(n)) return 'obturación'; return 'tratamiento'; }
export function parseDentalCommand(text, ctx={}){
  const raw=String(text||''); const n=normalizeText(raw); const tooth=extractTooth(raw); const surface=extractSurface(raw);
  if(/caries/.test(n) && tooth) return {intent:'odontogram.mark_surface', confidence:0.92, slots:{tooth, surface:surface||'O', status:'caries'}, requires_confirmation:false, action:'mark_odontogram'};
  const mob=(n.match(/movilidad\s*(\d|i{1,3})/)||[])[1]; const bolsa=(n.match(/bolsa\s*(\d{1,2})/)||[])[1];
  if(tooth && (mob||bolsa)) return {intent:'periodontal.update', confidence:0.86, slots:{tooth, mobility:mob?String(mob).toUpperCase():null, depth_mm:bolsa?Number(bolsa):null, site:surface||'D'}, requires_confirmation:false, action:'update_periodontal'};
  if(/presupuesto|presupuesta|cobra|precio/.test(n) && tooth) return {intent:'budget.create_from_treatment', confidence:0.84, slots:{tooth,treatment:extractTreatment(raw)}, requires_confirmation:true, action:'create_budget'};
  if(/agenda|cita|programa/.test(n) && tooth) return {intent:'agenda.schedule_treatment', confidence:0.8, slots:{tooth,treatment:extractTreatment(raw), date_hint:/jueves/.test(n)?'jueves':null}, requires_confirmation:true, action:'schedule_treatment'};
  return {intent:'unknown', confidence:0.2, slots:{}, requires_confirmation:false, action:'none'};
}
export function applyDentalCommand(db,text,ctx={}){
  const parsed=parseDentalCommand(text,ctx); const pid=Number(ctx.patientId||ctx.patient_id||db.patients?.[0]?.id||1);
  if(parsed.intent==='odontogram.mark_surface'){ setToothLegendState(db,pid,parsed.slots.tooth,'caries',parsed.slots.surface); return {handled:true, ...parsed, message:`Caries registrada en ${parsed.slots.tooth} ${parsed.slots.surface}`}; }
  if(parsed.intent==='periodontal.update'){ const od=ensureOdontogram(db,pid); const rec=od[parsed.slots.tooth]; if(parsed.slots.mobility) rec.periodontal.mobility=parsed.slots.mobility; if(parsed.slots.depth_mm){ const site=parsed.slots.site==='M'?'ml':parsed.slots.site==='V'?'v':parsed.slots.site==='P'?'lp':parsed.slots.site==='D'?'dl':'lp'; rec.periodontal.depths[site]=String(parsed.slots.depth_mm); } return {handled:true,...parsed,message:`Periodontal actualizado en ${parsed.slots.tooth}`}; }
  if(parsed.intent==='budget.create_from_treatment'){ if(!db.budgets) db.budgets=[]; const total=/implante/.test(normalizeText(parsed.slots.treatment))?950:0; const budget={id:id(db), patient_id:pid, title:`${parsed.slots.treatment} ${parsed.slots.tooth}`, total, pending:total, tooth:parsed.slots.tooth, created_at:new Date().toISOString(), source:'NLU dental 1.3'}; db.budgets.push(budget); return {handled:true,...parsed,budget,message:`Presupuesto preparado: ${budget.title}`}; }
  if(parsed.intent==='agenda.schedule_treatment'){ if(!db.appointments) db.appointments=[]; const appt={id:id(db), patient_id:pid, employee_id:db.employees?.[0]?.id||1, date:today(), start_time:'10:00', end_time:'10:40', duration_minutes:40, title:`${parsed.slots.treatment} ${parsed.slots.tooth}`, motive:`${parsed.slots.treatment} ${parsed.slots.tooth}`, detail_clinical:`Cita creada por NLU dental 1.3 para ${parsed.slots.treatment} en ${parsed.slots.tooth}`, status:'programada', source:'NLU dental 1.3'}; db.appointments.push(appt); return {handled:true,...parsed,appointment:appt,message:`Cita preparada: ${appt.title}`}; }
  return {handled:false,...parsed,message:'No he entendido el comando clínico'};
}
