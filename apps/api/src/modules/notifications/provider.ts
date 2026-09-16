export interface NotificationDeliveryInput{channel:string;type:string;subject?:string|null;body:string;target?:string|null;notificationId:string}
export interface NotificationDeliveryResult{status:"SENT"|"PENDING"|"FAILED";providerRef?:string;error?:string}
export async function sendNotification(input:NotificationDeliveryInput):Promise<NotificationDeliveryResult>{
  const channel=input.channel.toUpperCase();if(channel==="PORTAL")return{status:"SENT",providerRef:`portal:${input.notificationId}`};
  const endpoint=process.env.DENTY_NOTIFICATION_ENDPOINT;if(!endpoint)return{status:"PENDING",error:"DENTY_NOTIFICATION_ENDPOINT no configurado"};
  const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json",...(process.env.DENTY_NOTIFICATION_API_KEY?{authorization:`Bearer ${process.env.DENTY_NOTIFICATION_API_KEY}`}:{})},body:JSON.stringify(input)});
  if(!response.ok)return{status:"FAILED",error:`Proveedor HTTP ${response.status}`};const payload=await response.json().catch(()=>({})) as any;return{status:"SENT",providerRef:payload.id??payload.messageId};
}
