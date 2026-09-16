"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useSession} from "../../features/auth/use-session";
import {VoiceCommandBar} from "../../features/voice/VoiceCommandBar";
import {api} from "../../lib/api";

type NavItem={rx:RegExp;icon:string;label:string;href:string;permission?:string|"agenda.read"};
const main:NavItem[]=[
 {rx:/\/app$/,icon:"⌂",label:"Inicio",href:"/app"},
 {rx:/patients/,icon:"♙",label:"Pacientes",href:"/app/patients",permission:"patients.read"},
 {rx:/agenda/,icon:"▦",label:"Agenda",href:"/app/agenda",permission:"agenda.read"},
 {rx:/analysis/,icon:"↗",label:"Análisis",href:"/app/analysis",permission:"analysis.read"},
 {rx:/finance/,icon:"€",label:"Finanzas",href:"/app/finance",permission:"finance.read"},
 {rx:/laboratory/,icon:"◇",label:"Laboratorio",href:"/app/laboratory",permission:"lab.read"},
 {rx:/documents/,icon:"□",label:"Documentos",href:"/app/documents",permission:"documents.read"}
];
function allowed(actor:any,permission?:string){if(!permission)return true;const p=actor?.permissions??[];if(permission==="agenda.read")return p.includes("agenda.read.all")||p.includes("agenda.read.own");return p.includes(permission)}
export function AppShell({children}:{children:React.ReactNode}){const{loading,actor}=useSession(),path=usePathname();if(loading)return <div className="native-denty native-empty">Cargando Denty…</div>;if(!actor){if(typeof window!=="undefined")location.href="/login";return null}const patient=actor.role==="PATIENT";if(patient){if(typeof window!=="undefined"&&!path.startsWith("/patient"))location.href=`/patient/${actor.patientIds?.[0]??""}`;return null}async function logout(){await api("/api/auth/logout",{method:"POST"});location.href="/login"}return <div className="native-denty native-shell"><aside className="native-sidebar"><div className="native-brand"><img src="/assets/denty-logo.png" alt=""/><span>Denty</span></div><div className="native-section-label">Herramientas rápidas</div><nav className="native-nav">{main.filter(x=>allowed(actor,x.permission)).map(x=><Link key={x.href} href={x.href} aria-current={x.rx.test(path)?"page":undefined}><b>{x.icon}</b><span>{x.label}</span></Link>)}</nav><div className="native-section-label">Sistema</div><nav className="native-nav">{allowed(actor,"settings.manage")&&<Link href="/app/settings"><b>⚙</b><span>Ajustes</span></Link>}{allowed(actor,"settings.manage")&&<Link href="/legacy"><b>◫</b><span>Legacy</span></Link>}<button className="native-button" onClick={logout}>Salir</button></nav></aside><main className="native-main">{children}</main><VoiceCommandBar/></div>}
