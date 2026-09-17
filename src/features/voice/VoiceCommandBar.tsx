"use client";
import {FormEvent,useEffect,useRef,useState} from "react";
import {api} from "../../lib/api";

type VoiceAction={type:string;[key:string]:unknown};
type VoicePreview={planToken:string;plan:{raw:string;actions:VoiceAction[];readback:string;ambiguities:string[]};policy:{canExecute:boolean;requiresConfirmation:boolean;reasons:string[]};resolution?:{patientMatches?:Array<{id:string;firstName?:string;lastName?:string}>}};
type VoiceResult={status:string;plan?:VoicePreview["plan"];results?:unknown[];question?:string;patient?:{id:string;name:string};patientMatches?:Array<{id:string;firstName?:string;lastName?:string}>};
type VoiceCapabilities={asrConfigured:boolean;llmConfigured:boolean;localNlu:boolean};
type Transcription={text:string;provider:string};

type BrowserSpeechRecognition={
  lang:string;continuous:boolean;interimResults:boolean;
  onresult:null|((event:any)=>void);onerror:null|((event:any)=>void);onend:null|(()=>void);
  start:()=>void;stop:()=>void;
};

type BrowserSpeechRecognitionCtor=new()=>BrowserSpeechRecognition;

function speechCtor():BrowserSpeechRecognitionCtor|undefined{
  if(typeof window==="undefined")return undefined;
  const w=window as typeof window & {SpeechRecognition?:BrowserSpeechRecognitionCtor;webkitSpeechRecognition?:BrowserSpeechRecognitionCtor};
  return w.SpeechRecognition??w.webkitSpeechRecognition;
}
function hasMediaRecorder(){return typeof window!=="undefined"&&typeof MediaRecorder!=="undefined"&&!!navigator.mediaDevices?.getUserMedia}
function blobToBase64(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const value=String(reader.result??"");resolve(value.includes(",")?value.split(",",2)[1]:value)};reader.onerror=()=>reject(reader.error??new Error("No se pudo leer el audio"));reader.readAsDataURL(blob)})}
function actionLabel(action:VoiceAction){const labels:Record<string,string>={"patient.resolve":"Resolver paciente","appointment.arrive":"Marcar llegada","appointment.no_show":"Marcar ausente","clinical.add_item":"Añadir tratamiento","clinical.add_dependency":"Ordenar tratamientos","appointment.schedule":"Programar cita","budget.sync":"Preparar presupuesto","payment.record":"Registrar cobro","lab.transition":"Actualizar laboratorio","navigation.open":"Abrir pantalla"};return labels[action.type]??action.type;}

