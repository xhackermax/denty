export type OrthoMetricId = "SNA"|"SNB"|"ANB"|"WITS"|"CO_GN"|"CO_A"|"SN_GOGN"|"FMA"|"JARABAK"|"FACIAL_AXIS"|"LOWER_FACE_HEIGHT"|"GONIAL"|"POG_NPERP"|"IMPA"|"CVM";
export type OrthoMetric = { id:OrthoMetricId; label:string; author:string; unit:"°"|"mm"|"%"|"stage"; meaning:string; high:string; low:string; note?:string };
export const ORTHO_METRICS:readonly OrthoMetric[]=[
{id:"SNA",label:"SNA",author:"Steiner",unit:"°",meaning:"Posición sagital relativa del maxilar",high:"Posición maxilar relativamente anterior",low:"Posición maxilar relativamente posterior"},
{id:"SNB",label:"SNB",author:"Steiner",unit:"°",meaning:"Posición sagital relativa mandibular",high:"Posición mandibular relativamente anterior",low:"Posición mandibular relativamente posterior"},
{id:"ANB",label:"ANB",author:"Steiner",unit:"°",meaning:"Discrepancia sagital intermaxilar",high:"Tendencia a Clase II esquelética",low:"Tendencia a Clase III esquelética",note:"Interpretar con Wits, rotaciones y geometría de la base craneal"},
{id:"WITS",label:"Wits",author:"Jacobson",unit:"mm",meaning:"Discrepancia proyectada sobre el plano oclusal",high:"Tendencia sagital hacia Clase II",low:"Tendencia sagital hacia Clase III",note:"Dependiente de la orientación del plano oclusal"},
{id:"CO_GN",label:"Co-Gn",author:"McNamara",unit:"mm",meaning:"Longitud efectiva mandibular",high:"Longitud relativamente elevada",low:"Longitud relativamente reducida",note:"Requiere normas por edad, sexo y tamaño"},
{id:"CO_A",label:"Co-A",author:"McNamara",unit:"mm",meaning:"Longitud efectiva maxilar",high:"Longitud relativamente elevada",low:"Longitud relativamente reducida",note:"Requiere normas por edad, sexo y tamaño"},
{id:"SN_GOGN",label:"SN.GoGn",author:"Steiner",unit:"°",meaning:"Divergencia mandibular",high:"Patrón hiperdivergente",low:"Patrón hipodivergente"},
{id:"FMA",label:"FMA",author:"Tweed",unit:"°",meaning:"Divergencia mandibular respecto a Frankfurt",high:"Patrón hiperdivergente",low:"Patrón hipodivergente"},
{id:"JARABAK",label:"Índice de Jarabak",author:"Jarabak",unit:"%",meaning:"Relación altura facial posterior/anterior",high:"Proporción posterior relativamente alta",low:"Proporción posterior relativamente baja"},
{id:"FACIAL_AXIS",label:"Eje facial",author:"Ricketts",unit:"°",meaning:"Configuración de la dirección facial",high:"Patrón relativamente horizontal según convención",low:"Patrón relativamente vertical según convención"},
{id:"LOWER_FACE_HEIGHT",label:"Altura facial inferior",author:"Ricketts",unit:"°",meaning:"Componente vertical facial inferior",high:"Mayor apertura facial inferior",low:"Menor apertura facial inferior"},
{id:"GONIAL",label:"Ángulo goníaco",author:"Björk/Jarabak",unit:"°",meaning:"Morfología angular mandibular",high:"Ángulo mandibular relativamente abierto",low:"Ángulo mandibular relativamente cerrado"},
{id:"POG_NPERP",label:"Pog-N perpendicular",author:"McNamara",unit:"mm",meaning:"Proyección sagital del mentón",high:"Mentón relativamente anterior",low:"Mentón relativamente posterior"},
{id:"IMPA",label:"IMPA",author:"Tweed",unit:"°",meaning:"Inclinación del incisivo inferior",high:"Posible proinclinación dentaria",low:"Posible retroinclinación dentaria"},
{id:"CVM",label:"Maduración cervical",author:"Baccetti/Franchi/McNamara",unit:"stage",meaning:"Estadio morfológico de maduración cervical",high:"Estadio más avanzado",low:"Estadio más temprano",note:"No predice milímetros de crecimiento ni sustituye valoración clínica"},
];
export type MetricInput={value:number;norm?:number;sd?:number;reference?:string};
export type DiagnosticFinding={code:string;title:string;detail:string;metricIds:OrthoMetricId[];certainty:"suggestive"|"insufficient"};
export function interpretOrthoMetrics(inputs:Partial<Record<OrthoMetricId,MetricInput>>):DiagnosticFinding[]{
 const findings:DiagnosticFinding[]=[];
 const v=(id:OrthoMetricId)=>inputs[id]?.value;
 const high=(id:OrthoMetricId)=>{const x=inputs[id];return x?.norm!==undefined&&x.sd!==undefined&&x.sd>0&&x.value>x.norm+x.sd};
 const low=(id:OrthoMetricId)=>{const x=inputs[id];return x?.norm!==undefined&&x.sd!==undefined&&x.sd>0&&x.value<x.norm-x.sd};
 if(high("ANB")&&low("SNB"))findings.push({code:"II_MANDIBULAR",title:"Posible componente mandibular de Clase II",detail:"ANB elevado con SNB reducido. Confirmar tamaño mandibular, posición maxilar, Wits y patrón vertical.",metricIds:["ANB","SNB","CO_GN","WITS"],certainty:"suggestive"});
 if(low("ANB")&&low("SNA"))findings.push({code:"III_MAXILLARY",title:"Posible componente maxilar de Clase III",detail:"ANB reducido y SNA reducido. Revisar Co-A, Wits y geometría craneofacial.",metricIds:["ANB","SNA","CO_A","WITS"],certainty:"suggestive"});
 if(low("ANB")&&high("SNB"))findings.push({code:"III_MANDIBULAR",title:"Posible componente mandibular de Clase III",detail:"ANB reducido y SNB elevado. Revisar Co-Gn y patrón vertical.",metricIds:["ANB","SNB","CO_GN"],certainty:"suggestive"});
 if(high("SN_GOGN")&&high("FMA")&&low("JARABAK"))findings.push({code:"HYPERDIVERGENT",title:"Patrón hiperdivergente concordante",detail:"SN.GoGn y FMA elevados junto con índice de Jarabak reducido.",metricIds:["SN_GOGN","FMA","JARABAK"],certainty:"suggestive"});
 if(low("SN_GOGN")&&low("FMA")&&high("JARABAK"))findings.push({code:"HYPODIVERGENT",title:"Patrón hipodivergente concordante",detail:"SN.GoGn y FMA reducidos junto con índice de Jarabak elevado.",metricIds:["SN_GOGN","FMA","JARABAK"],certainty:"suggestive"});
 if(low("ANB")&&low("IMPA"))findings.push({code:"III_COMPENSATION",title:"Posible compensación incisiva de Clase III",detail:"IMPA reducido con ANB reducido; revisar inclinación superior y exploración clínica.",metricIds:["ANB","IMPA"],certainty:"suggestive"});
 if(v("ANB")!==undefined&&v("WITS")===undefined)findings.push({code:"WITS_MISSING",title:"Falta contraste sagital",detail:"Registrar Wits para contrastar la interpretación de ANB.",metricIds:["ANB","WITS"],certainty:"insufficient"});
 if(v("CVM")===undefined)findings.push({code:"MATURITY_MISSING",title:"Maduración no documentada",detail:"No inferir crecimiento residual sin maduración esquelética, edad y evolución longitudinal.",metricIds:["CVM"],certainty:"insufficient"});
 return findings;
}
