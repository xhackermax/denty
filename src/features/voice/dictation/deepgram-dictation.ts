import { createLinear16Encoder } from "./pcm";

export type DictationErrorCode =
  | "PERMISSION_DENIED"
  | "NO_MICROPHONE"
  | "UNSUPPORTED"
  | "NOT_CONFIGURED"
  | "RATE_LIMITED"
  | "SESSION_EXPIRED"
  | "CONNECTION_LOST"
  | "TIMEOUT"
  | "UNAVAILABLE";

const MESSAGES: Readonly<Record<DictationErrorCode, string>> = {
  PERMISSION_DENIED: "Micrófono bloqueado. Permítelo desde el candado del navegador.",
  NO_MICROPHONE: "No hay ningún micrófono disponible.",
  UNSUPPORTED: "Este navegador no puede enviar audio a Deepgram.",
  NOT_CONFIGURED: "El dictado con Deepgram no está configurado en el servidor.",
  RATE_LIMITED: "Has abierto demasiadas sesiones de voz seguidas. Espera un momento.",
  SESSION_EXPIRED: "Tu sesión de Denty ha caducado. Vuelve a iniciar sesión.",
  CONNECTION_LOST: "Se ha cortado la conexión con Deepgram. El texto dictado se conserva.",
  TIMEOUT: "Deepgram no ha respondido a tiempo. Inténtalo de nuevo o escribe la orden.",
  UNAVAILABLE: "Deepgram no está disponible ahora mismo. Puedes escribir la orden.",
};

export class DictationError extends Error {
  constructor(
    readonly code: DictationErrorCode,
    message: string = MESSAGES[code],
  ) {
    super(message);
    this.name = "DictationError";
  }
}

export interface DeepgramCredential {
  accessToken: string;
  listenUrl: string;
}

interface AudioNodeLike {
  connect(target: unknown): unknown;
  disconnect(): void;
}

interface AudioContextLike {
  sampleRate: number;
  audioWorklet?: { addModule(url: string): Promise<void> };
  createMediaStreamSource?(stream: MediaStream): AudioNodeLike;
  createGain?(): AudioNodeLike & { gain: { value: number } };
  destination?: unknown;
  close(): Promise<void> | void;
}

export interface WorkletNodeLike extends AudioNodeLike {
  port: { onmessage: ((event: { data: Float32Array }) => void) | null };
}

export interface WebSocketLike {
  readyState: number;
  binaryType: string;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number }) => void) | null;
  onerror: (() => void) | null;
  send(data: string | ArrayBuffer): void;
  close(): void;
}

export interface DeepgramDictationDeps {
  requestCredential(): Promise<DeepgramCredential>;
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  createAudioContext(): AudioContextLike;
  createWorkletNode(context: AudioContextLike, name: string): WorkletNodeLike;
  createWebSocket(url: string, protocols: string[]): WebSocketLike;
  workletUrl: string;
  maxDurationMs?: number;
  connectTimeoutMs?: number;
  finalizeTimeoutMs?: number;
}

export interface DictationEvents {
  onStatus(status: "connecting" | "listening" | "finalizing"): void;
  onInterim(text: string): void;
  onFinal(text: string): void;
  /** Fired after Deepgram detects an actual pause that closes the spoken utterance. */
  onSpeechFinal?(): void;
  onError(error: DictationError): void;
  onEnd(result: { graceful: boolean; heardSpeech: boolean }): void;
}

export interface DictationSession {
  /** Sends the remaining audio for a final result; onEnd reports when it finishes. */
  stop(): void;
  /** Releases everything at once without further events. */
  cancel(): void;
}

const OPEN = 1;
const TARGET_SAMPLE_RATE = 16_000;
const WORKLET_NAME = "denty-pcm-capture";
// About five seconds of 16 kHz audio while the socket opens.
const MAX_PENDING_SAMPLES = TARGET_SAMPLE_RATE * 5;

function microphoneError(cause: unknown): DictationError {
  const name = cause instanceof DOMException ? cause.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return new DictationError("PERMISSION_DENIED");
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return new DictationError("NO_MICROPHONE");
  }
  if (name === "NotReadableError") {
    return new DictationError("NO_MICROPHONE", "Otra aplicación está usando el micrófono.");
  }
  return new DictationError("UNSUPPORTED");
}

function transcriptOf(
  data: unknown,
): { text: string; isFinal: boolean; speechFinal: boolean } | null {
  if (typeof data !== "string") return null;
  let message: unknown;
  try {
    message = JSON.parse(data);
  } catch {
    return null;
  }
  const result = message as {
    type?: unknown;
    is_final?: unknown;
    speech_final?: unknown;
    channel?: { alternatives?: { transcript?: unknown }[] };
  };
  if (result.type !== "Results") return null;
  const transcript = result.channel?.alternatives?.[0]?.transcript;
  return {
    text: typeof transcript === "string" ? transcript.trim() : "",
    isFinal: result.is_final === true,
    speechFinal: result.speech_final === true,
  };
}

