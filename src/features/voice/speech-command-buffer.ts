const WAKE_WINDOW_MS = 6_000;
const DUPLICATE_WINDOW_MS = 1_500;
const WAKE_TEXT = "Oye Denty";

const PREFIX = "(?:oye|oi|hoye|hey|ey|ei|ok|okay|okey|hola)";
const NAME = "(?:denty|denti|dentis|dentys|dente|denthi)";
const SEPARATOR = "[\\s.,;:!?-]+";
const TRAILING = "[\\s.,;:!?-]*";

const WAKE_ONLY = new RegExp(`^(?:${PREFIX}${SEPARATOR})?${NAME}${TRAILING}$`);
const PREFIX_ONLY = new RegExp(`^${PREFIX}${TRAILING}$`);
const WAKE_LEADING = new RegExp(`^${PREFIX}${SEPARATOR}${NAME}(?:${SEPARATOR}|$)`);

// The engine returns accents and casing unpredictably, so matching ignores both.
function fold(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function canonicalizeLeadingWake(clean: string): string {
  const folded = fold(clean);
  const match = WAKE_LEADING.exec(folded);
  // NFD folding only removes combining marks, so the match length maps onto the original text
  // as long as the original had none inside the wake phrase; otherwise keep the text untouched.
  if (!match || fold(clean.slice(0, match[0].length)) !== match[0].trim()) return clean;
  const rest = clean.slice(match[0].length).trim();
  return rest ? `${WAKE_TEXT} ${rest}` : clean;
}

export interface SpeechCommandBuffer {
  push(transcript: string, now?: number): string | undefined;
  clear(): void;
}

export function createSpeechCommandBuffer(): SpeechCommandBuffer {
  let pendingWake: { text: string; at: number } | undefined;
  let pendingPrefix: number | undefined;
  let last: { folded: string; at: number } | undefined;

  const reset = () => {
    pendingWake = undefined;
    pendingPrefix = undefined;
  };

  return {
    push(transcript: string, now = Date.now()) {
      const clean = transcript.trim();
      if (!clean) return undefined;
      const folded = fold(clean);

      // Some engines re-emit the same final result; executing it twice would double-apply an order.
      if (last && last.folded === folded && now - last.at <= DUPLICATE_WINDOW_MS) {
        return undefined;
      }
      last = { folded, at: now };

      if (PREFIX_ONLY.test(folded)) {
        pendingPrefix = now;
        pendingWake = undefined;
        return undefined;
      }

      if (WAKE_ONLY.test(folded)) {
        pendingPrefix = undefined;
        pendingWake = { text: WAKE_TEXT, at: now };
        return undefined;
      }

      pendingPrefix = undefined;

      if (pendingWake && now - pendingWake.at <= WAKE_WINDOW_MS) {
        const joined = `${pendingWake.text} ${clean}`.trim();
        reset();
        return joined;
      }

      reset();
      return canonicalizeLeadingWake(clean);
    },
    clear() {
      reset();
      last = undefined;
    },
  };
}
