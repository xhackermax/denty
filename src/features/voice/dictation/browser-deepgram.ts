import { getBrowserApi } from "@/shared/api/browser";
import { DentyApiError } from "@/shared/api/errors";

import {
  DictationError,
  type DeepgramCredential,
  type DeepgramDictationDeps,
  type WebSocketLike,
  type WorkletNodeLike,
} from "./deepgram-dictation";

const WORKLET_URL = "/voice/pcm-capture-worklet.js";

export function dictationErrorFromApi(error: unknown): DictationError {
  if (error instanceof DentyApiError) {
    if (
      error.code === "VOICE_TRANSCRIPTION_NOT_CONFIGURED" ||
      error.code === "VOICE_TRANSCRIPTION_KEY_INVALID"
    ) {
      return new DictationError("NOT_CONFIGURED");
    }
    if (error.code === "VOICE_TRANSCRIPTION_RATE_LIMITED" || error.status === 429) {
      return new DictationError("RATE_LIMITED");
    }
    if (error.status === 401) return new DictationError("SESSION_EXPIRED");
  }
  return new DictationError("UNAVAILABLE");
}

export function isDeepgramCaptureSupported(): boolean {
  return (
    typeof AudioContext !== "undefined" &&
    typeof AudioWorkletNode !== "undefined" &&
    typeof WebSocket !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

async function requestCredential(): Promise<DeepgramCredential> {
  try {
    const token = await getBrowserApi().voice.deepgramToken();
    return { accessToken: token.accessToken, listenUrl: token.listenUrl };
  } catch (error) {
    throw dictationErrorFromApi(error);
  }
}

export function createBrowserDeepgramDeps(): DeepgramDictationDeps {
  return {
    requestCredential,
    getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
    createAudioContext: () => new AudioContext(),
    createWorkletNode: (context, name) =>
      new AudioWorkletNode(context as AudioContext, name) as unknown as WorkletNodeLike,
    createWebSocket: (url, protocols) => new WebSocket(url, protocols) as unknown as WebSocketLike,
    workletUrl: WORKLET_URL,
  };
}
