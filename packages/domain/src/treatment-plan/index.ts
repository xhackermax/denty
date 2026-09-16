export type PlanItemStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "DEFERRED";
export interface PlanItem { id:string; tooth?:string; treatmentCode:string; label:string; patientLabel?:string; clinicalReason?:string; phase:number; priority:number; priorityOverrideReason?:string; status:PlanItemStatus; }
export interface PlanDependency { itemId:string; dependsOnId:string; reason?:string; }
export interface TreatmentPlanGraph { items:PlanItem[]; dependencies:PlanDependency[]; }

export const PHASES = { acute:1, periodontal:2, disease:3, missing:4, rehab:5 } as const;
export function clinicalPhase(item: Pick<PlanItem,"treatmentCode"|"clinicalReason">): number {
  const all=`${item.treatmentCode} ${item.clinicalReason??""}`.toLowerCase();
  if (/dolor|infecc|absceso|pulpitis|necrosis|endodon|reendodon|extracci/.test(all)) return 1;
  if (/period|raspado|alisado|higiene profunda|gingiv/.test(all)) return 2;
  if (/caries|restaur|empaste|saneamiento/.test(all)) return 3;
  if (/ausen|missing|reponer|valoracion.*implante/.test(all)) return 4;
  return 5;
}
export function validateGraph(graph:TreatmentPlanGraph): void {
  const ids=new Set(graph.items.map(x=>x.id));
  for(const d of graph.dependencies){ if(!ids.has(d.itemId)||!ids.has(d.dependsOnId)) throw new Error("Dependency references unknown item"); if(d.itemId===d.dependsOnId) throw new Error("Self dependency"); }
  const deps=new Map<string,string[]>(); for(const d of graph.dependencies)(deps.get(d.itemId)??deps.set(d.itemId,[]).get(d.itemId)!).push(d.dependsOnId);
  const visiting=new Set<string>(),done=new Set<string>();
  const visit=(id:string)=>{if(done.has(id))return;if(visiting.has(id))throw new Error("Treatment plan dependency cycle");visiting.add(id);for(const x of deps.get(id)??[])visit(x);visiting.delete(id);done.add(id)};
  graph.items.forEach(x=>visit(x.id));
}
export function orderedPlan(graph:TreatmentPlanGraph): PlanItem[] {
  validateGraph(graph); const byId=new Map(graph.items.map(i=>[i.id,i])); const deps=new Map<string,string[]>(); for(const d of graph.dependencies)(deps.get(d.itemId)??deps.set(d.itemId,[]).get(d.itemId)!).push(d.dependsOnId);
  const out:PlanItem[]=[],seen=new Set<string>(); const visit=(i:PlanItem)=>{if(seen.has(i.id))return;for(const dep of deps.get(i.id)??[]){const d=byId.get(dep);if(d)visit(d)}seen.add(i.id);out.push(i)};
  [...graph.items].sort((a,b)=>a.phase-b.phase||b.priority-a.priority||a.label.localeCompare(b.label)).forEach(visit); return out;
}
export interface AlternativeOption { code:string; title:string; pros:string[]; cons:string[]; requiredData:string[]; availableData:string[]; relativeTime?:string; relativeCost?:string; invasiveness?:string; maintenance?:string; reversibility?:string; }
export function projectAlternative(option:AlternativeOption) { const missing=option.requiredData.filter(x=>!option.availableData.includes(x)); return {...option,missingData:missing,clinicallyReady:missing.length===0}; }
export function missingToothAlternatives(availableData:string[]=[]): AlternativeOption[] {
  const common=["tooth_or_zone","adjacent_teeth","periodontal_context","occlusion","patient_priorities"];
  return [
    {code:"implant",title:"Implante + corona",pros:["Solución fija","No requiere tallar dientes vecinos sanos cuando el caso es apto"],cons:["Requiere cirugía","Necesita valorar hueso y tejidos"],requiredData:[...common,"bone_context"],availableData,relativeTime:"medio-largo",relativeCost:"alto",invasiveness:"quirúrgica",maintenance:"Higiene y revisiones periimplantarias",reversibility:"baja"},
    {code:"fixed_bridge",title:"Puente fijo",pros:["Solución fija","No requiere cirugía implantológica"],cons:["Puede requerir tallado de dientes pilares","La higiene intermedia exige técnica específica"],requiredData:common,availableData,relativeTime:"medio",relativeCost:"medio-alto",invasiveness:"dentaria",maintenance:"Superfloss/cepillos interproximales",reversibility:"baja"},
    {code:"maryland",title:"Puente adhesivo Maryland",pros:["Conservador en casos adecuados","Tratamiento relativamente rápido"],cons:["Retención limitada en algunas situaciones","No indicado para todas las cargas/zonas"],requiredData:common,availableData,relativeTime:"corto-medio",relativeCost:"medio",invasiveness:"baja",maintenance:"Higiene convencional y revisiones",reversibility:"media"},
    {code:"removable",title:"Prótesis removible",pros:["Puede reponer varias ausencias","Menor cirugía"],cons:["Es removible","Necesita adaptación e higiene específica"],requiredData:["tooth_or_zone","periodontal_context","occlusion","patient_priorities"],availableData,relativeTime:"medio",relativeCost:"bajo-medio",invasiveness:"baja",maintenance:"Retirada, limpieza y revisiones",reversibility:"alta"},
    {code:"provisional",title:"Provisional",pros:["Solución transitoria","Permite mantener estética/función mientras se decide"],cons:["No es solución definitiva","Puede requerir recambios"],requiredData:["tooth_or_zone","patient_priorities"],availableData,relativeTime:"corto",relativeCost:"bajo",invasiveness:"baja",maintenance:"Según diseño",reversibility:"alta"}
  ];
}

