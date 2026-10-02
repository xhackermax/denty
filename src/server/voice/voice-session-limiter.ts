export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface SlidingWindowLimiter {
  check(key: string): RateLimitDecision;
  reset(): void;
}

export function createSlidingWindowLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): SlidingWindowLimiter {
  const now = options.now ?? Date.now;
  const hits = new Map<string, number[]>();

  return {
    check(key) {
      const current = now();
      const recent = (hits.get(key) ?? []).filter((at) => current - at < options.windowMs);
      if (recent.length >= options.limit) {
        hits.set(key, recent);
        const oldest = recent[0] ?? current;
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((oldest + options.windowMs - current) / 1000)),
        };
      }
      recent.push(current);
      hits.set(key, recent);
      return { allowed: true, retryAfterSeconds: 0 };
    },
    reset() {
      hits.clear();
    },
  };
}
