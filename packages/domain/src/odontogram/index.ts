export type DentalEntityType = "TOOTH_STATE"|"RESTORATION"|"ENDO"|"POST"|"CROWN"|"IMPLANT"|"ABUTMENT"|"BRIDGE"|"PONTIC"|"REMOVABLE"|"ORTHODONTIC"|"PEDIATRIC";
export interface DentalEntity { id:string; tooth?:string; arch?:"upper"|"lower"; entityType:DentalEntityType; status:string; surfaces?:string[]; attributes?:Record<string,unknown>; parentId?:string; active:boolean; }
export interface OdontogramState { entities:DentalEntity[]; }
export type DentalCommand = {type:"UPSERT"; entity:DentalEntity}|{type:"REMOVE"; id:string}|{type:"SET_STATUS"; id:string; status:string};
export function reduceDental(state:OdontogramState,command:DentalCommand):OdontogramState{
  if(command.type==="UPSERT"){const i=state.entities.findIndex(x=>x.id===command.entity.id);return{entities:i<0?[...state.entities,command.entity]:state.entities.map((x,n)=>n===i?command.entity:x)}};
  if(command.type==="REMOVE")return{entities:state.entities.map(x=>x.id===command.id?{...x,active:false}:x)};
  return{entities:state.entities.map(x=>x.id===command.id?{...x,status:command.status}:x)};
}
export function bridgeEntity(id:string,from:string,to:string,pillars:string[],pontics:string[],status="planned"):DentalEntity{return{id,entityType:"BRIDGE",status,active:true,attributes:{from,to,pillars,pontics}}}
export function implantStack(tooth:string,status="planned"):DentalEntity[]{const base=`implant-${tooth}`;return[
  {id:base,tooth,entityType:"IMPLANT",status,active:true},
  {id:`${base}-abutment`,tooth,entityType:"ABUTMENT",status,active:true,parentId:base},
  {id:`${base}-crown`,tooth,entityType:"CROWN",status,active:true,parentId:`${base}-abutment`}
]}
export function compareSnapshots(before:OdontogramState,after:OdontogramState){const b=new Map(before.entities.map(x=>[x.id,x]));const a=new Map(after.entities.map(x=>[x.id,x]));return{added:[...a.values()].filter(x=>!b.has(x.id)),removed:[...b.values()].filter(x=>!a.has(x.id)),changed:[...a.values()].filter(x=>{const old=b.get(x.id);return old&&JSON.stringify(old)!==JSON.stringify(x)})}}