export type ClinicalAlternativeKind = "missing_tooth" | "tooth_prognosis" | "restoration_choice" | "removable_design";
export type KennedyClass = "I" | "II" | "III" | "IV" | "UNCLASSIFIED";

/**
 * Alternatives for a compromised tooth. These are comparison candidates only.
 * Denty never selects one without clinician approval and the required clinical data.
 */
export function toothPrognosisAlternatives(tooth:string, availableData:string[]=[]): AlternativeOption[] {
  const common=["tooth","periodontal_context","restorability","occlusion","patient_priorities"];
  return [
    {code:"conserve_endo_restore",title:`Conservar ${tooth}: endodoncia + restauración`,pros:["Mantiene el diente natural cuando es restaurable","Evita una extracción inmediata"],cons:["Puede requerir varias fases","El pronóstico depende de estructura remanente, periodonto y endodoncia"],requiredData:[...common,"endodontic_context"],availableData,relativeTime:"medio",relativeCost:"medio",invasiveness:"conservadora/endodóntica",maintenance:"Revisiones del diente restaurado",reversibility:"baja"},
    {code:"conserve_endo_crown",title:`Conservar ${tooth}: endodoncia + reconstrucción + corona`,pros:["Conserva el diente si el pronóstico es favorable","Aporta cobertura definitiva cuando está indicada"],cons:["Mayor coste y número de fases que una restauración directa","Requiere suficiente soporte dentario y periodontal"],requiredData:[...common,"endodontic_context","ferrule_context"],availableData,relativeTime:"medio",relativeCost:"medio-alto",invasiveness:"endodóntica y protésica",maintenance:"Higiene y controles de la restauración",reversibility:"baja"},
    {code:"extract_implant",title:`Extraer ${tooth} + implante + corona`,pros:["Permite reponer el diente con una solución fija si el caso es apto","No requiere usar dientes vecinos como pilares"],cons:["Implica extracción y cirugía","Necesita valorar hueso, tejidos y tiempos de cicatrización"],requiredData:[...common,"bone_context","medical_context"],availableData,relativeTime:"medio-largo",relativeCost:"alto",invasiveness:"quirúrgica",maintenance:"Higiene y mantenimiento periimplantario",reversibility:"baja"},
    {code:"extract_bridge",title:`Extraer ${tooth} + puente fijo`,pros:["Reposición fija sin cirugía implantológica","Puede ser adecuada si los dientes vecinos ya requieren restauración"],cons:["Puede implicar tallado de dientes pilares","Exige valorar soporte y diseño protésico"],requiredData:[...common,"adjacent_teeth"],availableData,relativeTime:"medio",relativeCost:"medio-alto",invasiveness:"dentaria",maintenance:"Higiene bajo póntico y revisiones",reversibility:"baja"}
  ];
}

