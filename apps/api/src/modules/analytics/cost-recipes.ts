import { prisma, runBusinessTransaction, writeAudit, writeDomainEvent } from "@denty/db";
import type { ActorContext } from "@denty/domain";

export interface TreatmentCostRecipeInput {
  treatmentCode: string;
  name?: string;
  activeFrom?: string | Date;
  activeUntil?: string | Date | null;
  items: Array<{ category:string; description:string; quantity?:number; unitCostCents:number }>;
}

export async function resolveStandardTreatmentCost(tx:any, clinicId:string, treatmentCode:string, at:Date=new Date()) {
  const recipe=await tx.treatmentCostRecipe.findFirst({
    where:{clinicId,treatmentCode,activeFrom:{lte:at},OR:[{activeUntil:null},{activeUntil:{gte:at}}]},
    include:{items:true},
    orderBy:{activeFrom:"desc"}
  });
  if(!recipe)return{recipeId:null,costCents:0,items:[]};
  const items=recipe.items.map((x:any)=>({...x,lineCostCents:Math.max(0,Number(x.quantity??1))*Math.max(0,Number(x.unitCostCents??0))}));
  return{recipeId:recipe.id,costCents:items.reduce((n:number,x:any)=>n+x.lineCostCents,0),items};
}

export async function createTreatmentCostRecipe(actor:ActorContext,input:TreatmentCostRecipeInput,correlationId:string){
  return runBusinessTransaction(prisma,async tx=>{
    if(!input.treatmentCode?.trim())throw Object.assign(new Error("Falta treatmentCode"),{statusCode:400});
    if(!Array.isArray(input.items)||!input.items.length)throw Object.assign(new Error("La receta necesita al menos un coste"),{statusCode:400});
    const recipe=await tx.treatmentCostRecipe.create({data:{
      clinicId:actor.clinicId,
      treatmentCode:input.treatmentCode.trim(),
      name:input.name?.trim()||input.treatmentCode.trim(),
      activeFrom:input.activeFrom?new Date(input.activeFrom):new Date(),
      activeUntil:input.activeUntil?new Date(input.activeUntil):null,
      items:{create:input.items.map(x=>({category:String(x.category||"material"),description:String(x.description),quantity:Math.max(1,Math.round(Number(x.quantity??1))),unitCostCents:Math.max(0,Math.round(Number(x.unitCostCents))) }))}
    },include:{items:true}});
    await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"analytics.cost_recipe_created",entityType:"treatment_cost_recipe",entityId:recipe.id,correlationId,after:{treatmentCode:recipe.treatmentCode,itemCount:recipe.items.length}});
    await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"analytics.cost_recipe_created",entityType:"treatment_cost_recipe",entityId:recipe.id,correlationId,payload:{treatmentCode:recipe.treatmentCode,activeFrom:recipe.activeFrom}});
    return recipe;
  });
}

export async function retireTreatmentCostRecipe(actor:ActorContext,id:string,activeUntil:Date,correlationId:string){
  return runBusinessTransaction(prisma,async tx=>{
    const before=await tx.treatmentCostRecipe.findFirstOrThrow({where:{id,clinicId:actor.clinicId}});
    const recipe=await tx.treatmentCostRecipe.update({where:{id},data:{activeUntil}});
    await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"analytics.cost_recipe_retired",entityType:"treatment_cost_recipe",entityId:id,correlationId,before:{activeUntil:before.activeUntil},after:{activeUntil:recipe.activeUntil}});
    return recipe;
  });
}
