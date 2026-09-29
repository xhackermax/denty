import { describe, expect, it } from "vitest";

import { getServerEnv } from "@/shared/config/env";

import { isHaiku45 } from "./claude-voice-interpreter";

describe("Claude voice model", () => {
  it("defaults to Haiku 4.5, the cheapest model", () => {
    const previous = process.env.ANTHROPIC_VOICE_MODEL;
    delete process.env.ANTHROPIC_VOICE_MODEL;
    try {
      expect(getServerEnv().ANTHROPIC_VOICE_MODEL).toBe("claude-haiku-4-5");
    } finally {
      if (previous !== undefined) process.env.ANTHROPIC_VOICE_MODEL = previous;
    }
  });

  it("only sends Haiku 4.5 the options it supports", () => {
    expect(isHaiku45("claude-haiku-4-5")).toBe(true);
    expect(isHaiku45("claude-opus-5-5")).toBe(false);
    expect(isHaiku45("claude-sonnet-5-5")).toBe(false);
  });
});
