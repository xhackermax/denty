"use client";

import { Alert } from "@mantine/core";
import { useCallback, useState } from "react";

const FALLBACK_MESSAGE = "No se pudo imprimir el documento.";

/** Runs print jobs and keeps the last failure so the UI can show it. */
export function usePrintNotice() {
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (job: () => Promise<void> | void) => {
    setError(null);
    try {
      await job();
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : FALLBACK_MESSAGE);
    }
  }, []);
  const fail = useCallback((message: string) => setError(message), []);
  const clear = useCallback(() => setError(null), []);

  return { error, run, fail, clear };
}

export function PrintNotice({ error, onClose }: { error: string | null; onClose: () => void }) {
  if (!error) return null;
  return (
    <Alert
      color="red"
      role="alert"
      withCloseButton
      closeButtonLabel="Cerrar aviso"
      onClose={onClose}
    >
      {error}
    </Alert>
  );
}
