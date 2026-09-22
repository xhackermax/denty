"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { createDentyQueryClient } from "./query-client";
import { DentyRealtimeBridge } from "./realtime-bridge";

export function DentyQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createDentyQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <DentyRealtimeBridge />
      {children}
    </QueryClientProvider>
  );
}
