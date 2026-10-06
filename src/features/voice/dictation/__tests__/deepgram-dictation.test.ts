import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DictationError,
  startDeepgramDictation,
  type DeepgramDictationDeps,
  type DictationEvents,
} from "../deepgram-dictation";

class FakeSocket {
  static OPEN = 1;
  readyState = 0;
  sent: (string | ArrayBuffer)[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  binaryType = "blob";
  constructor(
    readonly url: string,
    readonly protocols: string[],
  ) {}
  send(data: string | ArrayBuffer) {
    this.sent.push(data);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.readyState = 3;
    this.onclose?.({ code: 1000 });
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  result(transcript: string, isFinal: boolean, speechFinal = false) {
    this.onmessage?.({
      data: JSON.stringify({
        type: "Results",
        is_final: isFinal,
        speech_final: speechFinal,
        channel: { alternatives: [{ transcript }] },
      }),
    });
  }
  drop(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

function setup(overrides: Partial<DeepgramDictationDeps> = {}) {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const port: { onmessage: ((event: { data: Float32Array }) => void) | null } = {
    onmessage: null,
  };
  const context = {
    sampleRate: 16_000,
    audioWorklet: { addModule: vi.fn(async () => undefined) },
    createMediaStreamSource: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() })),
    createGain: vi.fn(() => ({ gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() })),
    destination: {},
    close: vi.fn(async () => undefined),
  };
  const sockets: FakeSocket[] = [];
  const deps: DeepgramDictationDeps = {
    requestCredential: vi.fn(async () => ({
      accessToken: "jwt-temporal",
      listenUrl: "wss://api.deepgram.com/v1/listen?model=nova-3",
    })),
    getUserMedia: vi.fn(async () => stream),
    createAudioContext: () => context as never,
    createWorkletNode: () => ({ port, connect: vi.fn(), disconnect: vi.fn() }) as never,
    createWebSocket: (url, protocols) => {
      const socket = new FakeSocket(url, protocols);
      sockets.push(socket);
      return socket as never;
    },
    workletUrl: "/voice/pcm-capture-worklet.js",
    ...overrides,
  };
  const events = {
    onStatus: vi.fn(),
    onInterim: vi.fn(),
    onFinal: vi.fn(),
    onSpeechFinal: vi.fn(),
    onError: vi.fn(),
    onEnd: vi.fn(),
  } satisfies DictationEvents;
  const audio = (samples: number[]) => port.onmessage?.({ data: Float32Array.from(samples) });
  return { deps, events, sockets, track, context, audio };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("startDeepgramDictation", () => {
  it("authenticates the socket with the temporary token, not the URL", async () => {
    const { deps, events, sockets } = setup();
    await startDeepgramDictation(deps, events);
    expect(sockets[0]?.url).toBe("wss://api.deepgram.com/v1/listen?model=nova-3");
    expect(sockets[0]?.protocols).toEqual(["bearer", "jwt-temporal"]);
    expect(events.onStatus).toHaveBeenLastCalledWith("connecting");
    sockets[0]?.open();
    expect(events.onStatus).toHaveBeenLastCalledWith("listening");
  });

  it("buffers audio until the socket opens and then streams 16-bit PCM", async () => {
    const { deps, events, sockets, audio } = setup();
    await startDeepgramDictation(deps, events);
    audio([0.5, -0.5]);
    expect(sockets[0]?.sent).toEqual([]);
    sockets[0]?.open();
    audio([1]);
    const binary = sockets[0]?.sent.filter((frame) => frame instanceof ArrayBuffer) ?? [];
    expect(binary.flatMap((frame) => Array.from(new Int16Array(frame as ArrayBuffer)))).toEqual([
      16384, -16384, 32767,
    ]);
  });

  it("separates partial and final results and ignores empty ones", async () => {
    const { deps, events, sockets } = setup();
    await startDeepgramDictation(deps, events);
    sockets[0]?.open();
    sockets[0]?.result("marca", false);
    sockets[0]?.result("", false);
    sockets[0]?.result("marca caries en el 16", true, true);
    sockets[0]?.result("", true);
    expect(events.onInterim).toHaveBeenCalledTimes(1);
    expect(events.onInterim).toHaveBeenCalledWith("marca");
    expect(events.onFinal).toHaveBeenCalledTimes(1);
    expect(events.onFinal).toHaveBeenCalledWith("marca caries en el 16");
    expect(events.onSpeechFinal).toHaveBeenCalledTimes(1);
  });

  it("finishes the stream, keeps late final results and releases the microphone on stop", async () => {
    const { deps, events, sockets, track, context } = setup();
    const session = await startDeepgramDictation(deps, events);
    const socket = sockets[0];
    socket?.open();
    session.stop();
    expect(events.onStatus).toHaveBeenLastCalledWith("finalizing");
    expect(socket?.sent).toContain(JSON.stringify({ type: "CloseStream" }));
    expect(track.stop).toHaveBeenCalled();
    expect(context.close).toHaveBeenCalled();
    socket?.result("en el 16", true);
    expect(events.onFinal).toHaveBeenCalledWith("en el 16");
    socket?.close();
    expect(events.onEnd).toHaveBeenCalledWith({ graceful: true, heardSpeech: true });
    expect(events.onError).not.toHaveBeenCalled();
  });

  it("stops waiting for the final result after a timeout", async () => {
    const { deps, events, sockets } = setup({ finalizeTimeoutMs: 2_000 });
    const session = await startDeepgramDictation(deps, events);
    sockets[0]?.open();
    session.stop();
    vi.advanceTimersByTime(2_000);
    expect(sockets[0]?.closed).toBe(true);
    expect(events.onEnd).toHaveBeenCalledWith({ graceful: false, heardSpeech: false });
  });

  it("reports a dropped connection and releases the microphone", async () => {
    const { deps, events, sockets, track } = setup();
    await startDeepgramDictation(deps, events);
    sockets[0]?.open();
    sockets[0]?.drop();
    expect(events.onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "CONNECTION_LOST" }),
    );
    expect(track.stop).toHaveBeenCalled();
    expect(events.onEnd).toHaveBeenCalledTimes(1);
  });

  it("times out when the socket never opens", async () => {
    const { deps, events, sockets } = setup({ connectTimeoutMs: 5_000 });
    await startDeepgramDictation(deps, events);
    vi.advanceTimersByTime(5_000);
    expect(events.onError).toHaveBeenCalledWith(expect.objectContaining({ code: "TIMEOUT" }));
    expect(sockets[0]?.closed).toBe(true);
  });

  it("stops by itself after the maximum duration", async () => {
    const { deps, events, sockets } = setup({ maxDurationMs: 60_000 });
    await startDeepgramDictation(deps, events);
    sockets[0]?.open();
    vi.advanceTimersByTime(60_000);
    expect(sockets[0]?.sent).toContain(JSON.stringify({ type: "CloseStream" }));
  });

  it("maps a denied microphone and releases nothing it did not open", async () => {
    const { deps, events, sockets } = setup({
      getUserMedia: vi.fn(async () => {
        throw new DOMException("denied", "NotAllowedError");
      }),
    });
    await expect(startDeepgramDictation(deps, events)).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });
    expect(sockets).toHaveLength(0);
  });

  it("maps a missing microphone", async () => {
    const { deps, events } = setup({
      getUserMedia: vi.fn(async () => {
        throw new DOMException("none", "NotFoundError");
      }),
    });
    await expect(startDeepgramDictation(deps, events)).rejects.toMatchObject({
      code: "NO_MICROPHONE",
    });
  });

  it("releases the microphone when the credential cannot be issued", async () => {
    const { deps, events, track } = setup({
      requestCredential: vi.fn(async () => {
        throw new DictationError("NOT_CONFIGURED");
      }),
    });
    await expect(startDeepgramDictation(deps, events)).rejects.toMatchObject({
      code: "NOT_CONFIGURED",
    });
    expect(track.stop).toHaveBeenCalled();
  });

  it("reports browsers without AudioWorklet as unsupported", async () => {
    const { deps, events, track } = setup({
      createAudioContext: () => ({ sampleRate: 48_000, close: vi.fn() }) as never,
    });
    await expect(startDeepgramDictation(deps, events)).rejects.toMatchObject({
      code: "UNSUPPORTED",
    });
    expect(track.stop).toHaveBeenCalled();
  });

  it("cancel releases everything silently", async () => {
    const { deps, events, sockets, track } = setup();
    const session = await startDeepgramDictation(deps, events);
    sockets[0]?.open();
    session.cancel();
    expect(track.stop).toHaveBeenCalled();
    expect(sockets[0]?.closed).toBe(true);
    expect(events.onError).not.toHaveBeenCalled();
    expect(events.onEnd).not.toHaveBeenCalled();
  });
});
