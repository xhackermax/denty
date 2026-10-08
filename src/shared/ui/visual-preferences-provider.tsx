"use client";

import { MotionConfig } from "motion/react";
import { readBrowserStorageItem, writeBrowserStorageItem } from "@/shared/browser/browser-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  DEFAULT_VISUAL_PREFERENCES,
  VISUAL_PREFERENCES_EVENT,
  VISUAL_PREFERENCES_KEY,
  isVisualPaletteId,
  isVisualWallpaperId,
  parseVisualPreferences,
  type VisualPaletteId,
  type VisualPreferences,
  type VisualWallpaperId,
} from "@/domain/visual-personalization";

interface VisualPreferencesContextValue extends VisualPreferences {
  setPalette: (palette: VisualPaletteId) => void;
  setWallpaper: (wallpaper: VisualWallpaperId) => void;
  setAnimations: (animations: boolean) => void;
  reset: () => void;
}

const Context = createContext<VisualPreferencesContextValue | null>(null);

let lastStored: string | null | undefined;
let lastSnapshot: VisualPreferences = { ...DEFAULT_VISUAL_PREFERENCES };

function getSnapshot(): VisualPreferences {
  const stored = readBrowserStorageItem(VISUAL_PREFERENCES_KEY);
  if (!stored.ok) return lastSnapshot;
  const raw = stored.value;
  if (raw === lastStored) return lastSnapshot;
  lastStored = raw;
  lastSnapshot = parseVisualPreferences(raw);
  return lastSnapshot;
}

function getServerSnapshot(): VisualPreferences {
  return DEFAULT_VISUAL_PREFERENCES;
}

function subscribe(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === VISUAL_PREFERENCES_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(VISUAL_PREFERENCES_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(VISUAL_PREFERENCES_EVENT, callback);
  };
}

function persistPreferences(value: VisualPreferences) {
  const normalized = {
    palette: isVisualPaletteId(value.palette) ? value.palette : "denty",
    wallpaper: isVisualWallpaperId(value.wallpaper) ? value.wallpaper : "none",
    animations: value.animations === true,
  } satisfies VisualPreferences;

  if (writeBrowserStorageItem(VISUAL_PREFERENCES_KEY, JSON.stringify(normalized))) {
    window.dispatchEvent(new Event(VISUAL_PREFERENCES_EVENT));
  }
}

export function VisualPreferencesProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setPalette = useCallback((palette: VisualPaletteId) => {
    persistPreferences({ ...getSnapshot(), palette });
  }, []);
  const setWallpaper = useCallback((wallpaper: VisualWallpaperId) => {
    persistPreferences({ ...getSnapshot(), wallpaper });
  }, []);
  const setAnimations = useCallback((animations: boolean) => {
    persistPreferences({ ...getSnapshot(), animations });
  }, []);
  const reset = useCallback(() => persistPreferences({ ...DEFAULT_VISUAL_PREFERENCES }), []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.dentyPalette = settings.palette;
    root.dataset.dentyWallpaper = settings.wallpaper;
    root.dataset.dentyAnimations = settings.animations ? "on" : "off";
  }, [settings.palette, settings.wallpaper, settings.animations]);

  const value = useMemo(
    () => ({ ...settings, setPalette, setWallpaper, setAnimations, reset }),
    [settings, setPalette, setWallpaper, setAnimations, reset],
  );

  return (
    <Context.Provider value={value}>
      <MotionConfig reducedMotion={settings.animations ? "user" : "always"}>
        {children}
      </MotionConfig>
    </Context.Provider>
  );
}

/** Default values also make isolated motion components safe in test harnesses. */
export function useVisualPreferences(): VisualPreferencesContextValue {
  const value = useContext(Context);
  return value ?? {
    ...DEFAULT_VISUAL_PREFERENCES,
    setPalette: () => {},
    setWallpaper: () => {},
    setAnimations: () => {},
    reset: () => {},
  };
}