export function crownRestorationAlternatives(tooth:string, availableData:string[]=[]): AlternativeOption[] {
  const common=["tooth","restorability","occlusion","caries_extent","patient_priorities"];
  return [
    {code:"direct_restoration",title:`Restauración directa ${tooth}`,pros:["Conserva tejido dentario","Suele requerir menos citas"],cons:["No es suficiente para toda destrucción coronaria","Durabilidad condicionada por carga y volumen de tejido perdido"],requiredData:common,availableData,relativeTime:"corto",relativeCost:"bajo-medio",invasiveness:"baja",maintenance:"Controles habituales",reversibility:"media"},
    {code:"adhesive_onlay",title:`Incrustación / onlay adhesivo ${tooth}`,pros:["Cobertura selectiva conservadora","Puede preservar más tejido que una corona completa"],cons:["Necesita aislamiento y sustrato adecuados","No indicada en todos los patrones de destrucción"],requiredData:[...common,"adhesive_substrate"],availableData,relativeTime:"corto-medio",relativeCost:"medio",invasiveness:"media",maintenance:"Controles oclusales e higiene",reversibility:"media-baja"},
    {code:"full_crown",title:`Corona ${tooth}`,pros:["Cobertura circunferencial cuando está clínicamente indicada","Permite rehabilitar dientes muy debilitados"],cons:["Requiere mayor preparación dentaria","Necesita valorar ferrule, periodonto y pronóstico pulpar/endodóntico"],requiredData:[...common,"ferrule_context","periodontal_context"],availableData,relativeTime:"medio",relativeCost:"medio-alto",invasiveness:"media-alta",maintenance:"Higiene marginal y revisiones",reversibility:"baja"}
  ];
}

function toothPos(fdi:string){const n=Number(fdi);if(!Number.isInteger(n)||n<11||n>48)return null;const q=Math.floor(n/10),p=n%10;if(q<1||q>4||p<1||p>8)return null;return{q,p,arch:q<=2?"upper":"lower",side:q===1||q===4?"right":"left"} as const}
/** A conservative Kennedy classifier for permanent dentition. Ambiguous layouts return UNCLASSIFIED for clinician review. */
export function kennedyClass(missingTeeth:string[]): KennedyClass {
  const pts=missingTeeth.map(toothPos).filter(Boolean) as NonNullable<ReturnType<typeof toothPos>>[];
  if(!pts.length)return"UNCLASSIFIED";
  const arch=pts[0].arch;if(pts.some(x=>x.arch!==arch))return"UNCLASSIFIED";
  const sides={right:pts.filter(x=>x.side==="right"),left:pts.filter(x=>x.side==="left")};
  const distal=(xs:typeof pts)=>xs.some(x=>x.p>=6) && xs.some(x=>x.p===8 || x.p===7);
  const rightDistal=distal(sides.right),leftDistal=distal(sides.left);
  if(rightDistal&&leftDistal)return"I";
  if(rightDistal||leftDistal)return"II";
  const anterior=pts.filter(x=>x.p<=3);
  if(anterior.length>=2&&sides.right.some(x=>x.p<=3)&&sides.left.some(x=>x.p<=3))return"IV";
  return"III";
}

export function removableKennedyAlternatives(missingTeeth:string[],availableData:string[]=[]): AlternativeOption[] {
  const kennedy=kennedyClass(missingTeeth),zone=missingTeeth.join(", ");
  const common=["periodontal_context","occlusion","remaining_teeth","patient_priorities"];
  return [
    {code:`kennedy_${kennedy.toLowerCase()}_acrylic`,title:`Prótesis removible acrílica · Kennedy ${kennedy}`,pros:["Puede reponer varias ausencias","Permite modificaciones en algunos casos"],cons:["Mayor volumen que una estructura metálica","Retención y estabilidad dependen del diseño y soporte"],requiredData:common,availableData,relativeTime:"medio",relativeCost:"bajo-medio",invasiveness:"baja",maintenance:`Retirar y limpiar diariamente. Zonas: ${zone}`,reversibility:"alta"},
    {code:`kennedy_${kennedy.toLowerCase()}_metal`,title:`Prótesis esquelética · Kennedy ${kennedy}`,pros:["Estructura más rígida y habitualmente menos voluminosa","Buena distribución de cargas cuando el diseño es adecuado"],cons:["Necesita dientes y periodonto compatibles con el diseño","Puede mostrar retenedores según el caso"],requiredData:[...common,"abutment_teeth"],availableData,relativeTime:"medio",relativeCost:"medio",invasiveness:"baja-media",maintenance:"Higiene de prótesis, pilares y revisiones",reversibility:"alta"}
  ];
}

export function treatmentAlternativeCatalog(kind:ClinicalAlternativeKind,context:{toothOrZone:string;availableData?:string[];missingTeeth?:string[]}):AlternativeOption[]{
  const data=context.availableData??[];
  if(kind==="tooth_prognosis")return toothPrognosisAlternatives(context.toothOrZone,data);
  if(kind==="restoration_choice")return crownRestorationAlternatives(context.toothOrZone,data);
  if(kind==="removable_design")return removableKennedyAlternatives(context.missingTeeth??context.toothOrZone.split(/[,\s]+/).filter(Boolean),data);
  return missingToothAlternatives(data);
}
