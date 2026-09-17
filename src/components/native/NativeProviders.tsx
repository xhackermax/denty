"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { QueryCacheBridge } from "../../lib/use-api-data";
import { DentyMotionRuntime } from "./DentyMotionRuntime";

export function NativeProviders({ children }:{ children:React.ReactNode }){
  const [client] = useState(() => new QueryClient({
    defaultOptions:{
      queries:{
        staleTime: 15_000,
        refetchOnWindowFocus: true,
        retry: (count,error:any) => error?.status===401||error?.status===403 ? false : count < 2,
      },
      mutations:{ retry:false }
    }
  }));
  return <QueryClientProvider client={client}><QueryCacheBridge/><DentyMotionRuntime/>{children}</QueryClientProvider>;
}
