"use client";
import { useEffect,useState } from "react";
import { api } from "../../lib/api";
export function useSession(){const[state,setState]=useState<any>({loading:true,actor:null});useEffect(()=>{api<any>("/api/auth/session").then(x=>setState({loading:false,actor:x.actor})).catch(()=>setState({loading:false,actor:null}))},[]);return state}
