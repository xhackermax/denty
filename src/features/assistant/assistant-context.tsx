"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import type { AssistantContext } from "./assistant-types";

const Context = createContext<AssistantContext | null>(null);
const PatchContext = createContext<((patch: Partial<AssistantContext>) => void) | null>(null);

function patientIdFromPath(pathname: string): string | undefined {
  return pathname.match(/^\/app\/patients\/([^/]+)/)?.[1];
}

export function AssistantContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [patch, setPatch] = useState<Partial<AssistantContext>>({});
  const value = useMemo<AssistantContext>(() => {
    const inferredPatientId = patientIdFromPath(pathname);
    return {
      pathname,
      ...(inferredPatientId ? { patientId: inferredPatientId } : {}),
      ...patch,
    };
  }, [pathname, patch]);

  return (
    <PatchContext.Provider value={(next) => setPatch((current) => ({ ...current, ...next }))}>
      <Context.Provider value={value}>{children}</Context.Provider>
    </PatchContext.Provider>
  );
}

export function useAssistantContext(): AssistantContext {
  const value = useContext(Context);
  if (!value) throw new Error("useAssistantContext debe usarse dentro de AssistantContextProvider.");
  return value;
}

export function useAssistantContextPatch(): (patch: Partial<AssistantContext>) => void {
  const value = useContext(PatchContext);
  if (!value) throw new Error("useAssistantContextPatch debe usarse dentro de AssistantContextProvider.");
  return value;
}
