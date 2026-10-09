"use client";
import type { DentalEntity } from "@/domain";
import { ORTHO_METRICS, interpretOrthoMetrics, type OrthoMetricId, type MetricInput } from "./ortho-diagnostic-engine";
import { MEASURES } from "./cephalometry-diagram";

type Row = {value?:string;norm?:string;sd?:string;interp?:string;manual?:boolean};
const escapeHtml=(value:unknown)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]??c));
const num=(s:unknown)=>{if(s===null||s===undefined||String(s).trim()==="")return undefined;const n=Number(String(s).replace(",","."));return Number.isFinite(n)?n:undefined};
const fields:[string,string][]=[
["molarClassRight","Clase molar derecha"],
["molarClassLeft","Clase molar izquierda"],["canineClassRight","Clase canina derecha"],["canineClassLeft","Clase canina izquierda"],["overjetMm","Overjet (mm)"],["overbitePct","Overbite (%)"],["midlineDeviationMm","Desviación de línea media (mm)"],["upperCrowdingMm","Apiñamiento superior (mm)"],["lowerCrowdingMm","Apiñamiento inferior (mm)"],["crossbite","Mordida cruzada"],["openBite","Mordida abierta"],["deepBite","Sobremordida profunda"],["facialProfile","Perfil facial"],["facialBiotype","Biotipo facial"],["appliances","Aparatología"],["notes","Notas clínicas"]];
export function printOrthodonticReport(args:{patientId:string;entities:readonly DentalEntity[];svg?:SVGSVGElement|null}):boolean{
 const ceph=args.entities.find(e=>e.active&&e.entityType==="ORTHODONTIC"&&e.status==="cephalometry");
 const ortho=args.entities.find(e=>e.active&&e.entityType==="ORTHODONTIC"&&e.status!=="cephalometry"&&!e.attributes?.appliance);
 const record=ceph?.attributes?.cephalometry as {rows?:Record<string,Row>;custom?:Array<Row&{id:string;name:string}>;example?:boolean}|undefined;
 const rows=record?.example?{}:record?.rows??{};
 const inputs:Partial<Record<OrthoMetricId,MetricInput>>={};
 const mapping:Partial<Record<OrthoMetricId,string>>={SNA:"SNA",SNB:"SNB",ANB:"ANB",SN_GOGN:"SNGoGn",FACIAL_AXIS:"EF"};
 for(const metric of ORTHO_METRICS){
  const row=rows[mapping[metric.id]??metric.id];
  const value=num(row?.value),norm=num(row?.norm),sd=num(row?.sd);
  if(value!==undefined)inputs[metric.id]={value,...(norm!==undefined?{norm}:{}),...(sd!==undefined?{sd}:{})};
 }
 const findings=interpretOrthoMetrics(inputs);
 const allRows=[...MEASURES.map(m=>({id:m.id,name:m.name,unit:"°"})),...ORTHO_METRICS.filter(m=>!mapping[m.id]&&!MEASURES.some(x=>x.id===m.id)).map(m=>({id:m.id,name:m.label,unit:m.unit})),...(record?.custom??[]).map(r=>({id:r.id,name:r.name,unit:"(personalizada)"}))];
 const table=allRows.map(m=>{const row=rows[m.id]??record?.custom?.find(r=>r.id===m.id);if(!row||num(row.value)===undefined)return "";const deviation=num(row.norm)===undefined?"—":String(Number((num(row.value)!-num(row.norm)!).toFixed(2)));return `<tr>
<td>${escapeHtml(m.name)}</td>
<td>${escapeHtml(row.value)} ${escapeHtml(m.unit)}</td>
<td>${escapeHtml(row.norm??"—")}</td>
<td>${escapeHtml(deviation)}</td>
<td>${escapeHtml(row.manual?row.interp:"Revisar en contexto clínico")}</td>
</tr>`}).join("");
 const attrs=(ortho?.attributes??{}) as Record<string,unknown>;
 const clinical=fields.filter(([key])=>attrs[key]!==undefined).map(([key,label])=>{const value=attrs[key];return `<tr>
<td>${escapeHtml(label)}</td>
<td>${escapeHtml(Array.isArray(value)?value.join(", "):typeof value==="boolean"?(value?"Sí":"No"):value)}</td>
</tr>`}).join("");
 const svg=args.svg?.outerHTML??"";
 const title="Informe de diagnóstico ortodóncico";
 const html=`
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>@page{size:A4;margin:14mm}body{font:12px Arial,sans-serif;color:#172638}h1{font-size:22px}h2{font-size:15px;border-bottom:1px solid #cbd5e1;padding-bottom:5px;margin-top:22px}table{border-collapse:collapse;width:100%}td,th{padding:6px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#edf3fa}.diagram{max-height:160mm;display:flex;justify-content:center;break-inside:avoid}.diagram svg{max-width:100%;max-height:155mm}li{margin:9px 0}small{color:#52677c}.page-break{break-before:page}@media print{button{display:none}}</style>
</head>
<body>
<h1>${title}</h1>
<p>
<b>Ficha:</b> ${escapeHtml(args.patientId)} &nbsp; <b>Fecha:</b> ${escapeHtml(new Date().toLocaleDateString("es-ES"))}</p>
<small>Documento de apoyo clínico sujeto a revisión profesional. Los valores de ejemplo no se incluyen.</small>
<h2>Hallazgos e interpretación integrada</h2>${findings.length?`<ul>${findings.map(f=>`<li>
<b>${escapeHtml(f.title)}:</b> ${escapeHtml(f.detail)}</li>`).join("")}</ul>`:"<p>No se identifican patrones combinados con los datos registrados. Esto no equivale a ausencia de maloclusión.</p>"}<h2>Exploración y diagnóstico ortodóncico</h2>
<table>${clinical||"<tr>
<td>Sin exploración ortodóncica guardada</td>
</tr>"}</table>
<h2>Mediciones cefalométricas</h2>
<table>
<thead>
<tr>
<th>Medida</th>
<th>Valor</th>
<th>Norma</th>
<th>Desviación</th>
<th>Comentario</th>
</tr>
</thead>
<tbody>${table||"<tr>
<td colspan='5'>Sin valores cefalométricos registrados</td>
</tr>"}</tbody>
</table>
<section class="page-break">
<h2>Trazado cefalométrico y referencias anatómicas</h2>${svg?`<div class="diagram">${svg}</div>
<small>Esquema anatómico interactivo de Denty. No es una radiografía calibrada ni sustituye el trazado sobre la imagen original.</small>`:"<p>No hay trazado disponible para imprimir.</p>"}<h2>Limitaciones</h2>
<p>El análisis del crecimiento requiere edad, maduración esquelética y registros longitudinales. Las normas cefalométricas varían según población y método. Confirmar puntos, valores y diagnósticos antes de firmar el informe.</p>
</section>
<script>window.addEventListener("load",()=>{setTimeout(()=>window.print(),250)})<\/script>
</body>
</html>`;
 const win=window.open("","_blank");if(!win)return false;win.document.open();win.document.write(html);win.document.close();return true;
}
