"use client";

import { Button, Checkbox, Group, Text } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DentalEntity } from "@/domain";
import { CephalometryDiagram, EXAMPLE_VALUES, MEASURES } from "./cephalometry-diagram";
import styles from "./cephalometry-editor.module.css";

interface CephalometryEditorProps {
  patientId: string;
  entities: readonly DentalEntity[];
  readOnly: boolean;
  onCommit: (entity: DentalEntity) => void;
}
type Row = { value: string; norm: string; sd: string; interp: string; manual: boolean };
type CustomRow = Row & { id:string; name:string };
type RecordState = { example:boolean; rows:Record<string,Row>; custom:CustomRow[] };
const defaultRow=(norm="",sd="",value=""):Row=>({value,norm,sd,interp:"",manual:false});
export const blankCephalometry=():RecordState=>({
  example:false,
  rows:Object.fromEntries(MEASURES.map(m=>[m.id,defaultRow(String(m.norm),String(m.sd))])),
  custom:[],
});
export const exampleCephalometry=():RecordState=>({
  ...blankCephalometry(),
  example:true,
  rows:Object.fromEntries(MEASURES.map(m=>[m.id,defaultRow(String(m.norm),String(m.sd),EXAMPLE_VALUES[m.id]??"")])),
});
const asRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==="object"&&!Array.isArray(value);
const textField=(value:unknown,max=500)=>typeof value==="string"?value.slice(0,max):"";
export function parseCephalometry(value:unknown):RecordState|null {
  if(!asRecord(value)||!asRecord(value.rows))return null;
  const base=blankCephalometry();
  for(const m of MEASURES){
    const source=value.rows[m.id];
    if(!asRecord(source))continue;
    base.rows[m.id]={
      value:textField(source.value,40),
      norm:typeof source.norm==="string"?textField(source.norm,40):String(m.norm),
      sd:typeof source.sd==="string"?textField(source.sd,40):String(m.sd),
      interp:textField(source.interp,1000),
      manual:source.manual===true,
    };
  }
  if(Array.isArray(value.custom)){
    base.custom=value.custom.filter(asRecord).slice(0,100).map((r,i)=>({
      id:/^c[a-z0-9]+$/i.test(String(r.id??""))?String(r.id):`c${i+1}`,
      name:textField(r.name,120),
      value:textField(r.value,40),norm:textField(r.norm,40),sd:textField(r.sd,40),
      interp:textField(r.interp,1000),manual:r.manual===true,
    }));
  }
  return base;
}
const number=(value:string):number|null=>{
  if(!value.trim())return null;
  const parsed=Number(value.trim().replace(",","."));
  return Number.isFinite(parsed)?parsed:null;
};
type Evaluation={deviation:number|null;status:"ok"|"hi"|"lo"|null;auto:string};
export function evaluateCephalometry(row:Row,id:string):Evaluation {
  const v=number(row.value),n=number(row.norm),sd=number(row.sd);
  if(v===null||n===null)return {deviation:null,status:null,auto:""};
  const deviation=v-n;
  const status=sd!==null&&sd>=0?(Math.abs(deviation)<=sd?"ok":deviation>0?"hi":"lo"):null;
  const measure=MEASURES.find(m=>m.id===id);
  return {deviation,status,auto:status?measure?.interpretations[status]??"":""};
}
const label={ok:"Normal",hi:"▲ Aumentado",lo:"▼ Disminuido"} as const;
const formatDeviation=(value:number|null)=>value===null?"—":`${value>0?"+":""}${Number(value.toFixed(2))}°`;
const getRow=(state:RecordState,id:string)=>state.rows[id]??state.custom.find(r=>r.id===id);

