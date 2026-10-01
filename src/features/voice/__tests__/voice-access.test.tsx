import { describe, expect, it } from "vitest";

import { shouldRenderVoiceControls } from "../voice-command-bar";

describe("voice access", () => {
  it("hides voice controls from patient and unidentified sessions", () => {
    expect(shouldRenderVoiceControls("PATIENT")).toBe(false);
    expect(shouldRenderVoiceControls(null)).toBe(false);
    expect(shouldRenderVoiceControls("EXTERNAL")).toBe(false);
  });

  it("shows voice controls for internal clinic roles", () => {
    expect(shouldRenderVoiceControls("ADMIN")).toBe(true);
    expect(shouldRenderVoiceControls("DENTIST")).toBe(true);
    expect(shouldRenderVoiceControls("ASSISTANT")).toBe(true);
    expect(shouldRenderVoiceControls("RECEPTION")).toBe(true);
  });
});
