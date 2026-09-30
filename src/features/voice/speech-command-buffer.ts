const WAKE_ONLY_PATTERN = /^\s*(?:oye\s+)?denty[\s.,;:!?-]*$/i;
const WAKE_WINDOW_MS = 6_000;

export interface SpeechCommandBuffer {
  push(transcript: string, now?: number): string | undefined;
  clear(): void;
}

export function createSpeechCommandBuffer(): SpeechCommandBuffer {
  let pendingWake: { text: string; at: number } | undefined;

  return {
    push(transcript: string, now = Date.now()) {
      const clean = transcript.trim();
      if (!clean) return undefined;

      if (WAKE_ONLY_PATTERN.test(clean)) {
        pendingWake = { text: clean.replace(/[.,;:!?-]+$/g, "").trim(), at: now };
        return undefined;
      }

      if (pendingWake && now - pendingWake.at <= WAKE_WINDOW_MS) {
        const joined = `${pendingWake.text} ${clean}`.trim();
        pendingWake = undefined;
        return joined;
      }

      pendingWake = undefined;
      return clean;
    },
    clear() {
      pendingWake = undefined;
    },
  };
}
