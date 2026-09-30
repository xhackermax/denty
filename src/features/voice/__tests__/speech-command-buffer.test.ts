import { describe, expect, it } from "vitest";

import { createSpeechCommandBuffer } from "../speech-command-buffer";

describe("speech command buffer", () => {
  it("waits after the wake word and joins the following clinical order", () => {
    const buffer = createSpeechCommandBuffer();

    expect(buffer.push("Oye Denty", 1_000)).toBeUndefined();
    expect(buffer.push("apunta una caries en distal del 23", 2_500)).toBe(
      "Oye Denty apunta una caries en distal del 23",
    );
  });

  it("does not hold normal commands without a wake-only fragment", () => {
    const buffer = createSpeechCommandBuffer();

    expect(buffer.push("apunta una caries en distal del 23", 1_000)).toBe(
      "apunta una caries en distal del 23",
    );
  });

  it("drops an old wake word instead of joining unrelated later speech", () => {
    const buffer = createSpeechCommandBuffer();

    expect(buffer.push("Oye Denty", 1_000)).toBeUndefined();
    expect(buffer.push("abre agenda", 9_000)).toBe("abre agenda");
  });
});

describe("speech command buffer: real recognizer output", () => {
  it.each([
    "oye dentí",
    "Oi denti",
    "hey denty",
    "ok denty",
    "Okay Denti.",
    "oye, denty!",
    "Denti",
  ])("treats %j as a wake-only fragment", (wake) => {
    const buffer = createSpeechCommandBuffer();
    expect(buffer.push(wake, 1_000)).toBeUndefined();
    expect(buffer.push("abre agenda", 2_000)).toMatch(/abre agenda$/);
  });

  it("joins a wake word split into 'oye' + 'denty'", () => {
    const buffer = createSpeechCommandBuffer();
    expect(buffer.push("oye", 1_000)).toBeUndefined();
    expect(buffer.push("denty", 1_800)).toBeUndefined();
    expect(buffer.push("abre agenda", 2_500)).toBe("Oye Denty abre agenda");
  });

  it("does not hold a lone 'oye' forever", () => {
    const buffer = createSpeechCommandBuffer();
    expect(buffer.push("oye", 1_000)).toBeUndefined();
    expect(buffer.push("abre agenda", 9_000)).toBe("abre agenda");
  });

  it("normalizes a misheard wake word inside a full sentence", () => {
    const buffer = createSpeechCommandBuffer();
    expect(buffer.push("hey denti abre agenda", 1_000)).toBe("Oye Denty abre agenda");
  });

  it("ignores an exact repeat of the same result from the engine", () => {
    const buffer = createSpeechCommandBuffer();
    expect(buffer.push("abre agenda", 1_000)).toBe("abre agenda");
    expect(buffer.push("abre agenda", 1_300)).toBeUndefined();
  });

  it("accepts the same phrase again after the dedupe window", () => {
    const buffer = createSpeechCommandBuffer();
    expect(buffer.push("abre agenda", 1_000)).toBe("abre agenda");
    expect(buffer.push("abre agenda", 5_000)).toBe("abre agenda");
  });

  it("keeps only the latest wake when it is repeated", () => {
    const buffer = createSpeechCommandBuffer();
    buffer.push("oye denty", 1_000);
    buffer.push("oye denty", 2_000);
    expect(buffer.push("abre agenda", 3_000)).toBe("Oye Denty abre agenda");
  });

  it("does not treat words that merely start like the wake word as wake", () => {
    const buffer = createSpeechCommandBuffer();
    expect(buffer.push("dentista García", 1_000)).toBe("dentista García");
  });
});
