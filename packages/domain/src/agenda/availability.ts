export interface TimeRange{startsAt:Date;endsAt:Date}
export function overlaps(a:TimeRange,b:TimeRange){return a.startsAt<b.endsAt&&b.startsAt<a.endsAt}
export function slotIsAvailable(slot:TimeRange,busy:TimeRange[],blocks:TimeRange[]=[]){return ![...busy,...blocks].some(x=>overlaps(slot,x))}
export function waitingVisualState(input:{status:string;arrivedAt?:Date|null;now?:Date}){"use strict";const now=input.now??new Date();if(input.status==="IN_CHAIR")return"green";if(input.status==="NO_SHOW")return"blue";if(input.status==="ARRIVED"&&input.arrivedAt){const min=(now.getTime()-input.arrivedAt.getTime())/60000;return min>15?"red":"yellow"}return"neutral";}
