export function toFhirDocumentReference(x:{id:string;patientId:string;url:string;contentType:string;createdAt:string;title:string}){
 return {resourceType:'DocumentReference',id:x.id,status:'current',subject:{reference:`Patient/${x.patientId}`},date:x.createdAt,description:x.title,content:[{attachment:{contentType:x.contentType,url:x.url,creation:x.createdAt}}]};
}
export function toFhirAuditEvent(x:{id:string;action:'C'|'R'|'U'|'D'|'E';recorded:string;patientId?:string;agentId:string}){
 return {resourceType:'AuditEvent',id:x.id,code:{text:'Denty audit event'},action:x.action,recorded:x.recorded,agent:[{who:{reference:`Practitioner/${x.agentId}`},requestor:true}],source:{observer:{reference:'Device/denty'}},...(x.patientId?{patient:{reference:`Patient/${x.patientId}`}}:{})};
}
