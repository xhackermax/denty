import { appendDictation } from "./command-input";

export interface TranscriptAssembler {
  /** Partial results replace each other: only the latest guess is shown. */
  setInterim(text: string): void;
  commitFinal(text: string): void;
  /** For engines that resend the whole session on every event (Web Speech). */
  replaceSession(finals: readonly string[], interim: string): void;
  text(): string;
  finalText(): string;
}

const squash = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

function commonPrefixLength(a: string, b: string) {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) index += 1;
  return index;
}

/**
 * Some Android engines emit every interim guess as its own result, each one
 * extending the previous. Keeping only the latest of such a chain prevents
 * "da", "da una", "da una caries" from being concatenated.
 */
export function collapseCumulativeParts(parts: readonly string[]): string[] {
  const kept: string[] = [];
  for (const part of parts) {
    const last = kept[kept.length - 1];
    if (last === undefined) {
      kept.push(part);
      continue;
    }
    const a = squash(last);
    const b = squash(part);
    const shared = commonPrefixLength(a, b);
    const sameSentence = a.length > 0 && shared === Math.min(a.length, b.length);
    if (!sameSentence) kept.push(part);
    else if (b.length >= a.length) kept[kept.length - 1] = part;
  }
  return kept;
}

export function createTranscriptAssembler(base: string): TranscriptAssembler {
  let finals: string[] = [];
  let interim = "";

  const join = (parts: readonly string[]) =>
    parts.reduce((text, part) => appendDictation(text, part), base);

  return {
    setInterim(text) {
      interim = text.trim();
    },
    commitFinal(text) {
      const clean = text.trim();
      interim = "";
      if (clean) finals.push(clean);
    },
    replaceSession(nextFinals, nextInterim) {
      const parts = collapseCumulativeParts(
        [...nextFinals, nextInterim].map((part) => part.trim()).filter(Boolean),
      );
      const hasInterim = nextInterim.trim() !== "" && parts.length > 0;
      interim = hasInterim ? (parts[parts.length - 1] ?? "") : "";
      finals = hasInterim ? parts.slice(0, -1) : parts;
    },
    text() {
      return join(interim ? [...finals, interim] : finals);
    },
    finalText() {
      return join(finals);
    },
  };
}
