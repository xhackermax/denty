"use client";
import { useContext, useEffect, useRef } from "react";
import { NavigationContext, type UnsavedGuard } from "./navigation-provider";
export function useUnsavedChangesGuard(guard: UnsavedGuard) {
  const context = useContext(NavigationContext);
  const latest = useRef(guard);
  latest.current = guard;
  const register = context?.register;
  useEffect(() => register?.(() => latest.current), [register]);
  useEffect(() => {
    if (!guard.dirty) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [guard.dirty]);
  return { confirmLeave: context?.confirmLeave ?? ((navigate: () => void) => navigate()) };
}
