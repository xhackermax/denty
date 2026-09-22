"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

export type Density = "comfortable" | "compact";

interface DensityContextValue {
  density: Density;
  setDensity: (density: Density) => void;
}

const STORAGE_KEY = "denty.ui.density";
const DENSITY_CHANGE_EVENT = "denty:density-change";
const DEFAULT_DENSITY: Density = "comfortable";
const DensityContext = createContext<DensityContextValue | null>(null);

function parseDensity(value: string | null): Density {
  return value === "compact" || value === "comfortable" ? value : DEFAULT_DENSITY;
}

function getDensitySnapshot(): Density {
  return parseDensity(window.localStorage.getItem(STORAGE_KEY));
}

function getServerDensitySnapshot(): Density {
  return DEFAULT_DENSITY;
}

function subscribeToDensity(onStoreChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(DENSITY_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(DENSITY_CHANGE_EVENT, onStoreChange);
  };
}

function persistDensity(density: Density): void {
  window.localStorage.setItem(STORAGE_KEY, density);
  window.dispatchEvent(new Event(DENSITY_CHANGE_EVENT));
}

export function DensityProvider({ children }: { children: ReactNode }) {
  const density = useSyncExternalStore(
    subscribeToDensity,
    getDensitySnapshot,
    getServerDensitySnapshot,
  );

  const setDensity = useCallback((nextDensity: Density) => {
    persistDensity(nextDensity);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  const value = useMemo(() => ({ density, setDensity }), [density, setDensity]);
  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

export function useDensity(): DensityContextValue {
  const context = useContext(DensityContext);
  if (!context) {
    throw new Error("useDensity must be used inside DensityProvider");
  }
  return context;
}
