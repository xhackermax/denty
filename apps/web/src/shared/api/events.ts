import { eventEnvelopeSchema, type DentyEvent } from "./contracts";

export const DENTY_EVENTS_PATH = "/api/events";

export interface DentyEventStreamOptions {
  url: string;
  onEvent: (event: DentyEvent) => void;
  onError?: (error: Error) => void;
}

export interface DentyEventStream {
  close(): void;
}

export function openDentyEventStream(options: DentyEventStreamOptions): DentyEventStream {
  const source = new EventSource(options.url, { withCredentials: true });

  source.onmessage = (message) => {
    try {
      const parsed = eventEnvelopeSchema.parse(JSON.parse(message.data) as unknown);
      options.onEvent(parsed);
    } catch (cause) {
      options.onError?.(cause instanceof Error ? cause : new Error("Evento SSE inválido"));
    }
  };

  source.onerror = () => {
    options.onError?.(new Error("La conexión en tiempo real se ha interrumpido."));
  };

  return {
    close: () => source.close(),
  };
}