export function CephalometryEditor({patientId,entities,readOnly,onCommit}:CephalometryEditorProps){
  const savedEntity=useMemo(()=>entities.find(e=>
    e.active&&e.entityType==="ORTHODONTIC"&&e.status==="cephalometry"&&
    e.attributes?.assessmentType==="LATERAL_CEPHALOMETRY"
  ),[entities]);
  const [state,setState]=useState<RecordState>(exampleCephalometry);
  const [active,setActive]=useState<string|null>(null);
  const [solo,setSolo]=useState(false);
  const [copied,setCopied]=useState(false);
  const [patientKey,setPatientKey]=useState(patientId);
  const dirty=useRef(false);
  const ids=useRef<Record<string,HTMLInputElement|null>>({});

  // Existing data can arrive asynchronously. Never overwrite edits made meanwhile.
  useEffect(()=>{
    if(patientKey!==patientId){
      dirty.current=false;
      setPatientKey(patientId);
      setState(parseCephalometry(savedEntity?.attributes?.cephalometry)??exampleCephalometry());
      setActive(null);
      return;
    }
    if(!dirty.current){
      const fromServer=parseCephalometry(savedEntity?.attributes?.cephalometry);
      if(fromServer)setState(fromServer);
    }
  },[savedEntity?.attributes?.cephalometry,patientId,patientKey]);
  const commit=(next:RecordState)=>{
    if(readOnly)return;
    dirty.current=true;
    const real={...next,example:false};
    setState(real);
    onCommit({
      id:savedEntity?.id??`cephalometry-${patientId}`,
      entityType:"ORTHODONTIC",
      status:"cephalometry",
      active:true,
      attributes:{assessmentType:"LATERAL_CEPHALOMETRY",cephalometry:real},
    });
  };
  const update=(id:string,key:keyof Row,value:string)=>{
    if(readOnly)return;
    const next={
      ...(state.example?blankCephalometry():state),
      rows:state.example?blankCephalometry().rows:Object.fromEntries(Object.entries(state.rows).map(([id,row])=>[id,{...row}])),
      custom:state.custom.map(r=>({...r})),
      example:false,
    };
    const row=getRow(next,id);
    if(!row)return;
    if(key==="manual")return;
    if(key==="interp"){
      row.interp=value;
      row.manual=value.trim().length>0;
    }else row[key]=value;
    commit(next);
  };
  const evaluate=(id:string)=>evaluateCephalometry(getRow(state,id)??defaultRow(),id);
  const values=Object.fromEntries(MEASURES.map(m=>[m.id,state.rows[m.id]?.value??""]));
  const statuses=Object.fromEntries(MEASURES.map(m=>[m.id,evaluate(m.id).status]));
  const select=(id:string)=>{
    setActive(id);
    ids.current[id]?.focus();
    ids.current[id]?.select();
  };
  const copy=async()=>{
    const rows=[["Medida","Valor","Norma","DE","Desviación","Interpretación"].join("\t")];
    for(const entry of [...MEASURES.map(m=>({id:m.id,name:m.name})),...state.custom]){
      const row=getRow(state,entry.id);
      if(!row)continue;
      const e=evaluate(entry.id);
      rows.push([entry.name,row.value,row.norm,row.sd,e.deviation===null?"":String(e.deviation),row.manual?row.interp:e.auto].join("\t"));
    }
    try{await navigator.clipboard.writeText(rows.join("\n"));setCopied(true)}catch{setCopied(false)}
  };
  return <section className={styles.wrapper} aria-label="Cefalometría lateral integrada">
    <Group justify="space-between" gap="xs" wrap="wrap">
      <div>
        <Text fw={750}>Cefalometría lateral</Text>
        <Text size="xs" c="dimmed">Tabla y trazado interactivo, integrados en el odontograma. Las normas son orientativas.</Text>
      </div>
      <Group gap="xs" wrap="wrap">
        <Button size="xs" variant="light" disabled={readOnly} onClick={()=>commit(blankCephalometry())}>Empezar en blanco</Button>
        <Button size="xs" variant="light" onClick={()=>void copy()}>{copied?"Copiado":"Copiar resultados"}</Button>
      </Group>
    </Group>
    {state.example?<Text size="xs" c="orange">Valores de ejemplo, todavía no son datos del paciente. Modifícalos o pulsa «Empezar en blanco».</Text>:null}
    <div className={styles.layout}>
      <section className={styles.tablePanel} aria-label="Tabla editable de medidas cefalométricas">
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead><tr><th>Medida</th><th>Valor</th><th>Norma ± DE</th><th>Desviación</th><th>Interpretación</th></tr></thead>
            <tbody>
              {[...MEASURES.map(m=>({id:m.id,name:m.name,description:m.description})),...state.custom.map(m=>({id:m.id,name:m.name,description:"Medida adicional"}))].map(entry=>{
                const row=getRow(state,entry.id)??defaultRow();
                const e=evaluate(entry.id);
                const custom=state.custom.some(item=>item.id===entry.id);
                return <tr key={entry.id} className={active===entry.id?styles.focused:undefined}
                  onMouseEnter={()=>setActive(entry.id)} onFocus={()=>setActive(entry.id)}>
                  <th scope="row">
                    {custom?<input aria-label="Nombre de medida" className={styles.nameInput} value={entry.name} disabled={readOnly} onChange={event=>{
                      const next={...state,custom:state.custom.map(item=>item.id===entry.id?{...item,name:event.target.value}:item)};
                      commit(next);
                    }}/>:<><strong>{entry.name}</strong><small>{entry.description}</small></>}
                    {custom?<button type="button" disabled={readOnly} onClick={()=>commit({...state,custom:state.custom.filter(item=>item.id!==entry.id)})}>Quitar</button>:null}
                  </th>
                  <td><input ref={element=>{ids.current[entry.id]=element}} aria-label={`Valor ${entry.name}`} className={styles.numberInput} inputMode="decimal" disabled={readOnly} value={row.value} onChange={event=>update(entry.id,"value",event.target.value)}/>°</td>
                  <td><div className={styles.normGroup}>
                    <input aria-label={`Norma ${entry.name}`} className={styles.numberInput} inputMode="decimal" disabled={readOnly} value={row.norm} onChange={event=>update(entry.id,"norm",event.target.value)}/>
                    ±
                    <input aria-label={`DE ${entry.name}`} className={styles.numberInput} inputMode="decimal" disabled={readOnly} value={row.sd} onChange={event=>update(entry.id,"sd",event.target.value)}/>
                  </div></td>
                  <td className={styles.deviation}>{formatDeviation(e.deviation)} {e.status?<span className={e.status==="ok"?styles.ok:styles.warn}>{label[e.status]}</span>:null}</td>
                  <td><input aria-label={`Interpretación ${entry.name}`} className={styles.interpretation} disabled={readOnly} placeholder="Interpretación" value={row.manual?row.interp:e.auto} onChange={event=>update(entry.id,"interp",event.target.value)}/></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <Button size="xs" variant="light" disabled={readOnly||state.custom.length>=100} onClick={()=>{
          const id=`c${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
          commit({...state,custom:[...state.custom,{id,name:"",...defaultRow()}]});
          setActive(id);
        }}>+ Añadir medida</Button>
      </section>
      <section className={styles.diagramPanel} aria-label="Plantilla cefalométrica reactiva">
        <Group justify="space-between" gap="xs">
          <Text size="sm" fw={750}>Plantilla anatómica y angulaciones</Text>
          <Checkbox size="xs" label="Solo la seleccionada" checked={solo} onChange={event=>setSolo(event.currentTarget.checked)}/>
        </Group>
        <CephalometryDiagram values={values} statuses={statuses} active={active} solo={solo} onSelect={select}/>
        <Text size="xs" c="dimmed">Selecciona una fila o una etiqueta para resaltar sus referencias anatómicas.</Text>
      </section>
    </div>
  </section>;
}
