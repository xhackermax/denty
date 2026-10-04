"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export interface UseAutosaveOptions<T> {
  /** Current value; a new reference means it changed (immutable editor state). */
  value: T;
  enabled: boolean;
  delayMs?: number;
  save: (value: T) => Promise<void>;
}

/**
 * Saves the value a moment after edits pause. Edits made during a save are saved right after
 * it; a failed value is not retried on its own (no request loop when offline or in conflict).
 */
export function useAutosave<T>({ value, enabled, delayMs = 1200, save }: UseAutosaveOptions<T>) {
  const [baseline, setBaseline] = useState(value);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<unknown>(null);
  // Bumped when a save settles so a value edited meanwhile gets its own timer.
  const [settled, setSettled] = useState(0);
  const baselineRef = useRef(value);
  const latestRef = useRef(value);
  const saveRef = useRef(save);
  const savingRef = useRef(false);
  const inflightRef = useRef<Promise<void> | null>(null);
  const failedRef = useRef<T | null>(null);

  useEffect(() => {
    latestRef.current = value;
    saveRef.current = save;
  });

  const dirty = value !== baseline;

  const saveOnce = useCallback(async () => {
    const snapshot = latestRef.current;
    if (snapshot === baselineRef.current) return;
    savingRef.current = true;
    setStatus("saving");
    try {
      await saveRef.current(snapshot);
      baselineRef.current = snapshot;
      failedRef.current = null;
      setBaseline(snapshot);
      setError(null);
      setStatus(latestRef.current === snapshot ? "saved" : "pending");
    } catch (caught) {
      failedRef.current = snapshot;
      setError(caught);
      setStatus("error");
      throw caught;
    } finally {
      savingRef.current = false;
      setSettled((count) => count + 1);
    }
  }, []);

  /** Saves now; if a save is running, waits for it and then saves whatever is newer. */
  const flush = useCallback(async () => {
    while (inflightRef.current) await inflightRef.current.catch(() => undefined);
    const run = saveOnce();
    inflightRef.current = run;
    try {
      await run;
    } finally {
      if (inflightRef.current === run) inflightRef.current = null;
    }
  }, [saveOnce]);

  useEffect(() => {
    if (!enabled || value === baselineRef.current || value === failedRef.current) return;
    if (!savingRef.current) setStatus("pending");
    const timer = setTimeout(() => {
      if (!savingRef.current) flush().catch(() => undefined);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [value, enabled, delayMs, flush, settled]);

  const reset = useCallback((next: T) => {
    baselineRef.current = next;
    latestRef.current = next;
    failedRef.current = null;
    setBaseline(next);
    setError(null);
    setStatus("idle");
  }, []);

  return { dirty, status, error, flush, reset };
}