export function VoiceCommandBar(){
  const [open,setOpen]=useState(false),[text,setText]=useState(""),[preview,setPreview]=useState<VoicePreview|null>(null),[result,setResult]=useState<VoiceResult|null>(null),[busy,setBusy]=useState(false),[listening,setListening]=useState(false),[error,setError]=useState(""),[capabilities,setCapabilities]=useState<VoiceCapabilities|null>(null);
  const recognition=useRef<BrowserSpeechRecognition|null>(null),recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),recordingTimer=useRef<ReturnType<typeof setTimeout>|null>(null),chunks=useRef<Blob[]>([]);
  const canBrowserSpeak=!!speechCtor(),canServerSpeak=Boolean(capabilities?.asrConfigured&&hasMediaRecorder()),canSpeak=canServerSpeak||canBrowserSpeak;

  useEffect(()=>{if(!open||capabilities)return;api<VoiceCapabilities>("/api/voice/capabilities").then(setCapabilities).catch(()=>setCapabilities({asrConfigured:false,llmConfigured:false,localNlu:true}))},[open,capabilities]);
  useEffect(()=>()=>{if(recordingTimer.current)clearTimeout(recordingTimer.current);recognition.current?.stop();recorder.current?.state==="recording"&&recorder.current.stop();stream.current?.getTracks().forEach(track=>track.stop())},[]);

  function resetPreview(next=text){setText(next);setPreview(null);setResult(null);setError("")}
  async function submitPreview(event?:FormEvent){event?.preventDefault();const command=text.trim();if(!command)return;setBusy(true);setError("");setResult(null);try{setPreview(await api<VoicePreview>("/api/voice/preview",{method:"POST",body:JSON.stringify({text:command})}))}catch(e:any){setError(e?.payload?.error?.message??e?.message??"No se pudo interpretar la orden") }finally{setBusy(false)}}
  async function execute(confirmed:boolean){const command=text.trim();if(!command)return;setBusy(true);setError("");try{if(!preview?.planToken)throw new Error("Revisa de nuevo la orden antes de ejecutarla.");const r=await api<VoiceResult>("/api/voice/execute",{method:"POST",body:JSON.stringify({planToken:preview.planToken,confirmed})});setResult(r);if(r.status==="EXECUTED")setPreview(null)}catch(e:any){setError(e?.payload?.error?.message??e?.message??"No se pudo ejecutar la orden")}finally{setBusy(false)}}
  function stopAudioResources(){if(recordingTimer.current){clearTimeout(recordingTimer.current);recordingTimer.current=null}stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;recorder.current=null;setListening(false)}
  async function transcribeRecording(blob:Blob){if(!blob.size)throw new Error("No se recibió audio");const base64=await blobToBase64(blob);const response=await api<Transcription>("/api/voice/transcribe",{method:"POST",body:JSON.stringify({base64,mimeType:blob.type||"audio/webm",language:"es"})});resetPreview(response.text)}
  async function toggleServerMic(){
    if(recorder.current?.state==="recording"){recorder.current.stop();return}
    try{
      const mediaStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});stream.current=mediaStream;chunks.current=[];
      const preferred=typeof MediaRecorder.isTypeSupported==="function"&&MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"audio/webm";
      const mediaRecorder=new MediaRecorder(mediaStream,{mimeType:preferred});recorder.current=mediaRecorder;
      mediaRecorder.ondataavailable=event=>{if(event.data?.size)chunks.current.push(event.data)};
      mediaRecorder.onerror=()=>{setError("No se pudo grabar el audio.");stopAudioResources()};
      mediaRecorder.onstop=async()=>{const blob=new Blob(chunks.current,{type:mediaRecorder.mimeType||preferred});stopAudioResources();setBusy(true);setError("");try{await transcribeRecording(blob)}catch(e:any){setError(e?.payload?.error?.message??e?.message??"No se pudo transcribir el audio") }finally{setBusy(false)}};
      setError("");setListening(true);mediaRecorder.start(250);recordingTimer.current=setTimeout(()=>{if(mediaRecorder.state==="recording")mediaRecorder.stop()},30000);
    }catch(e:any){stopAudioResources();setError(e?.name==="NotAllowedError"?"El navegador no tiene permiso para usar el micrófono.":"No se pudo iniciar el micrófono.")}
  }
  function toggleBrowserMic(){
    if(listening){recognition.current?.stop();return}
    const Ctor=speechCtor();if(!Ctor){setError("Este navegador no ofrece dictado de voz. Puedes escribir la orden.");return}
    const r=new Ctor();recognition.current=r;r.lang="es-ES";r.continuous=false;r.interimResults=false;
    r.onresult=(event:any)=>{const transcript=String(event?.results?.[0]?.[0]?.transcript??"").trim();if(transcript)resetPreview(transcript)};
    r.onerror=(event:any)=>setError(event?.error==="not-allowed"?"El navegador no tiene permiso para usar el micrófono.":"No se pudo reconocer la voz.");
    r.onend=()=>{setListening(false);recognition.current=null};setError("");setListening(true);r.start();
  }
  function toggleMic(){if(canServerSpeak){void toggleServerMic();return}toggleBrowserMic()}
  const readback=preview?.plan.readback??result?.plan?.readback;
  return <div className={`voice-command-bar${open?" is-open":""}`}>
    <button type="button" className="voice-fab" aria-label="Abrir Oye Denty" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>◉<span>Oye Denty</span></button>
    {open&&<section className="voice-panel" aria-label="Comandos de voz de Denty">
      <div className="voice-panel-head"><div><strong>Oye Denty</strong><small>Describe lo que quieres hacer. Denty te enseña el plan antes de escribir.</small></div><button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar">×</button></div>
      <form className="voice-form" onSubmit={submitPreview}>
        <input className="native-input" value={text} onChange={e=>resetPreview(e.target.value)} placeholder="Ej. Carlos ha llegado y hay que hacer endodoncia 22" aria-label="Orden para Denty"/>
        <button type="button" className={`native-button voice-mic${listening?" listening":""}`} disabled={!canSpeak||busy} onClick={toggleMic}>{listening?"Detener":"Micrófono"}</button>
        <button className="native-button primary" disabled={busy||!text.trim()}>{busy?"Procesando…":"Revisar"}</button>
      </form>
      <small className="voice-source">{canServerSpeak?"Reconocimiento local/servidor activo":canBrowserSpeak?"Usando reconocimiento del navegador":"Micrófono no disponible; puedes escribir la orden"}</small>
      {error&&<div className="native-error">{error}</div>}
      {preview&&<div className="voice-preview">
        <div className="voice-readback"><span>Antes de ejecutar</span><strong>{preview.plan.readback}</strong></div>
        {!!preview.plan.actions.length&&<div className="voice-actions">{preview.plan.actions.filter(a=>a.type!=="patient.resolve").map((a,i)=><span className="native-badge" key={`${a.type}-${i}`}>{actionLabel(a)}</span>)}</div>}
        {!preview.policy.canExecute?<div className="voice-warning">Necesito una aclaración antes de modificar la ficha.</div>:<div className="voice-confirm-row">
          {preview.policy.requiresConfirmation?<><span className="voice-warning">Esta orden necesita confirmación.</span><button type="button" className="native-button primary" disabled={busy} onClick={()=>execute(true)}>Confirmar y ejecutar</button></>:<button type="button" className="native-button primary" disabled={busy} onClick={()=>execute(false)}>Ejecutar</button>}
          <button type="button" className="native-button" onClick={()=>setPreview(null)}>Editar orden</button>
        </div>}
      </div>}
      {result&&<div className={`voice-result status-${result.status.toLowerCase()}`}><strong>{result.status==="EXECUTED"?"Hecho":result.status==="NEEDS_CONFIRMATION"?"Necesita confirmación":"Necesito aclararlo"}</strong>{readback&&<span>{readback}</span>}{result.question&&<span>{result.question}</span>}{result.patient&&<small>Paciente: {result.patient.name}</small>}</div>}
    </section>}
  </div>
}
