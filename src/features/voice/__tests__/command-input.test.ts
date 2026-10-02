import { describe, expect, it } from "vitest";

import {
  appendDictation,
  describeSurfaces,
  isAndroidUserAgent,
  shouldSubmitOnKey,
  stripWakePhrase,
  voiceStatusLabel,
  deriveVoiceStatus,
} from "../command-input";

describe("shouldSubmitOnKey", () => {
  it("submits on a plain Enter", () => {
    expect(shouldSubmitOnKey({ key: "Enter", shiftKey: false, isComposing: false })).toBe(true);
  });

  it("keeps Shift+Enter as a line break", () => {
    expect(shouldSubmitOnKey({ key: "Enter", shiftKey: true, isComposing: false })).toBe(false);
  });

  it("never submits while the keyboard is still composing a word", () => {
    expect(shouldSubmitOnKey({ key: "Enter", shiftKey: false, isComposing: true })).toBe(false);
  });

  it("treats the Android IME placeholder key code as composition", () => {
    expect(
      shouldSubmitOnKey({ key: "Enter", shiftKey: false, isComposing: false, keyCode: 229 }),
    ).toBe(false);
  });

  it("ignores other keys", () => {
    expect(shouldSubmitOnKey({ key: "a", shiftKey: false, isComposing: false })).toBe(false);
  });
});

describe("stripWakePhrase", () => {
  it("removes a leading wake phrase", () => {
    expect(stripWakePhrase("Oye Denty, marca caries en el 16")).toBe("marca caries en el 16");
  });

  it("removes common recognitions of the name", () => {
    expect(stripWakePhrase("hey denti abre la agenda")).toBe("abre la agenda");
  });

  it("keeps text without a wake phrase untouched", () => {
    expect(stripWakePhrase("Marca caries en el dieciséis")).toBe("Marca caries en el dieciséis");
  });

  it("returns an empty string when only the wake phrase was heard", () => {
    expect(stripWakePhrase("Oye Denty.")).toBe("");
  });
});

describe("appendDictation", () => {
  it("adds dictated text after what was already typed", () => {
    expect(appendDictation("Marca caries", "en el 16")).toBe("Marca caries en el 16");
  });

  it("does not add spaces when the field was empty", () => {
    expect(appendDictation("", "  abre la agenda ")).toBe("abre la agenda");
  });

  it("keeps the typed text when nothing was dictated", () => {
    expect(appendDictation("Marca caries ", "  ")).toBe("Marca caries ");
  });
});

describe("isAndroidUserAgent", () => {
  it("detects Chrome and Opera on Android", () => {
    expect(
      isAndroidUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/129 Mobile Safari/537.36",
      ),
    ).toBe(true);
    expect(
      isAndroidUserAgent(
        "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36 OPR/84",
      ),
    ).toBe(true);
  });

  it("does not flag desktop browsers", () => {
    expect(
      isAndroidUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129"),
    ).toBe(false);
  });
});

describe("describeSurfaces", () => {
  it("names each tooth surface in Spanish", () => {
    expect(describeSurfaces(["O", "M"])).toBe("oclusal, mesial");
  });

  it("keeps unknown codes visible instead of dropping them", () => {
    expect(describeSurfaces(["X"])).toBe("X");
  });
});

describe("deriveVoiceStatus", () => {
  const idle = {
    capture: "idle",
    interpreting: false,
    executing: false,
    awaitingConfirmation: false,
    done: false,
    error: false,
  } as const;

  it("is available when nothing is happening", () => {
    expect(deriveVoiceStatus(idle)).toBe("available");
  });

  it("reports capture states before anything else", () => {
    expect(deriveVoiceStatus({ ...idle, capture: "requesting_permission" })).toBe(
      "requesting_permission",
    );
    expect(deriveVoiceStatus({ ...idle, capture: "connecting" })).toBe("connecting");
    expect(deriveVoiceStatus({ ...idle, capture: "listening" })).toBe("listening");
    expect(deriveVoiceStatus({ ...idle, capture: "finalizing" })).toBe("finalizing");
  });

  it("orders the command lifecycle", () => {
    expect(deriveVoiceStatus({ ...idle, interpreting: true })).toBe("interpreting");
    expect(deriveVoiceStatus({ ...idle, executing: true, awaitingConfirmation: true })).toBe(
      "executing",
    );
    expect(deriveVoiceStatus({ ...idle, awaitingConfirmation: true })).toBe(
      "awaiting_confirmation",
    );
    expect(deriveVoiceStatus({ ...idle, done: true })).toBe("done");
  });

  it("shows errors when idle", () => {
    expect(deriveVoiceStatus({ ...idle, error: true })).toBe("error");
  });
});

describe("voiceStatusLabel", () => {
  it("labels every status in Spanish", () => {
    expect(voiceStatusLabel("available")).toBe("Disponible");
    expect(voiceStatusLabel("requesting_permission")).toBe("Solicitando permiso");
    expect(voiceStatusLabel("connecting")).toBe("Conectando");
    expect(voiceStatusLabel("listening")).toBe("Escuchando");
    expect(voiceStatusLabel("finalizing")).toBe("Finalizando transcripción");
    expect(voiceStatusLabel("interpreting")).toBe("Interpretando");
    expect(voiceStatusLabel("awaiting_confirmation")).toBe("Pendiente de confirmación");
    expect(voiceStatusLabel("executing")).toBe("Ejecutando");
    expect(voiceStatusLabel("done")).toBe("Completado");
    expect(voiceStatusLabel("error")).toBe("Error");
  });
});
