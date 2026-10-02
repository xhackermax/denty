import { createSlidingWindowLimiter } from "./voice-session-limiter";

// Per server instance: bounds how many voice sessions one user can open, and so
// how many can run at once, because each session needs a fresh 30 s token.
export const deepgramTokenLimiter = createSlidingWindowLimiter({ limit: 12, windowMs: 60_000 });

export function resetDeepgramTokenLimiterForTests(): void {
  deepgramTokenLimiter.reset();
}
