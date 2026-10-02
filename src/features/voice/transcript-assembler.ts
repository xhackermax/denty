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
      finals = nextFinals.map((part) => part.trim()).filter(Boolean);
      interim = nextInterim.trim();
    },
    text() {
      return join(interim ? [...finals, interim] : finals);
    },
    finalText() {
      return join(finals);
    },
  };
}
