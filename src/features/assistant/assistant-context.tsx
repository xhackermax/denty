"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import type { AssistantContext } from "./assistant-types";

const Context = createContext<AssistantContext | null>(null);
type AssistantContextPatch = {
  [Key in keyof AssistantContext]?: AssistantContext[Key] | undefined;
};
const PatchContext = createContext<((patch: AssistantContextPatch) => void) | null>(null);

function patientIdFromPath(pathname: string): string | undefined {
  return pathname.match(/^\/app\/patients\/([^/]+)/)?.[1];
}

function applyContextPatch(base: AssistantContext, patch: AssistantContextPatch): AssistantContext {
  const next = { ...base };
  if (patch.pathname !== undefined) next.pathname = patch.pathname;
  // Clearing a screen's own patient returns to the one in the URL instead of dropping it.
  if (patch.patientId !== undefined) next.patientId = patch.patientId;
  if ("patientName" in patch) {
    if (patch.patientName === undefined) delete next.patientName;
    else next.patientName = patch.patientName;
  }
  if ("selectedTooth" in patch) {
    if (patch.selectedTooth === undefined) delete next.selectedTooth;
    else next.selectedTooth = patch.selectedTooth;
  }
  if ("selectedAppointmentId" in patch) {
    if (patch.selectedAppointmentId === undefined) delete next.selectedAppointmentId;
    else next.selectedAppointmentId = patch.selectedAppointmentId;
  }
  if ("activeBudgetId" in patch) {
    if (patch.activeBudgetId === undefined) delete next.activeBudgetId;
    else next.activeBudgetId = patch.activeBudgetId;
  }
  if ("activePlanVersion" in patch) {
    if (patch.activePlanVersion === undefined) delete next.activePlanVersion;
    else next.activePlanVersion = patch.activePlanVersion;
  }
  if ("lastTool" in patch) {
    if (patch.lastTool === undefined) delete next.lastTool;
    else next.lastTool = patch.lastTool;
  }
  if ("lastEntities" in patch) {
    if (patch.lastEntities === undefined) delete next.lastEntities;
    else next.lastEntities = patch.lastEntities;
  }
  return next;
}

export function AssistantContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [patch, setPatch] = useState<AssistantContextPatch>({});
  const value = useMemo<AssistantContext>(() => {
    const inferredPatientId = patientIdFromPath(pathname);
    return applyContextPatch(
      {
        pathname,
        ...(inferredPatientId ? { patientId: inferredPatientId } : {}),
      },
      patch,
    );
  }, [pathname, patch]);

  return (
    <PatchContext.Provider value={(next) => setPatch((current) => ({ ...current, ...next }))}>
      <Context.Provider value={value}>{children}</Context.Provider>
    </PatchContext.Provider>
  );
}

export function useAssistantContext(): AssistantContext {
  const value = useContext(Context);
  if (!value)
    throw new Error("useAssistantContext debe usarse dentro de AssistantContextProvider.");
  return value;
}

export function useOptionalAssistantContext(): Partial<AssistantContext> {
  return useContext(Context) ?? {};
}

export function useAssistantContextPatch(): (patch: AssistantContextPatch) => void {
  const value = useContext(PatchContext);
  if (!value)
    throw new Error("useAssistantContextPatch debe usarse dentro de AssistantContextProvider.");
  return value;
}

export function useOptionalAssistantContextPatch(): (patch: AssistantContextPatch) => void {
  return useContext(PatchContext) ?? (() => undefined);
}
