const DEEPGRAM_API = "https://api.deepgram.com";
const DEEPGRAM_STREAM = "wss://api.deepgram.com";
const GRANT_TIMEOUT_MS = 5_000;

/** Audio the browser sends: the worklet resamples to this rate as signed 16-bit mono PCM. */
export const DEEPGRAM_STREAM_SAMPLE_RATE = 16_000;

export class DeepgramCredentialError extends Error {
  constructor() {
    super("La clave de Deepgram del servidor no es válida o no tiene permisos.");
    this.name = "DeepgramCredentialError";
  }
}

export class DeepgramUnavailableError extends Error {
  constructor() {
    super("Deepgram no ha emitido la credencial temporal.");
    this.name = "DeepgramUnavailableError";
  }
}

export interface DeepgramListenOptions {
  model: string;
  language: string;
  keyterms?: readonly string[];
}

export function buildDeepgramListenUrl(options: DeepgramListenOptions): string {
  const url = new URL("/v1/listen", DEEPGRAM_STREAM);
  url.searchParams.set("model", options.model);
  url.searchParams.set("language", options.language);
  url.searchParams.set("encoding", "linear16");
  url.searchParams.set("sample_rate", String(DEEPGRAM_STREAM_SAMPLE_RATE));
  url.searchParams.set("channels", "1");
  url.searchParams.set("interim_results", "true");
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("punctuate", "true");
  // Chairside dictation needs enough silence for natural pauses between tooth,
  // finding and surfaces, while still feeling immediate.
  url.searchParams.set("endpointing", "700");
  for (const term of options.keyterms ?? []) url.searchParams.append("keyterm", term);
  return url.toString();
}

export interface DeepgramAccessToken {
  accessToken: string;
  expiresIn: number;
}

export async function requestDeepgramAccessToken(options: {
  apiKey: string;
  ttlSeconds: number;
  fetchFn?: typeof fetch;
}): Promise<DeepgramAccessToken> {
  const fetchFn = options.fetchFn ?? fetch;
  let response: Response;
  try {
    response = await fetchFn(`${DEEPGRAM_API}/v1/auth/grant`, {
      method: "POST",
      headers: {
        authorization: `Token ${options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: options.ttlSeconds }),
      cache: "no-store",
      signal: AbortSignal.timeout(GRANT_TIMEOUT_MS),
    });
  } catch {
    throw new DeepgramUnavailableError();
  }
  if (response.status === 401 || response.status === 403) throw new DeepgramCredentialError();
  if (!response.ok) throw new DeepgramUnavailableError();
  const body = (await response.json().catch(() => null)) as {
    access_token?: unknown;
    expires_in?: unknown;
  } | null;
  if (typeof body?.access_token !== "string" || !body.access_token) {
    throw new DeepgramUnavailableError();
  }
  return {
    accessToken: body.access_token,
    expiresIn: typeof body.expires_in === "number" ? body.expires_in : options.ttlSeconds,
  };
}