export async function startDeepgramDictation(
  deps: DeepgramDictationDeps,
  events: DictationEvents,
): Promise<DictationSession> {
  const maxDurationMs = deps.maxDurationMs ?? 5 * 60_000;
  const connectTimeoutMs = deps.connectTimeoutMs ?? 8_000;
  const finalizeTimeoutMs = deps.finalizeTimeoutMs ?? 3_000;

  // Asking for the credential and the microphone together saves a round trip.
  const [credentialResult, streamResult] = await Promise.allSettled([
    deps.requestCredential(),
    deps.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    }),
  ]);
  const stream = streamResult.status === "fulfilled" ? streamResult.value : null;
  const releaseStream = () => stream?.getTracks().forEach((track) => track.stop());
  if (streamResult.status === "rejected") throw microphoneError(streamResult.reason);
  if (credentialResult.status === "rejected") {
    releaseStream();
    const reason = credentialResult.reason;
    throw reason instanceof DictationError ? reason : new DictationError("UNAVAILABLE");
  }
  const credential = credentialResult.value;

  let context: AudioContextLike | null = null;
  let source: AudioNodeLike | null = null;
  let worklet: WorkletNodeLike | null = null;
  let mute: AudioNodeLike | null = null;
  const releaseAudio = () => {
    for (const node of [source, worklet, mute]) {
      try {
        node?.disconnect();
      } catch {
        // Nodes may already be disconnected.
      }
    }
    if (worklet) worklet.port.onmessage = null;
    releaseStream();
    void Promise.resolve(context?.close()).catch(() => undefined);
    context = null;
  };

  try {
    context = deps.createAudioContext();
    if (!context.audioWorklet || !context.createMediaStreamSource || !context.createGain) {
      throw new DictationError("UNSUPPORTED");
    }
    await context.audioWorklet.addModule(deps.workletUrl);
    source = context.createMediaStreamSource(stream as MediaStream);
    worklet = deps.createWorkletNode(context, WORKLET_NAME);
    // Some engines only run a worklet that is connected to the output; the gain keeps it silent.
    const gain = context.createGain();
    gain.gain.value = 0;
    mute = gain;
    source.connect(worklet);
    worklet.connect(gain);
    gain.connect(context.destination);
  } catch (cause) {
    releaseAudio();
    throw cause instanceof DictationError ? cause : new DictationError("UNSUPPORTED");
  }

  const encode = createLinear16Encoder(context.sampleRate, TARGET_SAMPLE_RATE);
  const socket = deps.createWebSocket(credential.listenUrl, ["bearer", credential.accessToken]);
  socket.binaryType = "arraybuffer";
  let pending: Int16Array[] = [];
  let pendingSamples = 0;
  let phase: "connecting" | "listening" | "finalizing" | "ended" = "connecting";
  let heardSpeech = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const after = (ms: number, callback: () => void) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, ms);
    timers.add(timer);
  };

  const end = (graceful: boolean, error?: DictationError) => {
    if (phase === "ended") return;
    phase = "ended";
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    releaseAudio();
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    try {
      socket.close();
    } catch {
      // Already closed.
    }
    if (error) events.onError(error);
    events.onEnd({ graceful, heardSpeech });
  };

  const send = (samples: Int16Array) => {
    if (!samples.length) return;
    if (socket.readyState === OPEN) {
      // A copy owns exactly these bytes, whatever buffer the samples were cut from.
      socket.send(samples.slice().buffer as ArrayBuffer);
      return;
    }
    pending.push(samples);
    pendingSamples += samples.length;
    while (pendingSamples > MAX_PENDING_SAMPLES && pending.length) {
      pendingSamples -= pending.shift()?.length ?? 0;
    }
  };

  worklet.port.onmessage = (event) => {
    if (phase === "connecting" || phase === "listening") send(encode(event.data));
  };

  const stop = () => {
    if (phase === "ended" || phase === "finalizing") return;
    const wasOpen = socket.readyState === OPEN;
    phase = "finalizing";
    events.onStatus("finalizing");
    releaseAudio();
    if (!wasOpen) {
      end(false);
      return;
    }
    socket.send(JSON.stringify({ type: "CloseStream" }));
    after(finalizeTimeoutMs, () => end(false));
  };

  socket.onopen = () => {
    if (phase !== "connecting") return;
    phase = "listening";
    for (const chunk of pending) send(chunk);
    pending = [];
    pendingSamples = 0;
    events.onStatus("listening");
    after(maxDurationMs, stop);
  };
  socket.onmessage = (event) => {
    const result = transcriptOf(event.data);
    if (!result?.text) return;
    heardSpeech = true;
    if (result.isFinal) events.onFinal(result.text);
    else events.onInterim(result.text);
    if (result.speechFinal) events.onSpeechFinal?.();
  };
  socket.onerror = () => {
    // The close event that follows carries the outcome.
  };
  socket.onclose = () => {
    if (phase === "finalizing") end(true);
    else end(false, new DictationError(phase === "connecting" ? "UNAVAILABLE" : "CONNECTION_LOST"));
  };

  events.onStatus("connecting");
  after(connectTimeoutMs, () => {
    if (phase === "connecting") end(false, new DictationError("TIMEOUT"));
  });

  return {
    stop,
    cancel() {
      if (phase === "ended") return;
      phase = "ended";
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      releaseAudio();
      socket.onclose = null;
      try {
        socket.close();
      } catch {
        // Already closed.
      }
    },
  };
}
