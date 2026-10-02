import { describe, expect, it } from "vitest";

import { createLinear16Encoder } from "../pcm";

function tone(length: number, value: number) {
  return new Float32Array(length).fill(value);
}

describe("createLinear16Encoder", () => {
  it("downsamples 48 kHz to 16 kHz", () => {
    const encode = createLinear16Encoder(48_000, 16_000);
    expect(encode(tone(4_800, 0.5))).toHaveLength(1_600);
  });

  it("converts float samples to signed 16-bit and clips out-of-range values", () => {
    const encode = createLinear16Encoder(16_000, 16_000);
    expect(Array.from(encode(Float32Array.from([0, 1, -1, 2, -2, 0.5])))).toEqual([
      0, 32767, -32768, 32767, -32768, 16384,
    ]);
  });

  it("gives the same output whether audio arrives in one chunk or many", () => {
    const signal = Float32Array.from({ length: 4_410 }, (_, i) => Math.sin(i / 7) * 0.8);
    const whole = createLinear16Encoder(44_100, 16_000)(signal);
    const pieces = createLinear16Encoder(44_100, 16_000);
    const parts = [128, 333, 1_000, 2_949].reduce<{ out: number[]; at: number }>(
      ({ out, at }, size) => ({
        out: [...out, ...pieces(signal.subarray(at, at + size))],
        at: at + size,
      }),
      { out: [], at: 0 },
    ).out;
    expect(parts).toEqual(Array.from(whole));
  });

  it("averages the samples it drops to avoid aliasing noise", () => {
    const encode = createLinear16Encoder(48_000, 16_000);
    const output = encode(Float32Array.from([1, 0, -1, 1, 0, -1]));
    expect(Array.from(output)).toEqual([0, 0]);
  });

  it("rejects upsampling", () => {
    expect(() => createLinear16Encoder(8_000, 16_000)).toThrow(RangeError);
  });
});
