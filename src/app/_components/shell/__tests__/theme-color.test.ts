// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { syncThemeColor } from "../theme-color";

afterEach(() => {
  document.head.innerHTML = "";
});

function addMeta(media: string, content: string) {
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.media = media;
  meta.content = content;
  document.head.append(meta);
}

describe("syncThemeColor", () => {
  it("paints the status bar with Denty's scheme even when the OS uses the other one", () => {
    addMeta("(prefers-color-scheme: light)", "#f5f5f7");
    addMeta("(prefers-color-scheme: dark)", "#000000");

    syncThemeColor("dark", document);

    const colors = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map(
      (meta) => meta.content,
    );
    expect(colors).toEqual(["#000000", "#000000"]);
  });

  it("does nothing when the page has no theme-color tag", () => {
    expect(() => syncThemeColor("light", document)).not.toThrow();
  });
});
