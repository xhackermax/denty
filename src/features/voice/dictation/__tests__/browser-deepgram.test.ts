import { afterEach, describe, expect, it, vi } from "vitest";

import { DentyApiError } from "@/shared/api/errors";

import { dictationErrorFromApi, isDeepgramCaptureSupported } from "../browser-deepgram";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dictationErrorFromApi", () => {
  it("treats a missing or invalid server key as not configured", () => {
    for (const code of ["VOICE_TRANSCRIPTION_NOT_CONFIGURED", "VOICE_TRANSCRIPTION_KEY_INVALID"]) {
      expect(dictationErrorFromApi(new DentyApiError("unavailable", "x", { code })).code).toBe(
        "NOT_CONFIGURED",
      );
    }
  });

  it("maps rate limits and expired sessions", () => {
    expect(
      dictationErrorFromApi(
        new DentyApiError("rate_limited", "x", { code: "VOICE_TRANSCRIPTION_RATE_LIMITED" }),
      ).code,
    ).toBe("RATE_LIMITED");
    expect(
      dictationErrorFromApi(new DentyApiError("unauthorized", "x", { status: 401 })).code,
    ).toBe("SESSION_EXPIRED");
  });

  it("falls back to unavailable for anything else", () => {
    expect(dictationErrorFromApi(new Error("boom")).code).toBe("UNAVAILABLE");
  });
});

describe("isDeepgramCaptureSupported", () => {
  it("requires audio worklets, WebSocket and microphone capture", () => {
    vi.stubGlobal("AudioContext", class {});
    vi.stubGlobal("AudioWorkletNode", class {});
    vi.stubGlobal("WebSocket", class {});
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => undefined } });
    expect(isDeepgramCaptureSupported()).toBe(true);
    vi.stubGlobal("AudioWorkletNode", undefined);
    expect(isDeepgramCaptureSupported()).toBe(false);
  });
});
