/**
 * On-device Whisper used only when cloud transcription is unavailable, so
 * dictation keeps working and clinical audio never has to leave the device.
 * The model is downloaded lazily and cached by the browser on first use.
 */

const MODEL_ID = "onnx-community/whisper-base";
const TARGET_SAMPLE_RATE = 16_000;

type Transcriber = (
  audio: Float32Array,
  options: Record<string, unknown>,
) => Promise<{ text?: string } | Array<{ text?: string }>>;

export interface LocalWhisperDeps {
  loadTranscriber: () => Promise<Transcriber>;
  decode: (blob: Blob) => Promise<Float32Array>;
}

let transcriberPromise: Promise<Transcriber> | null = null;

async function loadTranscriber(): Promise<Transcriber> {
  const { pipeline } = await import("@huggingface/transformers");
  const device = typeof navigator !== "undefined" && "gpu" in navigator ? "webgpu" : "wasm";
  const instance = await pipeline("automatic-speech-recognition", MODEL_ID, {
    device,
    dtype: device === "webgpu" ? "fp32" : "q8",
  });
  return instance as unknown as Transcriber;
}

export function isLocalWhisperSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    typeof AudioContext !== "undefined" &&
    typeof OfflineAudioContext !== "undefined"
  );
}

/** Whisper expects mono 16 kHz float samples. */
export async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const length = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
    const offline = new OfflineAudioContext(1, length, TARGET_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    return (await offline.startRendering()).getChannelData(0);
  } finally {
    void context.close();
  }
}

export function extractWhisperText(output: { text?: string } | Array<{ text?: string }>): string {
  const parts = Array.isArray(output) ? output : [output];
  return parts
    .map((part) => part.text?.trim() ?? "")
    .filter(Boolean)
    .join(" ")
    .trim();
}

export async function transcribeLocally(
  blob: Blob,
  deps: LocalWhisperDeps = {
    loadTranscriber: () => (transcriberPromise ??= loadTranscriber()),
    decode: decodeToMono16k,
  },
): Promise<string> {
  let transcriber: Transcriber;
  try {
    transcriber = await deps.loadTranscriber();
  } catch (cause) {
    transcriberPromise = null;
    throw cause;
  }
  const audio = await deps.decode(blob);
  const output = await transcriber(audio, {
    language: "spanish",
    task: "transcribe",
    chunk_length_s: 30,
  });
  return extractWhisperText(output);
}
