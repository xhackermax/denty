import { describe, expect, it } from "vitest";

import { APP_VIEWPORT } from "../app-meta";

describe("app viewport", () => {
  it("draws under the notch so safe-area insets are real, and never blocks zoom", () => {
    expect(APP_VIEWPORT).toMatchObject({
      width: "device-width",
      initialScale: 1,
      viewportFit: "cover",
    });
    expect(APP_VIEWPORT).not.toHaveProperty("maximumScale");
    expect(APP_VIEWPORT).not.toHaveProperty("userScalable");
  });

  it("matches the status bar to the page background in each colour scheme", () => {
    expect(APP_VIEWPORT.themeColor).toEqual([
      { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
      { media: "(prefers-color-scheme: dark)", color: "#000000" },
    ]);
  });
});
