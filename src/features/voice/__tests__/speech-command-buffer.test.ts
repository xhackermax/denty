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
