"use client";
import {useState} from "react";
import { Alert, Button, Group, NumberInput, Radio, Stack, TextInput, Textarea } from "@mantine/core";
import {emptyImplantOutcome,implantOutcomePayload,validateImplantOutcome,type ImplantOutcomeForm,type ImplantOutcome} from "@/domain/implant-placement-outcome";
type Props={appointmentId:string;patientId:string;doctorId:string;clinicId:string;onSave:(payload:ReturnType<typeof implantOutcomePayload>)=>Promise<void>;readOnly?:boolean};
export function ImplantPlacementOutcomeForm({appointmentId,patientId,doctorId,clinicId,onSave,readOnly=false}:Props){
 const [form,setForm]=useState(()=>emptyImplantOutcome(appointmentId,patientId,doctorId,clinicId));
 const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const set=<K extends keyof ImplantOutcomeForm>(key:K,value:ImplantOutcomeForm[K])=>setForm(prev=>({...prev,[key]:value}));
 const submit=async()=>{const errors=validateImplantOutcome(form);if(errors.length){setError(errors.join(" · "));return;}setBusy(true);setError("");try{await onSave(implantOutcomePayload(form));}catch(e){setError(e instanceof Error?e.message:"No se pudo guardar el registro.");}finally{setBusy(false)}};
 return <Stack gap="sm" aria-label="Registro obligatorio de cirugía de implantes">
 <Alert color="orange" title="Registro obligatorio">Antes de finalizar la cita, indica qué ocurrió con cada implante previsto. El resultado se atribuye al doctor asignado a la cita.</Alert>
 <TextInput required label="Posición dental / implante" placeholder="Ej. 36" value={form.toothPosition} onChange={e=>set("toothPosition",e.currentTarget.value)} disabled={readOnly}/>
 <Radio.Group label="Resultado de la cirugía" value={form.outcome??""} onChange={v=>set("outcome",v as ImplantOutcome)}>
<Group mt="xs">
<Radio value="PLACED" label="Implante colocado"/>
<Radio value="FAILED" label="X Fracaso"/>
<Radio value="DEFERRED" label="X Colocación diferida"/>
</Group>
</Radio.Group>
 {form.outcome==="PLACED"?<>
<TextInput required label="Sistema / fabricante" value={form.system} onChange={e=>set("system",e.currentTarget.value)}/>
<TextInput required label="Modelo de implante" value={form.implantModel} onChange={e=>set("implantModel",e.currentTarget.value)}/>
<TextInput required label="Plataforma / conexión" value={form.platform} onChange={e=>set("platform",e.currentTarget.value)}/>
<Group grow>
<NumberInput required label="Diámetro (mm)" min={0.1} decimalScale={2} value={form.diameterMm??""} onChange={v=>set("diameterMm",typeof v==="number"?v:null)}/>
<NumberInput required label="Longitud (mm)" min={0.1} decimalScale={2} value={form.lengthMm??""} onChange={v=>set("lengthMm",typeof v==="number"?v:null)}/>
</Group>
<TextInput label="Lote / referencia" value={form.lotNumber} onChange={e=>set("lotNumber",e.currentTarget.value)}/>
</>:null}
 {form.outcome==="FAILED"?<Radio.Group label="Tipo de fracaso" value={form.failureKind??""} onChange={v=>set("failureKind",v as ImplantOutcomeForm["failureKind"])}>
<Stack gap="xs">
<Radio value="PLACEMENT_ATTEMPT" label="No fue posible colocar el implante"/>
<Radio value="PREVIOUSLY_PLACED" label="Fracaso de implante previamente colocado"/>
</Stack>
</Radio.Group>:null}
 {form.outcome!=="PLACED"&&form.outcome!==null?<Textarea required label="Motivo clínico" value={form.reason} onChange={e=>set("reason",e.currentTarget.value)}/>:null}
 {form.outcome==="DEFERRED"?<TextInput label="Fecha de reevaluación" type="date" value={form.reassessmentDate} onChange={e=>set("reassessmentDate",e.currentTarget.value)}/>:null}
 <Textarea label="Observaciones" value={form.notes} onChange={e=>set("notes",e.currentTarget.value)}/>
 {error?<Alert color="red">{error}</Alert>:null}
 <Button onClick={()=>void submit()} disabled={readOnly||busy} loading={busy}>Añadir resultado a la lista</Button>
 </Stack>;
}
