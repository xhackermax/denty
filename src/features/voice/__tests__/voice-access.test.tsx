import { describe, expect, it } from "vitest";

import { shouldRenderVoiceControls } from "../voice-command-bar";

describe("voice access", () => {
  it("hides voice controls from patient and loading sessions", () => {
    expect(shouldRenderVoiceControls("PATIENT", false)).toBe(false);
    expect(shouldRenderVoiceControls(null, true)).toBe(false);
    expect(shouldRenderVoiceControls("EXTERNAL", false)).toBe(false);
  });

  it("shows voice controls for internal clinic roles", () => {
    expect(shouldRenderVoiceControls("ADMIN", false)).toBe(true);
    expect(shouldRenderVoiceControls("DENTIST", false)).toBe(true);
    expect(shouldRenderVoiceControls("ASSISTANT", false)).toBe(true);
    expect(shouldRenderVoiceControls("RECEPTION", false)).toBe(true);
  });
});
