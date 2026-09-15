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
function consentTemplate(id,title,objective,risks='molestias, dolor, inflamacion, sangrado, infeccion, sensibilidad, fracaso parcial o necesidad de tratamientos complementarios segun evolucion clinica'){
  return {id,title,version:3,active:true,signers:['Paciente','Profesional'],text:`${title.toUpperCase()}\n\nProcedimiento informado: ${objective}.\n\nEl profesional ha explicado el diagnostico, la indicacion, las fases previsibles, los beneficios esperados y las limitaciones razonables del tratamiento.\n\nRiesgos y posibles complicaciones: ${risks}. Tambien se ha explicado que ningun tratamiento sanitario garantiza un resultado absoluto y que pueden requerirse controles, ajustes, medicacion o actuaciones adicionales.\n\nAlternativas: no realizar el tratamiento, aplazarlo, optar por tratamiento conservador, quirurgico, protesico, farmacologico o derivacion cuando proceda, con los riesgos de cada alternativa.\n\nCuidados: seguir las instrucciones entregadas, acudir a revisiones, avisar ante dolor intenso, inflamacion, sangrado persistente, fiebre, movilidad, fractura o cualquier signo inesperado.\n\nDeclaro haber recibido informacion suficiente, haber podido preguntar y aceptar el procedimiento indicado.`};
}
export const DEFAULT_CONSENTS = Object.freeze([
  consentTemplate(1,'CI Tratamiento de imagenes','captar, conservar y usar imagenes clinicas para diagnostico, seguimiento, documentacion sanitaria y comunicacion asistencial','perdida de confidencialidad si se comparten indebidamente, uso limitado por finalidad asistencial y revocacion futura segun normativa aplicable'),
  consentTemplate(2,'CI Anestesia','administrar anestesia local o locorregional para permitir el tratamiento dental con control del dolor','hematoma, mordedura accidental, parestesia transitoria o persistente, alergia, mareo, taquicardia o interaccion con medicacion previa'),
  consentTemplate(3,'CI Endodoncia','tratar el conducto radicular de un diente afectado por lesion pulpar o infeccion','dolor postoperatorio, fractura de instrumento, perforacion, persistencia de infeccion, necesidad de retratamiento, cirugia periapical o extraccion'),
  consentTemplate(4,'CI Extraccion simple','extraer una pieza dental no conservable o indicada por motivos clinicos','dolor, inflamacion, sangrado, alveolitis, infeccion, fractura radicular, comunicacion sinusal o necesidad de cirugia complementaria'),
  consentTemplate(5,'CI Implantes','colocar uno o varios implantes dentales para reponer dientes ausentes o soportar protesis','fracaso de osteointegracion, periimplantitis, lesion anatomica, alteracion sensitiva, necesidad de injertos, cirugias adicionales o mantenimiento periodico'),
  consentTemplate(6,'CI Obturaciones','restaurar dientes afectados por caries, fractura o perdida de estructura mediante materiales restauradores','sensibilidad, dolor, filtracion, fractura, necesidad de endodoncia, reemplazo de la obturacion o tratamiento protesico posterior'),
  consentTemplate(7,'CI Antirresortivos (bifosfonatos)','realizar tratamiento dental en paciente con antecedente o uso de farmacos antirresortivos','osteonecrosis maxilar, retraso de cicatrizacion, infeccion, exposicion osea, dolor persistente y necesidad de manejo medico coordinado'),
  consentTemplate(8,'CI Periodoncia','diagnosticar y tratar gingivitis o periodontitis mediante higiene, raspado, alisado radicular, cirugia o mantenimiento','sensibilidad, sangrado, retraccion gingival, movilidad transitoria, molestias, necesidad de mantenimiento y posible progresion si no se controla la enfermedad'),
  consentTemplate(9,'CI Plasma','usar plasma rico en factores de crecimiento como apoyo a cicatrizacion o regeneracion','dolor, inflamacion, hematoma, infeccion, respuesta biologica insuficiente o necesidad de procedimientos adicionales'),
  consentTemplate(10,'CI Procedimiento acido hialuronico','aplicar acido hialuronico con finalidad funcional o estetica en tejidos orales o periorales','inflamacion, hematoma, asimetria, nodulos, infeccion, reaccion local, resultado estetico no esperado o necesidad de retoque'),
  consentTemplate(11,'CI Protesis','rehabilitar dientes o ausencias mediante corona, puente, protesis removible o protesis sobre implantes','sensibilidad, descementado, fractura, rozaduras, ajustes de oclusion, adaptacion funcional, mantenimiento y posible repeticion si cambia el soporte'),
  consentTemplate(12,'CI Tejido liofilizado','emplear tejido liofilizado como material de apoyo en procedimientos regenerativos o quirurgicos','rechazo biologico, exposicion, infeccion, perdida parcial del injerto, cicatrizacion desfavorable o necesidad de nueva intervencion'),
  consentTemplate(13,'CI Cirugia periapical','realizar cirugia en el apice radicular para tratar lesion persistente o infeccion no resuelta','dolor, inflamacion, sangrado, infeccion, alteracion sensitiva, fracaso de cicatrizacion, persistencia de lesion o extraccion posterior'),
  consentTemplate(14,'CI Extraccion tercer molar (cordales)','extraer uno o varios terceros molares por inclusion, dolor, infeccion, falta de espacio u otra indicacion','dolor, inflamacion, trismus, alveolitis, infeccion, lesion del nervio dentario o lingual, comunicacion sinusal y necesidad de controles'),
  consentTemplate(15,'CI Tartrectomia (limpieza dental)','realizar eliminacion de calculo y placa mediante limpieza profesional','sensibilidad, sangrado gingival, molestias transitorias, necesidad de refuerzo de higiene y mantenimiento periodico'),
  consentTemplate(16,'CI Sobredentaduras','rehabilitar mediante sobredentadura soportada por dientes, raices o implantes','rozaduras, perdida de retencion, fractura, necesidad de rebase, mantenimiento de anclajes, inflamacion o fracaso de soportes'),
  consentTemplate(17,'CI Blanqueamiento dental externo','aclarar el color dental mediante agentes blanqueadores externos','sensibilidad, irritacion gingival, resultado desigual, recidiva de color, limitacion en restauraciones y necesidad de mantenimiento'),
  consentTemplate(18,'CI Blanqueamiento dental interno','aclarar un diente tratado endodonticamente mediante agente blanqueador interno','sensibilidad, reabsorcion cervical, cambio insuficiente de color, filtracion, fractura o necesidad de restauracion posterior'),
  consentTemplate(19,'CI Carillas directas de resina compuesta (composite)','mejorar forma, color o posicion aparente mediante composite directo','sensibilidad, pigmentacion, fractura, desgaste, reparaciones, resultado estetico condicionado por mordida e higiene'),
  consentTemplate(20,'CI Injerto de encia','realizar injerto mucogingival para cubrir recesion, aumentar tejido o mejorar estabilidad periodontal','dolor en zona donante, sangrado, inflamacion, necrosis parcial, cicatrizacion insuficiente o necesidad de retoque'),
  consentTemplate(21,'CI Para injertos oseos','realizar injerto oseo para aumentar volumen o preparar rehabilitacion implantologica','infeccion, exposicion de membrana o injerto, perdida parcial, fracaso de integracion, inflamacion o necesidad de nueva cirugia'),
  consentTemplate(22,'CI Regeneracion osea','regenerar defecto oseo mediante biomateriales, membranas o tecnicas quirurgicas indicadas','fracaso parcial, exposicion, infeccion, inflamacion, perdida de material y necesidad de controles o intervenciones adicionales'),
  consentTemplate(23,'CI Sedacion consciente','aplicar sedacion consciente como apoyo para controlar ansiedad o tolerancia del procedimiento','somnolencia, nauseas, respuesta insuficiente, depresion respiratoria, interacciones farmacologicas y necesidad de acompanante o control posterior'),
  consentTemplate(24,'CI Biopsia','tomar una muestra de tejido para estudio anatomopatologico o diagnostico','dolor, sangrado, infeccion, cicatriz, resultado no concluyente, necesidad de nueva muestra o tratamiento posterior')
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
      {id:12,name:'Dr. Máximo',role:'dentist',employee_id:1,active:true,pin_required:false},
      {id:13,name:'Recepción / Secretaría',role:'reception',active:true,pin_required:false}
    ],
    rolePermissions: {
      admin:['pacientes','agenda','clinica','finanzas','ajustes','copias'],
      dentist:['pacientes','agenda','clinica','finanzas','documentos'],
      reception:['pacientes','agenda','finanzas'],
      secretary:['pacientes','agenda','finanzas'],
      secretaria:['pacientes','agenda','finanzas']
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
    agendaBlocks: [],
    appointmentMoves: [],
    treatmentPlans: [],
    clinicalPlanItems: [],
    clinicalAlternativeGroups: [],
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
    patientPortal: {},
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
  for (const key of ['patients','users','cabinets','appointments','agendaBlocks','appointmentMoves','treatmentPlans','clinicalPlanItems','clinicalAlternativeGroups','employees','doctors','sites','shifts','absences','works','labs','budgets','payments','documents','consent_history','consents','procedures','clinicalAlerts','comments','files','tasks','templates','auditLog']) {
    if(!Array.isArray(db[key])) db[key]=clone(base[key]||[]);
  }
  db.rolePermissions = {...base.rolePermissions, ...(db.rolePermissions||{})};
  for (const role of ['dentist','reception','secretary','secretaria']) {
    const permissions = new Set([...(base.rolePermissions[role]||[]), ...(db.rolePermissions[role]||[])]);
    permissions.delete('ajustes');
    permissions.delete('copias');
    db.rolePermissions[role] = [...permissions];
  }
  db.users = db.users.map(u=>{
    const baseUser=(base.users||[]).find(x=>Number(x.id)===Number(u.id));
    return {...baseUser,...u,employee_id:u.employee_id??u.employeeId??baseUser?.employee_id??null};
  });
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
  db.patientPortal = (db.patientPortal && typeof db.patientPortal==='object' && !Array.isArray(db.patientPortal)) ? db.patientPortal : {};
  db.patients = db.patients.map(p => ({
    id: p.id, ficha: p.ficha || p.historia || '', first_name: p.first_name || p.firstName || p.nombre || '', last_name: p.last_name || p.lastName || p.apellidos || '', dni:p.dni||'', phone:p.phone||p.telefono||'', email:p.email||'', birth_date:p.birth_date||p.birthDate||'', archived:!!p.archived, created_at:p.created_at||p.createdAt||new Date().toISOString()
  })).filter(p=>p.id!=null);
  db.appointments = db.appointments.map(a => ({
    id:a.id, patient_id:Number(a.patient_id||a.patientId||0), employee_id:Number(a.employee_id||a.doctorId||1), cabinet_id:Number(a.cabinet_id||1), site_id:a.site_id??null, chain_id:a.chain_id||'', treatment_plan_id:a.treatment_plan_id??null, clinical_item_id:a.clinical_item_id??null, sequence_index:a.sequence_index??null, sequence_total:a.sequence_total??null, rescheduled_from_id:a.rescheduled_from_id??null, date:a.date||today(), start_time:a.start_time||a.time||'10:00', end_time:a.end_time||addMinutes(a.time||'10:00', Number(a.duration||40)), duration_minutes:Number(a.duration_minutes||a.duration||durationMinutes(a.start_time||a.time||'10:00', a.end_time||addMinutes(a.time||'10:00', Number(a.duration||40)))), status:a.status||'programada', title:a.title||'Cita dental', site:a.site||'', confirmed:!!(a.confirmed||a.status==='confirmada'), availability_status:a.availability_status||a.availability724?.level||'ok', availability_message:a.availability_message||'', arrived_at:a.arrived_at||a.check_in_at||a.checked_in_at||'', chair_at:a.chair_at||'', absent_at:a.absent_at||'', completed_at:a.completed_at||'', cancelled_at:a.cancelled_at||'', cancel_reason:a.cancel_reason||'', updated_at:a.updated_at||a.updatedAt||''
  })).filter(a=>a.id!=null);
  db.agendaBlocks = db.agendaBlocks.map((b,i)=>({id:b.id??(i+1),scope:b.scope||'employee',employee_id:b.employee_id??null,cabinet_id:b.cabinet_id??null,site_id:b.site_id??null,date:b.date||today(),start_time:b.start_time||'09:00',end_time:b.end_time||addMinutes(b.start_time||'09:00',Number(b.duration_minutes||60)),reason:b.reason||'Bloqueo',created_by:b.created_by||'',created_at:b.created_at||new Date().toISOString()}));
  db.appointmentMoves = db.appointmentMoves.map((m,i)=>({id:m.id??(i+1),type:m.type||'move',appointment_id:m.appointment_id??null,patient_id:m.patient_id??null,before:m.before||null,after:m.after||null,actor:m.actor||'system',reason:m.reason||'',created_at:m.created_at||new Date().toISOString()}));
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
  const maxId = Math.max(0,...['patients','appointments','agendaBlocks','appointmentMoves','treatmentPlans','clinicalPlanItems','clinicalAlternativeGroups','employees','doctors','sites','shifts','absences','works','labs','budgets','payments','documents','clinicalAlerts','comments','files','tasks','templates','procedures','consents','users','cabinets'].flatMap(k => (db[k]||[]).map(x=>Number(x.id)||0)));
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
function defaultToothRecord(){ return {status:'healthy', whole_states:[], surfaces:{}, periodontal:defaultPerioBlock(), position:defaultPositionBlock()}; }
export function ensureOdontogram(db, patientId){
  const key = String(patientId||'demo');
  if(!db.odontograms) db.odontograms={};
  if(!db.odontograms[key]) db.odontograms[key] = Object.fromEntries(FDI_ALL.map(t => [t, defaultToothRecord()]));
  for(const t of FDI_ALL){
    if(typeof db.odontograms[key][t] === 'string') db.odontograms[key][t] = {status:db.odontograms[key][t], surfaces:{}};
    if(!db.odontograms[key][t]) db.odontograms[key][t] = defaultToothRecord();
    if(!db.odontograms[key][t].surfaces) db.odontograms[key][t].surfaces = {};
    if(!Array.isArray(db.odontograms[key][t].whole_states)){
      const legacyStatus=String(db.odontograms[key][t].status||'healthy');
      db.odontograms[key][t].whole_states = (legacyStatus && legacyStatus!=='healthy') ? [legacyStatus] : [];
    }
    db.odontograms[key][t].whole_states = [...new Set(db.odontograms[key][t].whole_states.map(String).filter(Boolean))];
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

export function wholeToothStateFamily(code){
  const s=String(code||'');
  if(s.startsWith('crown')) return 'crown';
  if(s.startsWith('endo')) return 'endo';
  if(s.startsWith('post')) return 'post';
  if(s.startsWith('implant')) return 'implant';
  if(s.startsWith('prosthesis')) return 'prosthesis';
  if(s.startsWith('removable')) return 'removable';
  return s;
}
export function toothWholeStates(record){
  const states=Array.isArray(record?.whole_states)?record.whole_states.map(String).filter(Boolean):[];
  const legacy=String(record?.status||'healthy');
  if(legacy!=='healthy' && !states.includes(legacy)) states.push(legacy);
  return [...new Set(states)];
}
function syncPrimaryToothStatus(record, preferred=''){
  const states=[...new Set((Array.isArray(record?.whole_states)?record.whole_states:[]).map(String).filter(code=>code&&code!=='healthy'))];
  record.whole_states=states;
  if(preferred && states.includes(preferred)) record.status=preferred;
  else record.status=states.at(-1)||'healthy';
  return record;
}
export function removeToothWholeState(db, patientId, tooth, code){
  const t=String(tooth), od=ensureOdontogram(db,patientId);
  if(!FDI_ALL.includes(t)) throw new Error('Diente FDI no válido');
  const family=wholeToothStateFamily(code);
  od[t].whole_states=toothWholeStates(od[t]).filter(existing=>wholeToothStateFamily(existing)!==family);
  return syncPrimaryToothStatus(od[t]);
}
export function setToothLegendState(db, patientId, tooth, code, surface=''){
  const t=String(tooth);
  const od=ensureOdontogram(db, patientId);
  if(!FDI_ALL.includes(t)) throw new Error('Diente FDI no válido');
  if(SURFACE_CODES.has(code)){
    const s=normalizeSurfaceForTooth(t, surface || (code==='caries' || code.startsWith('filling') ? occlusalSurfaceForTooth(t) : ''));
    if(!s) throw new Error('Superficie no válida');
    od[t].surfaces[s]=code;
    if(toothWholeStates(od[t]).includes('missing')){
      od[t].whole_states=toothWholeStates(od[t]).filter(x=>x!=='missing');
      syncPrimaryToothStatus(od[t]);
    }
    return od[t];
  }
  if(WHOLE_TOOTH_CODES.has(code)){
    if(code==='healthy'){
      od[t].whole_states=[];
      od[t].surfaces={};
      od[t].status='healthy';
      return od[t];
    }
    if(code==='missing'){
      od[t].whole_states=['missing'];
      od[t].surfaces={};
      od[t].status='missing';
      return od[t];
    }
    const family=wholeToothStateFamily(code);
    const states=toothWholeStates(od[t]).filter(existing=>existing!=='healthy'&&existing!=='missing'&&wholeToothStateFamily(existing)!==family);
    states.push(code);
    od[t].whole_states=[...new Set(states)];
    od[t].status=code;
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
export function setToothPrimaryState(db, patientId, tooth, status){ return setToothLegendState(db,patientId,tooth,status); }
export function setToothSurfaceState(db, patientId, tooth, surface, status){ if(!FDI_ALL.includes(String(tooth))) throw new Error('Diente FDI no válido'); const s=normalizeSurfaceForTooth(tooth, surface); if(!s) throw new Error('Superficie no válida'); const od=ensureOdontogram(db, patientId); od[String(tooth)].surfaces[s]=status; return od[String(tooth)]; }
export function markArcadeMissing(db, patientId, arcade){ const arr=arcade==='superior'?FDI_UPPER:FDI_LOWER; arr.forEach(t=>setToothLegendState(db,patientId,t,'missing')); return arr; }

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
function appointmentBlocksSchedule(a){ return !['cancelada','cancelado','cancelled'].includes(normalizeText(a?.status||'')); }
export function appointmentWithMeta(db,a){ const p=db.patients.find(x=>Number(x.id)===Number(a.patient_id)); const emp=db.employees.find(x=>Number(x.id)===Number(a.employee_id)); const start=a.start_time||'10:00'; const end=a.end_time||addMinutes(start, Number(a.duration_minutes||40)); return {...a,start_time:start,end_time:end,duration_minutes:durationMinutes(start,end)||Number(a.duration_minutes||40), patient:p||null, employee:emp||null}; }
export function appointmentsForDate(db,date){ return db.appointments.filter(a=>a.date===date).map(a=>appointmentWithMeta(db,a)).sort((a,b)=>(a.start_time+a.end_time).localeCompare(b.start_time+b.end_time)); }
export function countOverlaps(db,date){ const aps=appointmentsForDate(db,date); let n=0; for(let i=0;i<aps.length;i++) for(let j=i+1;j<aps.length;j++) if(overlaps(aps[i],aps[j])) n++; return n; }
export function cabinetConflict(db, appt){
  const cabinetId=Number(appt.cabinet_id||1);
  if(!cabinetId) return null;
  const start=appt.start_time||'10:00', end=appt.end_time||addMinutes(start, appt.duration_minutes||40);
  return db.appointments.find(a=>appointmentBlocksSchedule(a)&&Number(a.cabinet_id||1)===cabinetId&&a.date===appt.date&&String(a.id)!==String(appt.id)&&minutes(start)<minutes(a.end_time||addMinutes(a.start_time,40))&&minutes(end)>minutes(a.start_time||'10:00'))||null;
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
  const block = (db.agendaBlocks||[]).find(b => b.date===appt.date && minutes(start)<minutes(b.end_time||addMinutes(b.start_time,60)) && minutes(end)>minutes(b.start_time||'09:00') && (
    b.scope==='clinic' ||
    Number(b.employee_id)===Number(appt.employee_id) ||
    Number(b.cabinet_id)===Number(appt.cabinet_id) ||
    Number(b.site_id)===Number(appt.site_id)
  ));
  if(block) return {status:'conflict', message:block.reason?`Bloqueo: ${block.reason}`:'Bloqueo de agenda'};
  const existing=db.appointments.filter(a=>appointmentBlocksSchedule(a)&&Number(a.employee_id)===Number(emp.id)&&a.date===appt.date&&String(a.id)!==String(appt.id)).map(a=>appointmentWithMeta(db,a));
  if(existing.some(a=>minutes(start)<minutes(a.end_time)&&minutes(end)>minutes(a.start_time))) return {status:'conflict', message:`Solape en agenda de ${emp.name}`};
  const cab = cabinetConflict(db,{...appt,start_time:start,end_time:end});
  if(cab) return {status:'conflict', message:`Solape en gabinete ${appt.cabinet_id||1}`};
  return {status:'ok', message:`${emp.name} disponible`};
}

export function agendaSlotKey({date,start_time,employee_id,cabinet_id}={}){
  return `${date||''}|${start_time||''}|e:${employee_id||''}|c:${cabinet_id||''}`;
}

function agendaMoveAudit(db, type, before, after, actor='system', reason=''){
  db.appointmentMoves = Array.isArray(db.appointmentMoves) ? db.appointmentMoves : [];
  const entry = {
    id:id(db),
    type,
    appointment_id:after?.id||before?.id||null,
    patient_id:after?.patient_id||before?.patient_id||null,
    before:before?{...before}:null,
    after:after?{...after}:null,
    actor,
    reason,
    created_at:new Date().toISOString()
  };
  db.appointmentMoves.push(entry);
  return entry;
}

export function agendaValidateMove(db, appointment, patch={}){
  const candidate = {...appointment, ...patch};
  if(candidate.start_time && !candidate.end_time && candidate.duration_minutes) candidate.end_time = addMinutes(candidate.start_time, Number(candidate.duration_minutes));
  if(candidate.start_time && candidate.end_time) candidate.duration_minutes = durationMinutes(candidate.start_time, candidate.end_time) || Number(candidate.duration_minutes||40);
  const availability = appointmentAvailability(db, candidate);
  return {ok:availability.status==='ok', status:availability.status, message:availability.message, appointment:candidate};
}

export function agendaMoveAppointment(db, appointmentId, patch={}, actor='system'){
  const appt = (db.appointments||[]).find(a=>Number(a.id)===Number(appointmentId));
  if(!appt) throw new Error('Cita no encontrada');
  const before = {...appt};
  const validation = agendaValidateMove(db, appt, patch);
  if(!validation.ok) throw new Error(validation.message || 'Movimiento no disponible');
  Object.assign(appt, validation.appointment, {updated_at:new Date().toISOString()});
  agendaMoveAudit(db, 'move', before, {...appt}, actor);
  return appt;
}

export function agendaResizeAppointment(db, appointmentId, duration_minutes, actor='system'){
  const appt = (db.appointments||[]).find(a=>Number(a.id)===Number(appointmentId));
  if(!appt) throw new Error('Cita no encontrada');
  const duration = Math.max(10, Number(duration_minutes||appt.duration_minutes||40));
  const patch = {duration_minutes:duration, end_time:addMinutes(appt.start_time||'10:00', duration)};
  const before = {...appt};
  const validation = agendaValidateMove(db, appt, patch);
  if(!validation.ok) throw new Error(validation.message || 'Duracion no disponible');
  Object.assign(appt, validation.appointment, {updated_at:new Date().toISOString()});
  agendaMoveAudit(db, 'resize', before, {...appt}, actor);
  return appt;
}

export function agendaCreateBlock(db, input={}, actor='system'){
  db.agendaBlocks = Array.isArray(db.agendaBlocks) ? db.agendaBlocks : [];
  const start = input.start_time || '09:00';
  const block = {
    id:id(db),
    scope:input.scope||'employee',
    employee_id:input.employee_id!=null&&input.employee_id!==''?Number(input.employee_id):null,
    cabinet_id:input.cabinet_id!=null&&input.cabinet_id!==''?Number(input.cabinet_id):null,
    site_id:input.site_id!=null&&input.site_id!==''?Number(input.site_id):null,
    date:input.date||today(),
    start_time:start,
    end_time:input.end_time||addMinutes(start, Number(input.duration_minutes||60)),
    reason:input.reason||'Bloqueo',
    created_by:actor,
    created_at:new Date().toISOString()
  };
  db.agendaBlocks.push(block);
  return block;
}

export function agendaFindOpenSlots(db, request={}){
  const date=request.date||today(), duration=Math.max(10,Number(request.duration_minutes||40));
  const start=request.start||db.settings?.agenda?.day_start||'09:00', end=request.end||db.settings?.agenda?.day_end||'20:00';
  const step=Math.max(5,Number(request.step||20));
  const employees=(db.employees||[]).filter(e=>e.active!==false && (!request.employee_id || Number(e.id)===Number(request.employee_id)));
  const cabinets=(db.cabinets&&db.cabinets.length?db.cabinets:[{id:request.cabinet_id||1,site_id:request.site_id||1}]).filter(c=>c.active!==false && (!request.cabinet_id || Number(c.id)===Number(request.cabinet_id)));
  const slots=[];
  for(const emp of employees){
    for(const cab of cabinets){
      for(let t=minutes(start); t+duration<=minutes(end); t+=step){
        const start_time=minutesToTime(t), end_time=minutesToTime(t+duration);
        const candidate={id:'candidate', date, start_time, end_time, duration_minutes:duration, employee_id:emp.id, cabinet_id:cab.id, site_id:request.site_id||cab.site_id||emp.site_id||null};
        const validation=agendaValidateMove(db,candidate,{});
        if(validation.ok) slots.push({...candidate, employee:emp, cabinet:cab, score:100-slots.length});
      }
    }
  }
  return slots;
}

export function agendaCancelAppointment(db, appointmentId, reason='', actor='system'){
  const appt = (db.appointments||[]).find(a=>Number(a.id)===Number(appointmentId));
  if(!appt) throw new Error('Cita no encontrada');
  const before = {...appt};
  Object.assign(appt, {
    status:'cancelada',
    cancelled_at:new Date().toISOString(),
    cancel_reason:reason||'Cancelada',
    updated_at:new Date().toISOString()
  });
  agendaMoveAudit(db, 'cancel', before, {...appt}, actor, reason);
  return appt;
}

export function agendaWaitingListMatches(db, gap={}){
  const duration=durationMinutes(gap.start_time,gap.end_time)||Number(gap.duration_minutes||40);
  return (db.waiting_list||[])
    .filter(item => item.active!==false)
    .filter(item => Number(item.duration_minutes||40)<=duration)
    .filter(item => !item.preferred_employee_id || Number(item.preferred_employee_id)===Number(gap.employee_id))
    .filter(item => !item.preferred_site_id || Number(item.preferred_site_id)===Number(gap.site_id))
    .map(item => ({...item, patient:(db.patients||[]).find(p=>Number(p.id)===Number(item.patient_id))||null}))
    .sort((a,b)=>(Number(b.priority||0)-Number(a.priority||0)) || String(a.created_at||'').localeCompare(String(b.created_at||'')));
}

export function agendaRescheduleOptions(db, appointmentId, options={}){
  const appt=(db.appointments||[]).find(a=>Number(a.id)===Number(appointmentId));
  if(!appt) throw new Error('Cita no encontrada');
  const days=Math.max(1,Number(options.days||14)), limit=Math.max(1,Number(options.limit||12));
  const from=options.from||appt.date||today();
  const duration=Number(options.duration_minutes||appt.duration_minutes||durationMinutes(appt.start_time,appt.end_time)||40);
  const found=[];
  for(let i=0;i<days && found.length<limit;i++){
    const date=portalShiftIsoDate(from,i);
    found.push(...agendaFindOpenSlots(db,{
      date,
      duration_minutes:duration,
      employee_id:options.employee_id||appt.employee_id,
      cabinet_id:options.cabinet_id||appt.cabinet_id,
      site_id:options.site_id||appt.site_id,
      start:options.start,
      end:options.end,
      step:options.step||20
    }).slice(0,limit-found.length));
  }
  return found;
}

function portalShiftIsoDate(date, days){
  if(!date) return '';
  const d=new Date(String(date)+'T12:00:00');
  if(Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate()+Number(days||0));
  return d.toISOString().slice(0,10);
}
function portalDaysBetween(fromDate, toDate){
  if(!fromDate||!toDate) return 0;
  const a=new Date(String(fromDate)+'T12:00:00'), b=new Date(String(toDate)+'T12:00:00');
  if(Number.isNaN(a.getTime())||Number.isNaN(b.getTime())) return 0;
  return Math.round((b-a)/86400000);
}
export function ensurePatientPortalState(db, patientId){
  if(!db.patientPortal || typeof db.patientPortal!=='object' || Array.isArray(db.patientPortal)) db.patientPortal={};
  const key=String(Number(patientId)||patientId||'0');
  const current=(db.patientPortal[key] && typeof db.patientPortal[key]==='object')?db.patientPortal[key]:{};
  const next={
    payment_months:Math.max(1,Number(current.payment_months||6)),
    appointment_changes:Array.isArray(current.appointment_changes)?current.appointment_changes:[],
    waiting_list:Array.isArray(current.waiting_list)?current.waiting_list:[],
    checkins:Array.isArray(current.checkins)?current.checkins:[],
    preparation:(current.preparation && typeof current.preparation==='object' && !Array.isArray(current.preparation))?current.preparation:{},
    support_requests:Array.isArray(current.support_requests)?current.support_requests:[],
    education_links:Array.isArray(current.education_links)?current.education_links:[],
    smilecloud_url:String(current.smilecloud_url||''),
    archform_url:String(current.archform_url||'')
  };
  db.patientPortal[key]=next;
  return next;
}
const PATIENT_PORTAL_FINDING_COPY = Object.freeze({
  caries:{title:'Caries detectada',message:'Hay una zona del diente que necesita valoración o tratamiento restaurador.',tone:'danger'},
  extraction:{title:'Extracción indicada',message:'La clínica ha marcado este diente para valorar o realizar una extracción.',tone:'danger'},
  endo_indicated:{title:'Endodoncia indicada',message:'La clínica ha indicado valorar o realizar tratamiento de conductos.',tone:'danger'},
  filling_pending:{title:'Empaste pendiente',message:'Hay una restauración planificada que todavía no figura como completada.',tone:'warn'},
  crown_pending:{title:'Corona pendiente',message:'Hay una corona planificada que todavía no figura como completada.',tone:'warn'},
  post_pending:{title:'Perno pendiente',message:'Hay una reconstrucción con perno pendiente dentro del plan.',tone:'warn'},
  implant_indicated:{title:'Implante indicado',message:'El plan clínico contempla valorar o colocar un implante en esta zona.',tone:'warn'},
  prosthesis_pending:{title:'Prótesis fija pendiente',message:'Hay una fase protésica fija pendiente en esta zona.',tone:'warn'},
  removable_pending:{title:'Prótesis removible pendiente',message:'Hay una fase de prótesis removible pendiente.',tone:'warn'},
  filling_bad:{title:'Empaste a revisar',message:'Una restauración existente ha sido marcada por la clínica para revisión.',tone:'warn'},
  crown_bad:{title:'Corona a revisar',message:'Una corona existente ha sido marcada por la clínica para revisión.',tone:'warn'},
  endo_bad:{title:'Endodoncia a revisar',message:'Una endodoncia existente ha sido marcada por la clínica para revisión.',tone:'warn'},
  post_bad:{title:'Perno a revisar',message:'Una reconstrucción con perno ha sido marcada para revisión.',tone:'warn'},
  implant_review:{title:'Implante a revisar',message:'El implante ha sido marcado por la clínica para una revisión específica.',tone:'warn'},
  prosthesis_bad:{title:'Prótesis fija a revisar',message:'La prótesis fija ha sido marcada para revisión.',tone:'warn'},
  removable_bad:{title:'Prótesis removible a revisar',message:'La prótesis removible ha sido marcada para revisión.',tone:'warn'},
  missing:{title:'Diente ausente',message:'Esta pieza figura como ausente en tu odontograma.',tone:'info'}
});
export function patientPortalDentalFindings(db, patientId){
  const od=ensureOdontogram(db,patientId);
  const findings=[];
  const actionable=code=>!!PATIENT_PORTAL_FINDING_COPY[code];
  for(const tooth of FDI_ALL){
    const record=od[tooth]||{};
    const surfacesByCode=new Map();
    for(const [surface,code] of Object.entries(record.surfaces||{})){
      if(!actionable(code)) continue;
      if(!surfacesByCode.has(code)) surfacesByCode.set(code,[]);
      surfacesByCode.get(code).push(surface);
    }
    for(const [code,surfaces] of surfacesByCode){
      const copy=PATIENT_PORTAL_FINDING_COPY[code];
      findings.push({tooth,code,surfaces:[...surfaces],title:copy.title,message:copy.message,tone:copy.tone,scope:'surface'});
    }
    for(const code of toothWholeStates(record)){
      if(!actionable(code)) continue;
      const copy=PATIENT_PORTAL_FINDING_COPY[code];
      findings.push({tooth,code,surfaces:[],title:copy.title,message:copy.message,tone:copy.tone,scope:'tooth'});
    }
  }
  const rank={danger:0,warn:1,info:2};
  return findings.sort((a,b)=>(rank[a.tone]??9)-(rank[b.tone]??9)||Number(a.tooth)-Number(b.tooth)||a.code.localeCompare(b.code));
}

export function patientPortalDelayDays(changes=[]){
  return (Array.isArray(changes)?changes:[]).reduce((sum,change)=>sum+Math.max(0,Number(change?.impact_days||0)),0);
}
export function patientPortalProjectedDate(baseDate, changes=[]){
  if(!baseDate) return '';
  return portalShiftIsoDate(baseDate,patientPortalDelayDays(changes));
}
export function patientPortalPaymentPlan(amount, months=6){
  const total=Math.max(0,Number(amount||0));
  const count=Math.max(1,Math.floor(Number(months||1)));
  const monthly=Number((total/count).toFixed(2));
  const lastPayment=Number(Math.max(0,total-(monthly*(count-1))).toFixed(2));
  return {total,months:count,monthly,last_payment:lastPayment};
}
export function patientPortalHealth({hasNextAppointment=false,unsignedCount=0,delayDays=0,clinicalAlertsCount=0}={}){
  if(Number(clinicalAlertsCount)>0 || !hasNextAppointment || Number(delayDays)>=14){
    return {tone:'danger',label:'Plan en riesgo',message:!hasNextAppointment?'Tu plan necesita una próxima cita para seguir avanzando.':'Hay un punto que necesita revisión de la clínica antes de seguir según lo previsto.'};
  }
  if(Number(unsignedCount)>0 || Number(delayDays)>0){
    return {tone:'warn',label:'Necesita atención',message:Number(delayDays)>0?'Has acumulado retraso respecto a la planificación inicial.':'Tienes una decisión o documento pendiente antes de la siguiente fase.'};
  }
  return {tone:'ok',label:'En plazo',message:'Tu tratamiento avanza según la planificación disponible.'};
}
export function patientPortalRescheduleCandidates(db, appointment, {days=21,max=6,step=20}={}){
  if(!appointment?.date || !appointment?.employee_id) return [];
  const duration=Math.max(10,Number(appointment.duration_minutes||durationMinutes(appointment.start_time,appointment.end_time)||40));
  const options=[];
  for(let offset=1; offset<=Math.max(1,Number(days||21)) && options.length<Math.max(1,Number(max||6)); offset++){
    const date=portalShiftIsoDate(appointment.date,offset);
    const shifts=employeeShiftsForDate(db,appointment.employee_id,date);
    for(const shift of shifts){
      for(let cursor=minutes(shift.start_time); cursor+duration<=minutes(shift.end_time); cursor+=Math.max(10,Number(step||20))){
        const start=minutesToTime(cursor), end=minutesToTime(cursor+duration);
        const candidate={...appointment,date,start_time:start,end_time:end,duration_minutes:duration};
        const availability=appointmentAvailability(db,candidate);
        if(availability.status!=='ok') continue;
        options.push({date,start_time:start,end_time:end,impact_days:Math.max(0,portalDaysBetween(appointment.date,date)),availability_status:'ok',availability_message:availability.message});
        if(options.length>=Math.max(1,Number(max||6))) break;
      }
      if(options.length>=Math.max(1,Number(max||6))) break;
    }
  }
  return options;
}
export function patientPortalWaitingRoom(db, patientId, date=today()){
  const appointments=appointmentsForDate(db,date);
  const own=appointments.find(a=>Number(a.patient_id)===Number(patientId));
  if(!own) return {checked_in:false,ahead:0,eta_min:0,eta_max:0,label:'Sin cita hoy',appointment:null};
  const waitingStatuses=new Set(['espera','en espera','en_gabinete','en gabinete','en tratamiento']);
  const checkedIn=waitingStatuses.has(normalizeText(own.status).replace(/ /g,'_')) || normalizeText(own.status)==='espera';
  if(!checkedIn) return {checked_in:false,ahead:0,eta_min:0,eta_max:0,label:'Aún no has hecho check-in',appointment:own};
  const ahead=appointments.filter(a=>String(a.id)!==String(own.id) && minutes(a.start_time)<=minutes(own.start_time) && waitingStatuses.has(normalizeText(a.status).replace(/ /g,'_'))).length;
  return {checked_in:true,ahead,eta_min:ahead*12,eta_max:ahead*20,label:ahead===0?'Eres el siguiente':`${ahead} paciente${ahead===1?'':'s'} por delante`,appointment:own};
}

export function simpleHash(input){ let h1=0x811c9dc5, h2=0x45d9f3b; const s=String(input||''); for(let i=0;i<s.length;i++){ h1^=s.charCodeAt(i); h1=Math.imul(h1,0x01000193); h2^=s.charCodeAt(i); h2=Math.imul(h2,0x27d4eb2d); } return ((h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0')); }

export const PLAN_PRIORITY_RANK = {urgente:0, alta:1, media:2, baja:3};
export const CLINICAL_PHASES = Object.freeze({
  acute:{key:'acute',rank:1,label:'Dolor / infección / control agudo',patient_label:'Resolver primero dolor, infección o focos activos'},
  periodontal:{key:'periodontal',rank:2,label:'Control periodontal',patient_label:'Estabilizar encías y soporte de los dientes'},
  disease:{key:'disease',rank:3,label:'Caries / saneamiento',patient_label:'Eliminar caries y problemas restauradores activos'},
  missing:{key:'missing',rank:4,label:'Dientes ausentes / planificación',patient_label:'Decidir cómo reponer los dientes que faltan'},
  rehab:{key:'rehab',rank:5,label:'Rehabilitación / ortodoncia / prótesis',patient_label:'Realizar la rehabilitación definitiva'}
});
function normClinical(value){ return normalizeText(value||''); }
export function canonicalClinicalTreatment(value){
  const n=normClinical(value);
  if(/reendo|retrat.*endo/.test(n)) return 'reendodoncia';
  if(/endo|conducto|nervio/.test(n)) return 'endodoncia';
  if(/extrac|exodon/.test(n)) return 'extraccion';
  if(/raspado|alisado|periodont|curetaje/.test(n)) return 'tratamiento periodontal';
  if(/limpieza|profilaxis|tartrect/.test(n)) return 'limpieza';
  if(/empaste|obtur|restaur|composite|resina/.test(n)) return 'restauracion';
  if(/perno|poste|munon/.test(n)) return 'perno';
  if(/corona.*implante/.test(n)) return 'corona sobre implante';
  if(/corona/.test(n)) return 'corona';
  if(/maryland/.test(n)) return 'puente maryland';
  if(/puente/.test(n)) return 'puente fijo';
  if(/remov|flexite|esquelet/.test(n)) return 'protesis removible';
  if(/implante/.test(n)) return 'implante';
  if(/alineador|ortodon/.test(n)) return 'ortodoncia';
  if(/provisional|essix/.test(n)) return 'provisional';
  return String(value||'').trim() || 'tratamiento';
}
export function clinicalPriorityFor(item={}){
  const t=normClinical(item.treatment), c=normClinical(item.clinical_cause||item.clinicalCause), s=normClinical(item.source_text||item.sourceText), svc=normClinical(item.service_name||item.serviceName), all=[t,c,s,svc].join(' ');
  if(item.kind==='missing_assessment') return {...CLINICAL_PHASES.missing,reason:'Ausencia dentaria registrada; primero se valora cómo reponerla tras estabilizar enfermedad activa.'};
  if(/\b(dolor|doloroso|infeccion|infectad|absceso|flemon|celulitis|supuracion|fistula|pulpitis|necrosis|exposicion pulpar|lesion apical|lesion periapical|urgencia)\b/.test(all)) return {...CLINICAL_PHASES.acute,reason:'Dolor, infección o patología pulpar/periapical registrada.'};
  if(/\b(endodoncia|reendodoncia|pulpotomia|extraccion)\b/.test(t)) return {...CLINICAL_PHASES.acute,reason:'Control de foco o tratamiento pulpar/quirúrgico indicado.'};
  if(/\b(periodont\w*|gingiv\w*|profilaxis profunda|raspado|curetaje|limpieza)\b/.test(all)) return {...CLINICAL_PHASES.periodontal,reason:'Conviene estabilizar el periodonto antes de la rehabilitación definitiva.'};
  if(/\b(caries|empaste|obturacion|restauracion|resina|composite|sellante)\b/.test(all)) return {...CLINICAL_PHASES.disease,reason:'Saneamiento de caries o restauración activa antes de la fase definitiva.'};
  if(/\b(implante|corona|puente|protesis|ortodoncia|alineador|carilla|perno|poste|provisional|incrustacion|inlay|onlay|overlay|ferula)\b/.test(all)) return {...CLINICAL_PHASES.rehab,reason:'Rehabilitación definitiva después de controlar enfermedad activa y preparar los soportes.'};
  return {...CLINICAL_PHASES.disease,reason:'Tratamiento pendiente sin una prioridad clínica más específica registrada.'};
}
function clinicalPatientCopy(item={}){
  const t=canonicalClinicalTreatment(item.treatment), tooth=String(item.tooth||'').trim(), suffix=tooth?` ${tooth}`:'';
  const map={
    endodoncia:[`Tratar el interior del diente${suffix}`,'Primero hay que resolver el problema pulpar o del interior del diente antes de reconstruirlo definitivamente.'],
    reendodoncia:[`Repetir el tratamiento del interior del diente${suffix}`,'Se necesita controlar primero el problema endodóntico antes de avanzar a la restauración definitiva.'],
    extraccion:[`Retirar el diente${suffix}`,'La pieza se ha indicado para extracción; la reposición, si procede, se planifica después.'],
    'tratamiento periodontal':['Estabilizar las encías y el soporte dental','Controlar la salud periodontal reduce el riesgo de rehabilitar sobre tejidos inflamados o inestables.'],
    limpieza:['Mejorar la salud de encías y la higiene','Esta fase prepara la boca y facilita valorar cómo responden los tejidos.'],
    restauracion:[`Reparar el diente${suffix}`,'Las caries y restauraciones activas se resuelven antes de la rehabilitación definitiva.'],
    perno:[`Reconstruir el soporte del diente${suffix}`,'Este paso prepara el soporte necesario antes de colocar la restauración definitiva cuando está indicado.'],
    corona:[`Proteger el diente${suffix} con una corona`,'La corona es una fase de rehabilitación definitiva y se realiza después de estabilizar y reconstruir el diente.'],
    'corona sobre implante':[`Colocar el diente definitivo sobre el implante${suffix}`,'La prótesis definitiva va después de que el implante y los tejidos estén preparados según el criterio del profesional.'],
    implante:[`Reponer el diente ausente${suffix} con un implante`,'El implante forma parte de la rehabilitación de una ausencia y requiere valorar previamente tejidos, hueso, oclusión y alternativas.'],
    'puente fijo':[`Reponer el espacio${suffix} con un puente fijo`,'Es una opción fija que depende del estado y pronóstico de los dientes que servirán de apoyo.'],
    'puente maryland':[`Reponer el espacio${suffix} con un puente adhesivo`,'Es una opción más conservadora en determinados casos, pero su indicación depende de la zona y la mordida.'],
    'protesis removible':['Reponer los dientes con una prótesis removible','Es una alternativa que se puede retirar y cuyo diseño depende del soporte dental, encías y mordida.'],
    ortodoncia:['Mover los dientes de forma planificada','La ortodoncia requiere una boca estable y controles periódicos para avanzar según la planificación.'],
    provisional:['Usar una solución provisional','Sirve como solución temporal mientras se completa o decide la rehabilitación definitiva.']
  };
  return map[t] || [item.title||`${t}${suffix}`, clinicalPriorityFor(item).reason];
}
function procedureMatchForClinical(db,treatment){
  const t=canonicalClinicalTreatment(treatment), ps=(db.procedures||[]).filter(x=>x.active!==false), by=(...terms)=>ps.find(p=>terms.some(term=>normClinical(p.name).includes(normClinical(term))));
  if(t==='corona') return by('corona sobre diente natural');
  if(t==='corona sobre implante') return by('corona definitiva sobre implante','corona sobre implante');
  if(t==='puente fijo') return by('puente sobre dientes naturales');
  if(t==='protesis removible') return by('protesis parcial','flexite');
  if(t==='implante') return by('implante sin corona','planificacion implantologica');
  if(t==='ortodoncia') return by('alineadores');
  if(t==='provisional') return by('protesis provisional');
  return null;
}
function clinicalDependencyExplanation(before,after){
  const a=canonicalClinicalTreatment(before?.treatment), b=canonicalClinicalTreatment(after?.treatment);
  if((a==='endodoncia'||a==='reendodoncia')&&b==='perno') return 'El soporte del diente se prepara después de completar el tratamiento endodóntico.';
  if((a==='endodoncia'||a==='reendodoncia'||a==='perno'||a==='restauracion')&&b==='corona') return 'La corona definitiva se coloca después de estabilizar y reconstruir el diente.';
  if(a==='implante'&&b==='corona sobre implante') return 'La prótesis definitiva va después del implante y de la fase clínica que el profesional haya indicado.';
  if(a==='extraccion'&&b==='implante') return 'La reposición del diente se planifica después de la extracción y de reevaluar el sitio.';
  return `Este paso necesita que antes se complete “${before?.title||before?.treatment||'el paso anterior'}”.`;
}
export function createClinicalPlanItem(db,input={}){
  if(!input.patient_id) throw new Error('Falta paciente');
  db.clinicalPlanItems=Array.isArray(db.clinicalPlanItems)?db.clinicalPlanItems:[];
  const treatment=canonicalClinicalTreatment(input.treatment||input.title), tooth=String(input.tooth||''), surfaces=[...(input.surfaces||[])].map(String), sourceKey=input.source_key||'';
  if(sourceKey){ const existing=db.clinicalPlanItems.find(x=>Number(x.patient_id)===Number(input.patient_id)&&x.source_key===sourceKey&&x.active!==false&&x.status!=='cancelled'); if(existing) return existing; }
  const procedure=input.procedure_id?(db.procedures||[]).find(x=>Number(x.id)===Number(input.procedure_id)):procedureMatchForClinical(db,treatment);
  const seed={...input,treatment,clinical_cause:input.clinical_cause||'',source_text:input.source_text||'',service_id:procedure?.id||input.service_id||null,service_name:procedure?.name||input.service_name||'',price:Number(input.price??procedure?.price??0),duration:Number(input.duration??procedure?.duration??30)};
  const pr=clinicalPriorityFor(seed), [patientTitle,patientReason]=clinicalPatientCopy(seed), now=new Date().toISOString();
  const item={id:id(db),patient_id:Number(input.patient_id),tooth,surfaces,treatment,title:input.title||`${procedure?.name||treatment}${tooth?` · ${tooth}`:''}`,clinical_cause:seed.clinical_cause,source_text:seed.source_text,service_id:seed.service_id,service_name:seed.service_name,price:seed.price,visits:Number(input.visits||1),duration:seed.duration,status:input.status||'planned',active:input.active!==false,phase_key:pr.key,phase_rank:pr.rank,phase_label:pr.label,priority_reason:pr.reason,manual_depends_on:[...(input.depends_on||[])].map(Number),inferred_depends_on:[],depends_on:[...(input.depends_on||[])].map(Number),patient_title:input.patient_title||patientTitle,patient_reason:input.patient_reason||patientReason,clinician_note:input.clinician_note||'',source:input.source||'clinical_plan_web',source_key:sourceKey,alternative_group_id:input.alternative_group_id||null,alternative_option_id:input.alternative_option_id||null,created_at:now,updated_at:now};
  db.clinicalPlanItems.push(item); return item;
}
export function inferClinicalDependencies(db,patient_id){
  const items=(db.clinicalPlanItems||[]).filter(x=>Number(x.patient_id)===Number(patient_id)&&x.active!==false&&!['cancelled','cancelado'].includes(normClinical(x.status)));
  const byTooth=new Map(); for(const item of items){ const k=String(item.tooth||''); if(!byTooth.has(k)) byTooth.set(k,[]); byTooth.get(k).push(item); }
  for(const item of items){ item.manual_depends_on=Array.isArray(item.manual_depends_on)?item.manual_depends_on:[...(item.depends_on||[])]; item.inferred_depends_on=[]; }
  const find=(xs,treatments)=>xs.find(x=>treatments.includes(canonicalClinicalTreatment(x.treatment)));
  for(const xs of byTooth.values()){
    if(!xs[0]?.tooth) continue;
    const endo=find(xs,['endodoncia','reendodoncia']), post=find(xs,['perno']), crown=find(xs,['corona']), extraction=find(xs,['extraccion']), implant=find(xs,['implante']), implantCrown=find(xs,['corona sobre implante']);
    if(endo&&post) post.inferred_depends_on.push(endo.id);
    if(crown){ if(post) crown.inferred_depends_on.push(post.id); else if(endo) crown.inferred_depends_on.push(endo.id); }
    if(extraction&&implant) implant.inferred_depends_on.push(extraction.id);
    if(implant&&implantCrown) implantCrown.inferred_depends_on.push(implant.id);
  }
  for(const item of items) item.depends_on=[...new Set([...(item.manual_depends_on||[]),...(item.inferred_depends_on||[])].map(Number))];
  return items;
}
export function clinicalPlanGraph(db,patient_id){
  const items=inferClinicalDependencies(db,patient_id), byId=new Map(items.map(x=>[Number(x.id),x])), indegree=new Map(items.map(x=>[Number(x.id),0])), edges=new Map(items.map(x=>[Number(x.id),[]]));
  for(const item of items){ for(const dep of item.depends_on||[]){ if(!byId.has(Number(dep))) continue; indegree.set(Number(item.id),(indegree.get(Number(item.id))||0)+1); edges.get(Number(dep)).push(Number(item.id)); } }
  const cmp=(a,b)=>Number(a.phase_rank||9)-Number(b.phase_rank||9)||String(a.tooth||'').localeCompare(String(b.tooth||''))||Number(a.id)-Number(b.id);
  const ready=items.filter(x=>indegree.get(Number(x.id))===0).sort(cmp), ordered=[];
  while(ready.length){ const item=ready.shift(); ordered.push(item); for(const childId of edges.get(Number(item.id))||[]){ indegree.set(childId,indegree.get(childId)-1); if(indegree.get(childId)===0){ ready.push(byId.get(childId)); ready.sort(cmp); } } }
  const warnings=[]; if(ordered.length!==items.length){ warnings.push('Hay dependencias circulares en el plan clínico.'); for(const item of items.filter(x=>!ordered.includes(x)).sort(cmp)) ordered.push(item); }
  const projected=ordered.map(item=>({...item,dependency_explanations:(item.depends_on||[]).map(dep=>byId.get(Number(dep))).filter(Boolean).map(dep=>({item_id:dep.id,title:dep.title,reason:clinicalDependencyExplanation(dep,item)}))}));
  const phaseMap=new Map(); for(const item of projected){ if(!phaseMap.has(item.phase_rank)) phaseMap.set(item.phase_rank,{rank:item.phase_rank,key:item.phase_key,label:item.phase_label,items:[]}); phaseMap.get(item.phase_rank).items.push(item); }
  return {items:projected,phases:[...phaseMap.values()].sort((a,b)=>a.rank-b.rank),warnings};
}

export function agendaPlanClinicalSequence(db, request={}){
  const patientId=Number(request.patient_id||0);
  if(!patientId) throw new Error('Falta paciente');
  const graph=clinicalPlanGraph(db,patientId);
  const planned=[];
  let cursorDate=request.start_date||today();
  const gapDays=Math.max(0,Number(request.gap_days??1));
  for(const item of graph.items.filter(x=>x.active!==false&&!['completed','completado','cancelled','cancelado'].includes(normClinical(x.status)))){
    const visits=Math.max(1,Number(item.visits||1));
    const duration=Math.max(10,Number(item.duration||item.duration_minutes||40));
    for(let visit=1; visit<=visits; visit++){
      const slot=agendaFindOpenSlots(db,{
        date:cursorDate,
        duration_minutes:duration,
        employee_id:request.employee_id,
        cabinet_id:request.cabinet_id,
        site_id:request.site_id,
        start:request.start,
        end:request.end,
        step:request.step||20
      })[0] || agendaFindOpenSlots(db,{
        date:portalShiftIsoDate(cursorDate,1),
        duration_minutes:duration,
        employee_id:request.employee_id,
        cabinet_id:request.cabinet_id,
        site_id:request.site_id,
        start:request.start,
        end:request.end,
        step:request.step||20
      })[0];
      if(!slot) throw new Error(`No hay hueco para ${item.title||item.treatment}`);
      const appt={
        id:id(db),
        patient_id:patientId,
        employee_id:slot.employee_id,
        cabinet_id:slot.cabinet_id,
        site_id:slot.site_id,
        date:slot.date,
        start_time:slot.start_time,
        end_time:slot.end_time,
        duration_minutes:duration,
        title:item.title||item.treatment,
        reason:item.treatment,
        status:'programada',
        treatment_plan_id:item.treatment_plan_id||null,
        clinical_item_id:item.id,
        sequence_index:visit,
        sequence_total:visits,
        created_at:new Date().toISOString()
      };
      db.appointments.push(appt);
      planned.push(appt);
      cursorDate=portalShiftIsoDate(slot.date,gapDays);
    }
  }
  return planned;
}

export function agendaCascadeSuggestions(db, appointmentId, options={}){
  const moved=(db.appointments||[]).find(a=>Number(a.id)===Number(appointmentId));
  if(!moved) throw new Error('Cita no encontrada');
  const patientId=Number(moved.patient_id), gapDays=Math.max(0,Number(options.gap_days??1));
  let cursorDate=portalShiftIsoDate(moved.date,gapDays);
  return (db.appointments||[])
    .filter(a=>Number(a.patient_id)===patientId && String(a.id)!==String(moved.id) && a.date>=moved.date && (a.clinical_item_id||moved.clinical_item_id))
    .sort((a,b)=>(a.date+a.start_time).localeCompare(b.date+b.start_time))
    .map(a=>{
      const duration=Number(a.duration_minutes||durationMinutes(a.start_time,a.end_time)||40);
      const slot=agendaFindOpenSlots(db,{
        date:cursorDate,
        duration_minutes:duration,
        employee_id:options.employee_id||a.employee_id,
        cabinet_id:options.cabinet_id||a.cabinet_id,
        site_id:options.site_id||a.site_id,
        start:options.start,
        end:options.end,
        step:options.step||20
      })[0];
      const after=slot?{...a,date:slot.date,start_time:slot.start_time,end_time:slot.end_time,duration_minutes:duration}:null;
      if(after) cursorDate=portalShiftIsoDate(after.date,gapDays);
      return {appointment_id:a.id,before:{...a},after,needs_manual_review:!after};
    });
}
export function patientClinicalPlanProjection(db,patient_id){
  const graph=clinicalPlanGraph(db,patient_id), completed=x=>['completed','completado','hecho','finalizado','realizada'].includes(normClinical(x.status));
  const items=graph.items.map((item,index)=>{ const previous=graph.items.slice(0,index).filter(x=>Number(x.phase_rank)<Number(item.phase_rank)||item.depends_on?.includes(x.id)).at(-1); const dependencyWhy=item.dependency_explanations?.[0]?.reason; return {...item,patient_title:item.patient_title||clinicalPatientCopy(item)[0],patient_explanation:item.patient_reason||clinicalPatientCopy(item)[1],why_order:dependencyWhy||item.priority_reason||clinicalPriorityFor(item).reason,after:previous?.patient_title||previous?.title||'',completed:completed(item)}; });
  return {items,phases:graph.phases.map(p=>({...p,patient_label:CLINICAL_PHASES[p.key]?.patient_label||p.label,items:items.filter(x=>x.phase_rank===p.rank)})),warnings:graph.warnings,progress:items.length?Math.round(items.filter(x=>x.completed).length/items.length*100):0,alternatives:(db.clinicalAlternativeGroups||[]).filter(g=>Number(g.patient_id)===Number(patient_id)&&g.status!=='closed')};
}
const ALT_CONTEXT_LABELS=Object.freeze({tooth_or_zone:'Diente o zona confirmados',adjacent_teeth:'Estado de dientes vecinos revisado',periodontal_context:'Estado periodontal revisado',bone_context_if_implant_considered:'Hueso valorado si se contempla implante',occlusion:'Mordida / oclusión revisada',patient_priorities:'Prioridades del paciente registradas'});
export function clinicalAlternativeContextLabel(key){ return ALT_CONTEXT_LABELS[key]||key; }
function missingToothOptionTemplates(tooth){
  return [
    {key:'implant',title:'Implante + corona',summary:'Solución fija independiente de los dientes vecinos cuando el caso es clínicamente apto.',pros:['No necesita tallar los dientes vecinos si están sanos.','Es una solución fija.','Permite reponer una pieza de forma independiente.'],cons:['Requiere cirugía.','Necesita valorar hueso, tejidos, salud general y mantenimiento.','El tiempo total puede ser mayor y depende de la evolución clínica.'],maintenance:'Higiene específica y revisiones periódicas.',invasiveness:'Cirugía implantológica.',stability:'Fija; depende de osteointegración, tejidos y mantenimiento.',time_relative:'Habitualmente más fases que un puente, según el caso.',cost_relative:'Habitualmente coste inicial mayor que una solución removible.',reversibility:'Limitada una vez realizada la cirugía.',limitations:'No todos los pacientes o zonas son candidatos sin estudios previos.',required_context:['tooth_or_zone','periodontal_context','bone_context_if_implant_considered','occlusion','patient_priorities'],plan:[{treatment:'implante',title:`Implante ${tooth}`},{treatment:'corona sobre implante',title:`Corona sobre implante ${tooth}`}]},
    {key:'fixed_bridge',title:'Puente fijo',summary:'Solución fija apoyada en dientes vecinos cuando esos dientes son adecuados para servir de pilares.',pros:['Es fijo.','No requiere colocar un implante.','Puede tener un recorrido clínico más corto en determinados casos.'],cons:['Puede requerir tallar dientes vecinos.','El pronóstico depende también de los dientes pilares.','Necesita higiene específica bajo el póntico.'],maintenance:'Higiene bajo el puente y controles de pilares.',invasiveness:'Preparación de dientes pilares cuando está indicada.',stability:'Fija; depende del soporte de los pilares y la oclusión.',time_relative:'Puede ser más corto que una rehabilitación implantológica en algunos casos.',cost_relative:'Depende del número de unidades y materiales.',reversibility:'La preparación dentaria no es reversible.',limitations:'No es apropiado si los pilares no tienen buen pronóstico o la distribución de cargas no es adecuada.',required_context:['tooth_or_zone','adjacent_teeth','periodontal_context','occlusion','patient_priorities'],plan:[{treatment:'puente fijo',title:`Puente fijo para ausencia ${tooth}`}]},
    {key:'maryland',title:'Puente adhesivo (Maryland)',summary:'Opción fija y más conservadora en casos seleccionados.',pros:['Suele requerir menos preparación que un puente convencional.','No requiere implante.','Puede ser útil en determinadas zonas y situaciones.'],cons:['La retención puede ser menor que en otras soluciones fijas.','No es adecuado para todas las zonas o cargas.','Puede descementarse y requerir mantenimiento.'],maintenance:'Controles de adhesión, oclusión e higiene.',invasiveness:'Generalmente conservadora, según diseño.',stability:'Depende mucho de adhesión, esmalte disponible y oclusión.',time_relative:'A menudo pocas fases cuando está indicado.',cost_relative:'Variable según diseño y material.',reversibility:'Más conservador que un puente convencional en muchos casos.',limitations:'Indicaciones limitadas por posición, mordida y dientes de apoyo.',required_context:['tooth_or_zone','adjacent_teeth','periodontal_context','occlusion','patient_priorities'],plan:[{treatment:'puente maryland',title:`Puente Maryland para ausencia ${tooth}`}]},
    {key:'removable',title:'Prótesis removible',summary:'Solución que el paciente puede retirar y que puede reponer una o varias ausencias.',pros:['Evita cirugía implantológica.','Puede reponer varias ausencias en una misma prótesis.','Suele permitir opciones con menor coste inicial.'],cons:['No es fija.','Requiere adaptación, retirada e higiene diaria.','Puede tener mayor volumen y apoyarse en dientes o mucosa.'],maintenance:'Retirada, limpieza y revisiones de ajuste y soporte.',invasiveness:'Generalmente menor cirugía; puede requerir preparación de apoyos.',stability:'Menor sensación de fijación que una solución fija.',time_relative:'Depende del diseño, registros y laboratorio.',cost_relative:'Suele tener menor coste inicial que rehabilitaciones fijas complejas.',reversibility:'Alta comparada con opciones fijas.',limitations:'Confort, retención y estética dependen del diseño y anatomía.',required_context:['tooth_or_zone','periodontal_context','occlusion','patient_priorities'],plan:[{treatment:'protesis removible',title:`Prótesis removible para ausencia ${tooth}`}]},
    {key:'provisional',title:'Solución provisional',summary:'Opción temporal mientras se completa el diagnóstico o la rehabilitación definitiva.',pros:['Permite cubrir temporalmente una ausencia.','Da tiempo para completar otras fases clínicas.'],cons:['No es la solución definitiva.','Durabilidad y función son más limitadas.','Puede necesitar ajustes o reposición.'],maintenance:'Uso y cuidado según el tipo de provisional.',invasiveness:'Depende del provisional elegido.',stability:'Temporal.',time_relative:'Pensada para una fase transitoria.',cost_relative:'Coste adicional temporal, variable.',reversibility:'Alta.',limitations:'No debe confundirse con la rehabilitación definitiva.',required_context:['tooth_or_zone','patient_priorities'],plan:[{treatment:'provisional',title:`Provisional para ausencia ${tooth}`}]}
  ];
}
export function createClinicalAlternativeGroup(db,{patient_id,title='Alternativas de tratamiento',context='',options=[],required_context=[]}={}){
  if(!patient_id) throw new Error('Falta paciente'); db.clinicalAlternativeGroups=Array.isArray(db.clinicalAlternativeGroups)?db.clinicalAlternativeGroups:[];
  const group={id:id(db),patient_id:Number(patient_id),title,context,status:'open',required_context:[...required_context],context_checks:{},patient_preference:null,approved_option_id:null,approved_at:'',clinician_note:'',created_at:new Date().toISOString(),options:options.map(o=>({id:id(db),clinician_status:o.clinician_status||'candidate',...clone(o)}))}; db.clinicalAlternativeGroups.push(group); return group;
}
export function createMissingToothAlternatives(db,{patient_id,tooth}={}){
  const existing=(db.clinicalAlternativeGroups||[]).find(g=>Number(g.patient_id)===Number(patient_id)&&g.kind==='missing_tooth'&&String(g.tooth)===String(tooth)&&g.status!=='closed'); if(existing) return existing;
  const group=createClinicalAlternativeGroup(db,{patient_id,title:`Cómo reponer el diente ${tooth}`,context:`Ausencia registrada en ${tooth}. Las opciones dependen de tejidos, dientes vecinos, hueso, mordida y prioridades del paciente.`,options:missingToothOptionTemplates(String(tooth))}); group.kind='missing_tooth'; group.tooth=String(tooth); return group;
}
export function updateClinicalAlternativeContext(db,{group_id,key,value}){ const group=(db.clinicalAlternativeGroups||[]).find(g=>Number(g.id)===Number(group_id)); if(!group) throw new Error('Grupo de alternativas no encontrado'); group.context_checks={...(group.context_checks||{}),[key]:!!value}; group.updated_at=new Date().toISOString(); return group; }
export function setPatientAlternativePreference(db,{group_id,option_id,patient_id}){ const group=(db.clinicalAlternativeGroups||[]).find(g=>Number(g.id)===Number(group_id)&&Number(g.patient_id)===Number(patient_id)); if(!group) throw new Error('Grupo de alternativas no encontrado'); const option=group.options.find(o=>Number(o.id)===Number(option_id)); if(!option) throw new Error('Alternativa no encontrada'); group.patient_preference={option_id:option.id,recorded_at:new Date().toISOString(),status:'preference_only'}; group.updated_at=new Date().toISOString(); return group; }
export function approveClinicalAlternativeOption(db,{group_id,option_id,clinician_note=''}){
  const group=(db.clinicalAlternativeGroups||[]).find(g=>Number(g.id)===Number(group_id)); if(!group) throw new Error('Grupo de alternativas no encontrado'); const option=group.options.find(o=>Number(o.id)===Number(option_id)); if(!option) throw new Error('Alternativa no encontrada');
  const missing=(option.required_context||[]).filter(key=>group.context_checks?.[key]!==true); if(missing.length) throw new Error(`Faltan datos clínicos requeridos: ${missing.map(clinicalAlternativeContextLabel).join(', ')}`);
  for(const item of (db.clinicalPlanItems||[]).filter(x=>Number(x.alternative_group_id)===Number(group.id)&&x.active!==false&&Number(x.alternative_option_id)!==Number(option.id))){ item.active=false; item.status='cancelled'; item.updated_at=new Date().toISOString(); }
  const existing=(db.clinicalPlanItems||[]).filter(x=>Number(x.alternative_group_id)===Number(group.id)&&Number(x.alternative_option_id)===Number(option.id)&&x.active!==false), created=[]; let previous=null;
  if(existing.length) created.push(...existing); else for(const spec of option.plan||[]){ const item=createClinicalPlanItem(db,{patient_id:group.patient_id,tooth:group.tooth||'',...spec,depends_on:previous?[previous.id]:[],alternative_group_id:group.id,alternative_option_id:option.id,source:'clinical_alternative'}); created.push(item); previous=item; }
  group.approved_option_id=option.id; group.approved_at=new Date().toISOString(); group.clinician_note=clinician_note; group.status='clinically_validated'; option.clinician_status='approved'; group.updated_at=group.approved_at; return {group,option,created_items:created};
}
export function syncClinicalPlanFromOdontogram(db,patient_id){
  const od=ensureOdontogram(db,patient_id), created=[], alternatives=[], expected=new Set();
  const create=(tooth,treatment,code,extra={})=>{
    const source_key=`odontogram:${patient_id}:${tooth}:${code}`; expected.add(source_key);
    const existing=(db.clinicalPlanItems||[]).find(x=>Number(x.patient_id)===Number(patient_id)&&x.source_key===source_key);
    if(existing){ existing.active=true; if(['cancelled','cancelado'].includes(normClinical(existing.status))) existing.status='planned'; if(extra.surfaces) existing.surfaces=[...extra.surfaces]; if(extra.source_text) existing.source_text=extra.source_text; existing.updated_at=new Date().toISOString(); return existing; }
    const item=createClinicalPlanItem(db,{patient_id,tooth,treatment,source:'odontogram_sync',source_key,source_text:STATUS_LABELS[code]||code,...extra}); created.push(item); return item;
  };
  for(const [tooth,rec] of Object.entries(od)){
    const whole=[...(rec.whole_states||[])];
    for(const code of whole){
      if(code==='endo_indicated') create(tooth,'endodoncia',code,{title:`Endodoncia ${tooth}`});
      else if(code==='endo_bad') create(tooth,'reendodoncia',code,{title:`Retratamiento endodóntico ${tooth}`});
      else if(code==='crown_pending'||code==='crown_bad') create(tooth,'corona',code,{title:`Corona ${tooth}`});
      else if(code==='post_pending'||code==='post_bad') create(tooth,'perno',code,{title:`Perno / reconstrucción ${tooth}`});
      else if(code==='implant_indicated') create(tooth,'implante',code,{title:`Implante ${tooth}`});
      else if(code==='prosthesis_pending'||code==='prosthesis_bad') create(tooth,'puente fijo',code,{title:`Prótesis fija ${tooth}`});
      else if(code==='removable_pending'||code==='removable_bad') create(tooth,'protesis removible',code,{title:`Prótesis removible ${tooth}`});
      else if(code==='extraction') create(tooth,'extraccion',code,{title:`Extracción ${tooth}`});
      else if(code==='missing'){ const g=createMissingToothAlternatives(db,{patient_id,tooth}); if(!alternatives.includes(g)) alternatives.push(g); }
    }
    const surfaceCodes=Object.entries(rec.surfaces||{}); const active=surfaceCodes.filter(([,code])=>['caries','filling_pending','filling_bad'].includes(code)); if(active.length){ const surfaces=active.map(([s])=>s); create(tooth,'restauracion','surface-restoration',{title:`Restauración ${tooth}`,surfaces,source_text:`Superficies ${surfaces.join(', ')}`}); }
  }
  const resolvedStatus=(item)=>{
    const rec=od[String(item.tooth||'')]; if(!rec) return false; const whole=new Set(rec.whole_states||[]), t=canonicalClinicalTreatment(item.treatment);
    if((t==='endodoncia'||t==='reendodoncia')&&whole.has('endo')) return true;
    if(t==='corona'&&whole.has('crown')) return true;
    if(t==='perno'&&whole.has('post')) return true;
    if(t==='implante'&&whole.has('implant')) return true;
    if(t==='puente fijo'&&whole.has('prosthesis')) return true;
    if(t==='protesis removible'&&whole.has('removable')) return true;
    if(t==='extraccion'&&whole.has('missing')) return true;
    if(t==='restauracion'){ const values=Object.values(rec.surfaces||{}); return values.length>0 && values.every(code=>!['caries','filling_pending','filling_bad'].includes(code)); }
    return false;
  };
  for(const item of (db.clinicalPlanItems||[]).filter(x=>Number(x.patient_id)===Number(patient_id)&&x.source==='odontogram_sync'&&x.active!==false)){
    if(expected.has(item.source_key)) continue;
    if(resolvedStatus(item)){ item.status='completed'; item.completed_at=item.completed_at||new Date().toISOString(); item.updated_at=new Date().toISOString(); }
    else if(!['completed','completado'].includes(normClinical(item.status))){ item.active=false; item.status='cancelled'; item.updated_at=new Date().toISOString(); }
  }
  inferClinicalDependencies(db,patient_id); return {created,alternatives,graph:clinicalPlanGraph(db,patient_id)};
}
export function syncClinicalPlanBudget(db,patient_id){
  const items=clinicalPlanGraph(db,patient_id).items.filter(x=>x.active!==false&&!['completed','completado','cancelled','cancelado'].includes(normClinical(x.status))); db.budgets=Array.isArray(db.budgets)?db.budgets:[];
  let budget=db.budgets.find(b=>Number(b.patient_id)===Number(patient_id)&&b.source==='clinical_plan'&&b.status!=='archivado'); const total=items.reduce((sum,x)=>sum+Number(x.price||0),0);
  const payload=items.map(x=>({clinical_plan_item_id:x.id,title:x.title,tooth:x.tooth,price:Number(x.price||0),status:x.status}));
  if(!budget){ budget={id:id(db),patient_id:Number(patient_id),title:'Plan clínico · presupuesto borrador',total,pending:total,source:'clinical_plan',status:'borrador',items:payload,created_at:new Date().toISOString()}; db.budgets.push(budget); }
  else { budget.total=total; budget.pending=Math.max(0,total-paymentAmountForBudget(db,budget.id)); budget.items=payload; budget.updated_at=new Date().toISOString(); }
  return budget;
}
export function setClinicalPlanItemStatus(db,item_id,status){ const item=(db.clinicalPlanItems||[]).find(x=>Number(x.id)===Number(item_id)); if(!item) throw new Error('Tratamiento no encontrado'); item.status=status; item.updated_at=new Date().toISOString(); return item; }

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
  const planSteps=rawSteps.map((s,i)=>{ const txt=s.title||String(s)||'Paso clínico'; const c=classifyTreatmentPriority(txt); return {id:id(db), title:txt, phase:s.phase||c.phase, priority:Number(s.priority_level||c.level), priority_label:s.priority||priority, deadline:s.deadline||deadline||'', deadline_days:Number(s.deadline_days||c.deadline_days), order:Number(s.order||i+1), duration:Number(s.duration||45), reason:s.reason||txt, detail:s.detail||'', status:s.status||'pendiente', appointment_id:s.appointment_id||null}; }).sort((a,b)=>a.order-b.order||Number(a.id)-Number(b.id));
  const plan={id:id(db), patient_id:Number(patient_id), type:effectiveKind, title:title||'Plan de tratamiento', priority, deadline, status:'activo', hierarchy:'Denty clinical priority v1.3', created_at:new Date().toISOString(), steps:planSteps};
  db.treatmentPlans.push(plan); return plan;
}
export function treatmentPlanHierarchy(db, patient_id){
  return (db.treatmentPlans||[]).filter(p=>Number(p.patient_id)===Number(patient_id)).sort((a,b)=>(PLAN_PRIORITY_RANK[a.priority]??9)-(PLAN_PRIORITY_RANK[b.priority]??9)||String(a.deadline||'9999-12-31').localeCompare(String(b.deadline||'9999-12-31'))||Number(a.id)-Number(b.id)).map(plan=>({...plan, steps:[...(plan.steps||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0)||Number(a.id||0)-Number(b.id||0))}));
}
export function patientTreatmentRoute(db, patient_id){
  const clinical=(db.clinicalPlanItems||[]).some(x=>Number(x.patient_id)===Number(patient_id)&&x.active!==false&&!['cancelled','cancelado'].includes(normalizeText(x.status||'')));
  if(clinical) return patientClinicalPlanProjection(db,patient_id).items.map((item,index)=>({...item,clinical_title:item.title,title:item.patient_title||item.title,order:index+1,phase:item.phase_label,detail:item.patient_explanation,reason:item.why_order,deadline:item.deadline||''}));
  const cancelled=value=>['cancelado','cancelada','archivado','archivada'].includes(normalizeText(value||''));
  return treatmentPlanHierarchy(db,patient_id)
    .filter(plan=>!cancelled(plan.status))
    .flatMap(plan=>(plan.steps||[])
      .filter(step=>!cancelled(step.status))
      .map(step=>({...step,plan_id:plan.id,plan_title:plan.title,plan_priority:plan.priority,plan_status:plan.status,deadline:step.deadline||plan.deadline||''})));
}
export function schedulePlanStepToAgenda(db,{plan_id,step_id,date,start_time='10:00',employee_id,site=''}){
  const plan=(db.treatmentPlans||[]).find(p=>Number(p.id)===Number(plan_id)); if(!plan) throw new Error('Plan no encontrado');
  const step=(plan.steps||[]).find(s=>Number(s.id)===Number(step_id)); if(!step) throw new Error('Paso no encontrado');
  const start=start_time||'10:00'; const end=addMinutes(start, Number(step.duration||45));
  const appt={id:id(db), patient_id:Number(plan.patient_id), employee_id:Number(employee_id||db.employees?.[0]?.id||0), date:date||today(), start_time:start, end_time:end, duration_minutes:durationMinutes(start,end), title:step.title, reason:step.reason||step.title, detail:step.detail||'', status:'programada', site, confirmed:false, plan_id:plan.id, plan_step_id:step.id, phase:step.phase, hierarchy_label:`${plan.priority||'media'} · ${step.phase||'Tratamiento'} · paso ${step.order||1}`, created_at:new Date().toISOString()};
  db.appointments.push(appt); step.status='agendada'; step.appointment_id=appt.id; return appt;
}

function consentDoctorFor(db){
  const userName=String(db.currentUser?.name||'').trim();
  const byUser=(db.employees||[]).find(e=>normalizeText(e.name)===normalizeText(userName));
  return byUser || (db.employees||[]).find(e=>e.active!==false&&normalizeText(e.role).includes('odont')) || (db.employees||[])[0] || {name:userName||'Profesional responsable',site_id:null,site:''};
}
function consentSiteFor(db, doctor){
  return (db.sites||[]).find(s=>Number(s.id)===Number(doctor?.site_id)) || (db.sites||[]).find(s=>Number(s.id)===Number(db.settings?.clinicProfile?.default_site_id)) || (db.sites||[])[0] || {name:db.settings?.clinicProfile?.name||'Clinica',address:''};
}
function formatConsentDate(date=new Date()){
  try{ return date.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}); }catch{ return today(); }
}
function renderConsentDocumentText(db, consent, patientId){
  const p=(db.patients||[]).find(x=>Number(x.id)===Number(patientId));
  const doctor=consentDoctorFor(db);
  const site=consentSiteFor(db, doctor);
  const patientName=patientFullName(p);
  const doctorName=doctor?.name||db.currentUser?.name||'Profesional responsable';
  const siteName=[site?.name, site?.address].filter(Boolean).join(' - ') || db.settings?.clinicProfile?.name || 'Clinica';
  return `DATOS DEL CONSENTIMIENTO\nPaciente: ${patientName}\nDoctor/a responsable: ${doctorName}\nCentro/Sede: ${siteName}\nFecha: ${formatConsentDate()}\n\n${consent?.text||''}\n\nFirma del paciente: pendiente de firma digital.`;
}
export function createConsentDocument(db,{patient_id,consent_id,title}){ const c=db.consents.find(x=>Number(x.id)===Number(consent_id))||db.consents[0]; if(!patient_id) throw new Error('Falta paciente'); const doc={id:id(db),patient_id:Number(patient_id),consent_id:c?.id||null,title:title||c?.title||'Consentimiento',version:c?.version||1,text:renderConsentDocumentText(db,c,patient_id),status:'borrador',created_at:new Date().toISOString(),signature_data:'',signer_name:'',accepted:false,locked_at:'',hash:'',signature_audit:null}; db.documents.push(doc); return doc; }
export function attendanceAppointmentIsEligible(appointment, issuedDate=today()){
  if(!appointment) return false;
  const status=normalizeText(appointment.status||'');
  const attended=['realizada','realizado','completada','completado','finalizada','finalizado','attended','completed'].includes(status);
  return attended && String(appointment.date||'')<=String(issuedDate||today());
}
function certificateLongDate(date){
  const raw=String(date||today());
  const d=new Date(raw+'T12:00:00');
  if(Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
}
function certificateProcedureLabel(appointment, includeProcedure){
  if(!includeProcedure) return 'atención odontológica';
  const raw=String(appointment?.reason||appointment?.title||appointment?.detail||'atención odontológica').trim();
  return raw || 'atención odontológica';
}
export function attendanceCertificateText(db,{patient_id,appointment_id,include_procedure=false,issued_date=today()}={}){
  const p=(db.patients||[]).find(x=>Number(x.id)===Number(patient_id));
  if(!p) throw new Error('Paciente no encontrado');
  const appointment=(db.appointments||[]).find(x=>Number(x.id)===Number(appointment_id)&&Number(x.patient_id)===Number(patient_id));
  if(!appointment) throw new Error('Cita no encontrada');
  if(!attendanceAppointmentIsEligible(appointment,issued_date)) throw new Error('La cita debe constar como realizada antes de emitir el justificante');
  const profile=db.settings?.clinicProfile||{};
  const site=(db.sites||[]).find(s=>Number(s.id)===Number(appointment.site_id)) || (db.sites||[]).find(s=>Number(s.id)===Number(profile.default_site_id)) || null;
  const clinicName=String(profile.name||db.settings?.clinic||site?.name||'Centro dental').trim();
  const centerAddress=String(site?.address||profile.address||'').trim();
  const centerLabel=centerAddress?`${clinicName}, sito en ${centerAddress}`:clinicName;
  const visitDate=certificateLongDate(appointment.date);
  const issueDate=certificateLongDate(issued_date);
  const sameDay=String(appointment.date)===String(issued_date);
  const start=String(appointment.start_time||'').trim();
  const end=String(appointment.end_time||'').trim() || (start&&Number(appointment.duration_minutes||appointment.duration)>0?addMinutes(start,Number(appointment.duration_minutes||appointment.duration)):'');
  const timePhrase=start ? ` La asistencia consta registrada desde las ${start}${end?` hasta las ${end}`:''} horas.` : '';
  const dni=String(p.dni||'').trim();
  const idPhrase=dni?`, con DNI/NIE ${dni}`:'';
  const attendanceDay=sameDay?`en el día de hoy, ${visitDate}`:`el día ${visitDate}`;
  const procedure=certificateProcedureLabel(appointment,include_procedure);
  const placeSource=String(site?.city||profile.city||centerAddress||'').trim();
  const issuePlace=(placeSource.split(',').pop()||placeSource).split('·').pop()?.trim() || clinicName;
  const contact=[profile.phone?`Tel. ${profile.phone}`:'',profile.email||''].filter(Boolean).join(' · ');
  return `JUSTIFICANTE DE ASISTENCIA\n\nD./D.ª ${patientFullName(p)}${idPhrase} ha acudido ${attendanceDay}, a ${centerLabel}, para la realización de ${procedure}.${timePhrase}\n\nY para que conste, a petición de la persona interesada, se expide el presente justificante en ${issuePlace}, a ${issueDate}.\n\nEste documento acredita exclusivamente la asistencia al centro en la fecha y horario indicados.\n\nFirma y sello del centro\n${clinicName}${profile.address?`\n${profile.address}`:''}${contact?`\n${contact}`:''}`;
}
export function createAttendanceCertificateDocument(db,{patient_id,appointment_id,include_procedure=false,issued_date=today()}={}){
  const text=attendanceCertificateText(db,{patient_id,appointment_id,include_procedure,issued_date});
  const appointment=(db.appointments||[]).find(x=>Number(x.id)===Number(appointment_id));
  const doc={id:id(db),patient_id:Number(patient_id),appointment_id:Number(appointment_id),type:'attendance_certificate',title:'Justificante de asistencia',version:1,text,status:'emitido',created_at:new Date().toISOString(),issued_date:String(issued_date||today()),visit_date:String(appointment?.date||''),include_procedure:!!include_procedure,signature_data:'',signer_name:'',accepted:true,locked_at:'',hash:simpleHash(text),signature_audit:null};
  db.documents=db.documents||[];
  db.documents.push(doc);
  return doc;
}
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
    const patientId=context.patientId||context.patient_id||(db.patients.find(p=>!p.archived)||{}).id; if(patientId){ const od=ensureOdontogram(db,patientId); teeth.forEach(t=>setToothLegendState(db,patientId,t,'prosthesis')); }
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

export const LEGACY_CLINICAL_PHASES = [
  {key:'urgency', label:'Urgencia / dolor / infección', rank:1, deadline_days:0},
  {key:'etiologic', label:'Control etiológico y periodontal', rank:2, deadline_days:7},
  {key:'restorative', label:'Restauradora / endodoncia', rank:3, deadline_days:21},
  {key:'surgery', label:'Cirugía / implantes', rank:4, deadline_days:45},
  {key:'prosthetic', label:'Prótesis definitiva', rank:5, deadline_days:90},
  {key:'maintenance', label:'Mantenimiento', rank:6, deadline_days:180}
];
export function classifyTreatmentPriority(text=''){
  const n=normalizeText(String(text));
  if(/dolor|absceso|infeccion|flem[oó]n|urgenc|supur/.test(n)) return {level:1, phase:LEGACY_CLINICAL_PHASES[0].label, deadline_days:0};
  if(/period|raspado|sarro|bolsa|higiene|placa|gingiv/.test(n)) return {level:2, phase:LEGACY_CLINICAL_PHASES[1].label, deadline_days:7};
  if(/endo|caries|obtur|reconstru|perno/.test(n)) return {level:3, phase:LEGACY_CLINICAL_PHASES[2].label, deadline_days:21};
  if(/implante|extracci|exodon|injerto|seno|cirug/.test(n)) return {level:4, phase:LEGACY_CLINICAL_PHASES[3].label, deadline_days:45};
  if(/corona|puente|protesis|provisional|locator|barra/.test(n)) return {level:5, phase:LEGACY_CLINICAL_PHASES[4].label, deadline_days:90};
  return {level:6, phase:LEGACY_CLINICAL_PHASES[5].label, deadline_days:180};
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
