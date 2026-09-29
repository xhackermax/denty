import { describe, expect, it } from "vitest";

import { scaledPhotoSize } from "./photo-compression";

describe("scaledPhotoSize", () => {
  it("fits the longest side into 512 px keeping the aspect ratio", () => {
    expect(scaledPhotoSize(4032, 3024)).toEqual({ width: 512, height: 384 });
    expect(scaledPhotoSize(1080, 1920)).toEqual({ width: 288, height: 512 });
  });

  it("never upscales small photos", () => {
    expect(scaledPhotoSize(320, 240)).toEqual({ width: 320, height: 240 });
  });

  it("handles empty frames", () => {
    expect(scaledPhotoSize(0, 480)).toEqual({ width: 0, height: 0 });
  });
});
