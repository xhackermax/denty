"use client";

import { useMantineColorScheme } from "@mantine/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  DENTY_APPEARANCE_STORAGE_KEY,
  isDentyAppearancePreference,
  nextSchemeBoundary,
  resolveAppearanceScheme,
  type DentyAppearancePreference,
  type DentyColorScheme,
} from "@/domain/appearance-schedule";

interface DentyAppearanceContextValue {
  preference: DentyAppearancePreference;
  resolvedScheme: DentyColorScheme;
  setPreference: (preference: DentyAppearancePreference) => void;
}

const DentyAppearanceContext = createContext<DentyAppearanceContextValue | null>(null);

function initialPreference(): DentyAppearancePreference {
  if (typeof window === "undefined") return "time";
  const stored = window.localStorage.getItem(DENTY_APPEARANCE_STORAGE_KEY);
  return isDentyAppearancePreference(stored) ? stored : "time";
}

export function TimeColorSchemeProvider({ children }: { children: ReactNode }) {
  const { setColorScheme } = useMantineColorScheme();
  const [preference, setPreferenceState] = useState<DentyAppearancePreference>(initialPreference);
  const [resolvedScheme, setResolvedScheme] = useState<DentyColorScheme>(() => resolveAppearanceScheme(initialPreference()));

  const setPreference = useCallback((nextPreference: DentyAppearancePreference) => {
    window.localStorage.setItem(DENTY_APPEARANCE_STORAGE_KEY, nextPreference);
    setPreferenceState(nextPreference);
  }, []);

  useEffect(() => {
    let boundaryTimer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      if (boundaryTimer) clearTimeout(boundaryTimer);
      const now = new Date();
      const scheme = resolveAppearanceScheme(preference, now);
      setResolvedScheme(scheme);
      setColorScheme(scheme);

      if (preference === "time") {
        const delay = Math.max(0, nextSchemeBoundary(now).getTime() - now.getTime()) + 25;
        boundaryTimer = setTimeout(refresh, delay);
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "hidden") refresh();
    };

    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      if (boundaryTimer) clearTimeout(boundaryTimer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [preference, setColorScheme]);

  const value = useMemo(() => ({ preference, resolvedScheme, setPreference }), [preference, resolvedScheme, setPreference]);
  return <DentyAppearanceContext.Provider value={value}>{children}</DentyAppearanceContext.Provider>;
}

export function useDentyAppearance(): DentyAppearanceContextValue {
  const context = useContext(DentyAppearanceContext);
  if (!context) throw new Error("useDentyAppearance must be used within TimeColorSchemeProvider");
  return context;
}
