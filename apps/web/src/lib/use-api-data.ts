"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export function useApiData<T>(path:string,initial:T){
  const query=useQuery<T>({
    queryKey:["api",path],
    queryFn:()=>api<T>(path),
    initialData:initial,
  });
  return {
    data:query.data ?? initial,
    setData:(next:T|((prev:T)=>T))=>queryClientSet(path,next),
    loading:query.isPending || query.isFetching,
    error:query.error instanceof Error ? query.error.message : "",
    refresh:()=>query.refetch().then(x=>x.data as T),
  };
}

let externalClientSetter:((path:string,next:any)=>void)|null=null;
function queryClientSet<T>(path:string,next:T|((prev:T)=>T)){
  externalClientSetter?.(path,next);
}

export function QueryCacheBridge(){
  const client=useQueryClient();
  useEffect(()=>{
    externalClientSetter=(path,next)=>client.setQueryData(["api",path],(prev:any)=>typeof next==="function"?next(prev):next);
    return()=>{ externalClientSetter=null; };
  },[client]);
  return null;
}

export function useRealtime(refresh?:()=>unknown){
  const client=useQueryClient();
  useEffect(()=>{
    const es=new EventSource("/api/events",{withCredentials:true});
    const invalidate=()=>{
      void client.invalidateQueries({queryKey:["api"]});
      refresh?.();
    };
    es.onmessage=invalidate;
    const names=["appointment.created","appointment.arrived","appointment.in_chair","appointment.completed","appointment.no_show","clinical_plan.item_created","clinical_plan.completed","invoice.issued","invoice.rectified","payment.received","payment.allocated","lab.sent","lab.received","lab.placed","odontogram.updated","document.signed"];
    names.forEach(name=>es.addEventListener(name,invalidate));
    return()=>es.close();
  },[client,refresh]);
}
