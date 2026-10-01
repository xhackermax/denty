"use client";
import { createContext, useContext, type ReactNode } from "react";
import { deriveMouthState, type MouthState } from "@/domain/odontogram/mouth-state";
const MouthContext = createContext<MouthState | null>(null);
const defaultState = deriveMouthState([]);
export function MouthStateProvider({
  state,
  children,
}: {
  state: MouthState;
  children: ReactNode;
}) {
  return <MouthContext.Provider value={state}>{children}</MouthContext.Provider>;
}
export function useMouthState(): MouthState {
  return useContext(MouthContext) ?? defaultState;
}
