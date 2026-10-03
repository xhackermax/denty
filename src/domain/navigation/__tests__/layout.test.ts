import { describe, expect, it } from "vitest";

import {
  DEFAULT_PINNED,
  MAX_PINNED,
  NAVIGATION_KEYS,
  moveKey,
  navigationLayoutSchema,
  resolvePinned,
  sanitizePinned,
  splitForBar,
  togglePinned,
} from "../layout";

describe("sanitizePinned", () => {
  it("drops unknown and repeated keys while keeping the chosen order", () => {
    expect(sanitizePinned(["agenda", "nope", "home", "agenda", 7])).toEqual(["agenda", "home"]);
  });

  it("caps the bar at the maximum size", () => {
    expect(sanitizePinned([...NAVIGATION_KEYS])).toHaveLength(MAX_PINNED);
  });

  it("returns null when nothing usable is left", () => {
    expect(sanitizePinned([])).toBeNull();
    expect(sanitizePinned(["nope"])).toBeNull();
    expect(sanitizePinned("home")).toBeNull();
    expect(sanitizePinned(null)).toBeNull();
  });
});

describe("resolvePinned", () => {
  it("prefers the member's own order", () => {
    expect(resolvePinned({ user: { pinned: ["tasks"] }, clinic: { pinned: ["agenda"] } })).toEqual({
      pinned: ["tasks"],
      source: "user",
    });
  });

  it("falls back to the clinic order, then to the built-in default", () => {
    expect(resolvePinned({ user: null, clinic: { pinned: ["agenda", "home"] } })).toEqual({
      pinned: ["agenda", "home"],
      source: "clinic",
    });
    expect(resolvePinned({ user: { pinned: ["nope"] }, clinic: null })).toEqual({
      pinned: [...DEFAULT_PINNED],
      source: "default",
    });
  });
});

describe("splitForBar", () => {
  it("keeps the first items in the bar and sends the rest to “Más”", () => {
    expect(splitForBar(["home", "agenda", "tasks"], 2)).toEqual({
      bar: ["home", "agenda"],
      overflow: ["tasks"],
    });
  });

  it("leaves the overflow empty when everything fits", () => {
    expect(splitForBar(["home"], 5)).toEqual({ bar: ["home"], overflow: [] });
  });
});

describe("editing helpers", () => {
  it("moves a key up or down and ignores moves past either end", () => {
    expect(moveKey(["home", "agenda", "tasks"], "tasks", -1)).toEqual(["home", "tasks", "agenda"]);
    expect(moveKey(["home", "agenda"], "home", -1)).toEqual(["home", "agenda"]);
    expect(moveKey(["home", "agenda"], "agenda", 1)).toEqual(["home", "agenda"]);
    expect(moveKey(["home"], "tasks", 1)).toEqual(["home"]);
  });

  it("adds at the end, removes, and never empties or overfills the bar", () => {
    expect(togglePinned(["home"], "tasks")).toEqual(["home", "tasks"]);
    expect(togglePinned(["home", "tasks"], "home")).toEqual(["tasks"]);
    expect(togglePinned(["home"], "home")).toEqual(["home"]);
    const full = NAVIGATION_KEYS.slice(0, MAX_PINNED);
    expect(togglePinned(full, NAVIGATION_KEYS[MAX_PINNED]!)).toEqual(full);
  });
});

describe("navigationLayoutSchema", () => {
  it("accepts a valid order or null to clear it", () => {
    expect(navigationLayoutSchema.parse({ pinned: ["home", "agenda"] })).toEqual({
      pinned: ["home", "agenda"],
    });
    expect(navigationLayoutSchema.parse({ pinned: null })).toEqual({ pinned: null });
  });

  it("rejects unknown keys, duplicates, empty and oversized orders", () => {
    expect(() => navigationLayoutSchema.parse({ pinned: ["nope"] })).toThrow();
    expect(() => navigationLayoutSchema.parse({ pinned: ["home", "home"] })).toThrow();
    expect(() => navigationLayoutSchema.parse({ pinned: [] })).toThrow();
    expect(() => navigationLayoutSchema.parse({ pinned: [...NAVIGATION_KEYS] })).toThrow();
  });
});
