import { describe, expect, it } from "vitest";

import { createSlidingWindowLimiter } from "./voice-session-limiter";

describe("createSlidingWindowLimiter", () => {
  it("allows up to the limit inside the window", () => {
    let now = 0;
    const limiter = createSlidingWindowLimiter({ limit: 2, windowMs: 60_000, now: () => now });
    expect(limiter.check("user-1").allowed).toBe(true);
    now = 1_000;
    expect(limiter.check("user-1").allowed).toBe(true);
    now = 2_000;
    const blocked = limiter.check("user-1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(58);
  });

  it("frees capacity as old requests leave the window", () => {
    let now = 0;
    const limiter = createSlidingWindowLimiter({ limit: 1, windowMs: 10_000, now: () => now });
    expect(limiter.check("user-1").allowed).toBe(true);
    now = 10_001;
    expect(limiter.check("user-1").allowed).toBe(true);
  });

  it("keeps users independent", () => {
    const limiter = createSlidingWindowLimiter({ limit: 1, windowMs: 10_000, now: () => 0 });
    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-2").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(false);
  });

  it("does not count rejected attempts", () => {
    let now = 0;
    const limiter = createSlidingWindowLimiter({ limit: 1, windowMs: 10_000, now: () => now });
    limiter.check("user-1");
    now = 5_000;
    limiter.check("user-1");
    now = 10_001;
    expect(limiter.check("user-1").allowed).toBe(true);
  });
});
