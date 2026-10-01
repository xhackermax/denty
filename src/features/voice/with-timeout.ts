export class VoiceTimeoutError extends Error {
  constructor(message = "La operación de voz tardó demasiado.") {
    super(message);
    this.name = "VoiceTimeoutError";
  }
}

/** Bounds a slow call so a hung request can't leave the voice flow stuck. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new VoiceTimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
