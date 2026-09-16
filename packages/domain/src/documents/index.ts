import { createHash } from "node:crypto";
export function mergeTemplate(body:string,data:Record<string,string|number|null|undefined>):string{return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g,(_,key)=>String(data[key]??""));}
export function documentHash(body:string):string{return createHash("sha256").update(body).digest("hex");}
export function attendanceCertificate(input:{patientName:string;dni?:string;date:string;start?:string;end?:string;clinicName:string;address?:string;city?:string;procedure?:string;includeProcedure?:boolean}){
  const id=input.dni?`, con DNI/NIE ${input.dni}`:""; const purpose=input.includeProcedure&&input.procedure?`para la realización de ${input.procedure}`:"para recibir asistencia odontológica"; const time=input.start?` La asistencia consta registrada desde las ${input.start}${input.end?` hasta las ${input.end}`:""}.`:"";
  return `D./D.ª ${input.patientName}${id} ha acudido en el día ${input.date} a ${input.clinicName}${input.address?`, sito en ${input.address}`:""} ${purpose}.${time}\n\nY para que conste, a petición de la persona interesada, se expide el presente justificante${input.city?` en ${input.city}`:""}, a ${input.date}.\n\nEste documento acredita exclusivamente la asistencia al centro en la fecha y horario indicados.`;
}
