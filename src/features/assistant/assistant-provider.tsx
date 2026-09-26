"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";

import { initialAssistantState, reduceAssistantState } from "./assistant-state-machine";
import type { AssistantState } from "./assistant-types";
import { AssistantContextProvider } from "./assistant-context";
import { NullWakeWordEngine, type WakeWordEngine } from "./wake-word/wake-word-engine";

interface AssistantController {
  state: AssistantState;
  enable(): void;
  disable(): void;
}

const AssistantControllerContext = createContext<AssistantController | null>(null);

export function AssistantProvider({
  children,
  wakeWordEngine,
}: {
  children: ReactNode;
  wakeWordEngine?: WakeWordEngine;
}) {
  const [state, dispatch] = useReducer(reduceAssistantState, initialAssistantState);
  const engineRef = useRef<WakeWordEngine>(wakeWordEngine ?? new NullWakeWordEngine());

  useEffect(() => {
    const onVisibility = () => dispatch({ type: "VISIBILITY", visible: document.visibilityState === "visible" });
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!state.enabled || !state.visible) {
      void engine.stop();
      return;
    }
    void engine.start().catch((error: unknown) => {
      dispatch({ type: "FAIL", message: error instanceof Error ? error.message : "No se pudo activar el micrófono." });
    });
    return () => void engine.stop();
  }, [state.enabled, state.visible]);

  useEffect(() => engineRef.current.onWake(() => dispatch({ type: "WAKE" })), []);

  const enable = useCallback(() => dispatch({ type: "ENABLE" }), []);
  const disable = useCallback(() => dispatch({ type: "DISABLE" }), []);
  const controller = useMemo(() => ({ state, enable, disable }), [state, enable, disable]);

  return (
    <AssistantControllerContext.Provider value={controller}>
      <AssistantContextProvider>{children}</AssistantContextProvider>
    </AssistantControllerContext.Provider>
  );
}

export function useAssistant(): AssistantController {
  const value = useContext(AssistantControllerContext);
  if (!value) throw new Error("useAssistant debe usarse dentro de AssistantProvider.");
  return value;
}
