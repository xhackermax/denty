import { describe, expect, it } from "vitest";

import { gatewayTranscriptionModel } from "./transcription-config";

describe("voice transcription config", () => {
  it("routes bare OpenAI transcription model names through AI Gateway", () => {
    expect(gatewayTranscriptionModel("gpt-4o-mini-transcribe")).toBe(
      "openai/gpt-4o-mini-transcribe",
    );
  });

  it("keeps explicit gateway model slugs unchanged", () => {
    expect(gatewayTranscriptionModel("openai/gpt-4o-transcribe")).toBe(
      "openai/gpt-4o-transcribe",
    );
  });
});
